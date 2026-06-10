import { Injectable, Logger } from '@nestjs/common';
import { UseOpenAI } from '../hook/useopenai';

/**
 * Director Mode — three-agent storyboard planner.
 *
 * Adapts HKUDS/ViMax's idea2video architecture to HPVideo's stack:
 * each agent is a single LLM call via ZenMux (UseOpenAI). The three
 * agents run sequentially because each one's output feeds the next.
 *
 * 1. Scene Splitter:   long text → ordered scenes
 * 2. Character Bible:  scenes   → static + dynamic per-character features
 * 3. Storyboard Artist: scenes + bible → shots (ff/lf/motion/duration)
 *
 * The final Storyboard is what the FastAPI side will hand to
 * _real_videogen + _real_stitcher.
 *
 * Cost ceiling: ~12 shots / 60-96s of final cut → ~18 000 cr.
 * Prompts and JSON contracts kept tight so gpt-5.2 returns in 8 K tokens.
 */

export interface DirectorCharacter {
  name: string;
  static_features: string;   // unchanging — age, ethnicity, face, body
  dynamic_features: string;  // per-scene — clothing, accessories
  voice_hint: string;        // HappyHorse voice anchor — language + tone
}

export interface DirectorShot {
  idx: number;
  scene_idx: number;
  prompt: string;            // motion + style for videogen
  ff_desc: string;           // first frame — i2v anchor (shot >= 2 uses upstream lf)
  lf_desc: string;           // last frame — continuity reference + visual end state
  motion_desc: string;       // "slow dolly in", "lateral tracking", etc.
  duration_s: 5 | 8;         // HappyHorse 720p tiers; agent picks per shot
  model: 'happyhorse-1.0';   // MVP locks the model; per-shot picker is post-MVP
  characters_in_shot: string[]; // names from the bible
}

export interface DirectorStoryboard {
  characters: DirectorCharacter[];
  shots: DirectorShot[];
  total_cost_cr: number;
  meta: {
    scene_count: number;
    shot_count: number;
    lang: string;
    cached: boolean;
  };
}

const SHOT_CEILING = 12;

// 720p HappyHorse 1.0 pricing — mirrors src/lib/components/canvas/pricing.ts.
// We don't import that file from the nest service; instead we keep the
// constants in sync via the design doc. If pricing.ts moves, this needs
// a matching tweak.
function happyhorseCostCr(durationS: number): number {
  return durationS >= 7 ? 2400 : 1500;
}

@Injectable()
export class DirectorService {
  private readonly logger = new Logger(DirectorService.name);
  private readonly llm = new UseOpenAI();

  /** Per-hash plan cache — same raw text returns the same storyboard
   *  within 1 h. Lets users iterate on the storyboard UI without paying
   *  the LLM tax on every refresh. */
  private readonly planCache = new Map<
    string,
    { at: number; storyboard: DirectorStoryboard }
  >();
  private readonly CACHE_TTL_MS = 60 * 60 * 1000;

  async plan(args: {
    rawText: string;
    lang?: 'en' | 'zh' | 'ja' | 'ko';
  }): Promise<DirectorStoryboard> {
    const rawText = (args.rawText || '').trim();
    const lang = args.lang || 'en';
    if (rawText.length < 8) {
      throw new Error('rawText too short — give the director a real idea');
    }
    if (rawText.length > 6000) {
      // Trim to 6 K chars; gpt-5.2's 8 K output window has to hold the
      // storyboard JSON too, so leaving headroom matters.
      args.rawText = rawText.slice(0, 6000);
    }

    const key = `${lang}::${rawText}`;
    const cached = this.planCache.get(key);
    if (cached && Date.now() - cached.at < this.CACHE_TTL_MS) {
      this.logger.log(`[Director] plan cache HIT`);
      return { ...cached.storyboard, meta: { ...cached.storyboard.meta, cached: true } };
    }

    this.logger.log(
      `[Director] planning raw=${rawText.length}c lang=${lang}`,
    );

    const scenes = await this.runSceneSplitter(rawText, lang);
    this.logger.log(`[Director] scenes=${scenes.length}`);

    const characters = await this.runCharacterExtractor(rawText, scenes, lang);
    this.logger.log(`[Director] characters=${characters.length}`);

    const shots = await this.runStoryboardArtist(scenes, characters, lang);
    this.logger.log(`[Director] shots=${shots.length}`);

    const total_cost_cr = shots.reduce(
      (acc, s) => acc + happyhorseCostCr(s.duration_s),
      0,
    );

    const storyboard: DirectorStoryboard = {
      characters,
      shots,
      total_cost_cr,
      meta: {
        scene_count: scenes.length,
        shot_count: shots.length,
        lang,
        cached: false,
      },
    };

    this.planCache.set(key, { at: Date.now(), storyboard });
    return storyboard;
  }

  // ============================================================
  // Agent 1 — Scene Splitter
  // ============================================================
  private async runSceneSplitter(
    rawText: string,
    lang: string,
  ): Promise<{ idx: number; summary: string; dialogue?: string }[]> {
    const sys =
      'You are a film script editor. Split the user input into scenes, ' +
      'where each scene = one continuous camera setup that fits in a ' +
      `5–8 second clip. Cap output at ${SHOT_CEILING} scenes. Preserve ` +
      'quoted dialogue verbatim. Output a JSON object only, no prose, ' +
      'shape: { "scenes": [{ "idx": int, "summary": str, "dialogue": ' +
      'str | null }] }. idx is 0-based and contiguous.';
    const user =
      `Input language: ${lang}\nInput text:\n${rawText}\n\n` +
      `Return JSON only. ${SHOT_CEILING}-scene maximum.`;
    const raw = await this.llm.callGPT52WithRetry(sys, user, {
      verbosity: 'low',
      maxTokens: 3000,
      temperature: 0.4,
    });
    const parsed = this.extractJson(raw, 'scenes');
    if (!Array.isArray(parsed?.scenes)) {
      throw new Error(
        `scene-splitter returned bad JSON: ${raw.slice(0, 240)}`,
      );
    }
    return parsed.scenes
      .map((s: any, i: number) => ({
        idx: i,
        summary: String(s.summary || '').trim(),
        dialogue: s.dialogue ? String(s.dialogue).trim() : undefined,
      }))
      .filter((s: any) => s.summary.length > 0)
      .slice(0, SHOT_CEILING);
  }

  // ============================================================
  // Agent 2 — Character Bible (static vs dynamic per ViMax)
  // ============================================================
  private async runCharacterExtractor(
    rawText: string,
    scenes: { summary: string; dialogue?: string }[],
    lang: string,
  ): Promise<DirectorCharacter[]> {
    const sceneSummaries = scenes
      .map((s, i) => `S${i}: ${s.summary}${s.dialogue ? ` — ${s.dialogue}` : ''}`)
      .join('\n');
    const sys =
      'You are a film production designer building a character bible. ' +
      'For each character that appears in any scene, extract: (a) name, ' +
      '(b) static_features that never change across scenes — age, ' +
      'ethnicity, body shape, face, hair, distinguishing marks; ' +
      '(c) dynamic_features that may change per scene — clothing, ' +
      'accessories; (d) voice_hint suitable for HappyHorse 1.0 — ' +
      'language + tone (e.g. "Korean female, warm, mid-20s"). ' +
      'Where the source is silent on a detail, design a plausible one ' +
      'so downstream frames stay consistent. Output JSON only: ' +
      '{ "characters": [DirectorCharacter, ...] }.';
    const user =
      `Source language: ${lang}\nFull text:\n${rawText}\n\n` +
      `Scene summaries:\n${sceneSummaries}\n\n` +
      'Return JSON only. Aim for fewer, distinct characters; merge ' +
      'aliases. Two characters must look different at a glance.';
    const raw = await this.llm.callGPT52WithRetry(sys, user, {
      verbosity: 'medium',
      maxTokens: 2400,
      temperature: 0.6,
    });
    const parsed = this.extractJson(raw, 'characters');
    if (!Array.isArray(parsed?.characters)) {
      throw new Error(
        `character-extractor returned bad JSON: ${raw.slice(0, 240)}`,
      );
    }
    return parsed.characters
      .map((c: any) => ({
        name: String(c.name || '').trim(),
        static_features: String(c.static_features || '').trim(),
        dynamic_features: String(c.dynamic_features || '').trim(),
        voice_hint: String(c.voice_hint || '').trim(),
      }))
      .filter((c: DirectorCharacter) => c.name && c.static_features);
  }

  // ============================================================
  // Agent 3 — Storyboard Artist (ViMax-style ff/lf/motion shots)
  // ============================================================
  private async runStoryboardArtist(
    scenes: { idx: number; summary: string; dialogue?: string }[],
    characters: DirectorCharacter[],
    lang: string,
  ): Promise<DirectorShot[]> {
    const charBible = characters
      .map(
        (c) =>
          `${c.name} :: static=${c.static_features} :: dynamic=${c.dynamic_features} :: voice=${c.voice_hint}`,
      )
      .join('\n');
    const sceneList = scenes
      .map(
        (s) =>
          `S${s.idx}: ${s.summary}${s.dialogue ? `\n   dialogue: "${s.dialogue}"` : ''}`,
      )
      .join('\n');
    const sys =
      'You are a storyboard artist. For each scene below, design ONE ' +
      'shot for HappyHorse-1.0 video generation. Each shot has:\n' +
      ' - prompt: motion + style + audio for the videogen block. ' +
      'Inject the character\'s static_features verbatim so the face/voice ' +
      'stays consistent across cuts. Quote dialogue exactly when present.\n' +
      ' - ff_desc: first frame description (used as i2v anchor for shots ≥ 2).\n' +
      ' - lf_desc: last frame description (continuity reference).\n' +
      ' - motion_desc: one short camera move, e.g. "slow dolly in".\n' +
      ' - duration_s: 5 or 8. Use 8 only when the scene needs more breathing room.\n' +
      ' - characters_in_shot: subset of bible names actually visible.\n' +
      'Output JSON only: { "shots": [DirectorShot, ...] }. idx is 0-based ' +
      'and contiguous, model is always "happyhorse-1.0".';
    const user =
      `Language: ${lang}\n\nCharacter bible:\n${charBible}\n\n` +
      `Scenes:\n${sceneList}\n\n` +
      'Return JSON only. One shot per scene, in order.';
    const raw = await this.llm.callGPT52WithRetry(sys, user, {
      verbosity: 'high',
      maxTokens: 5500,
      temperature: 0.65,
    });
    const parsed = this.extractJson(raw, 'shots');
    if (!Array.isArray(parsed?.shots)) {
      throw new Error(
        `storyboard-artist returned bad JSON: ${raw.slice(0, 240)}`,
      );
    }
    return parsed.shots
      .map((s: any, i: number) => {
        const d = Number(s.duration_s);
        return {
          idx: i,
          scene_idx: Number(s.scene_idx ?? i),
          prompt: String(s.prompt || '').trim(),
          ff_desc: String(s.ff_desc || '').trim(),
          lf_desc: String(s.lf_desc || '').trim(),
          motion_desc: String(s.motion_desc || '').trim(),
          duration_s: (d === 8 ? 8 : 5) as 5 | 8,
          model: 'happyhorse-1.0' as const,
          characters_in_shot: Array.isArray(s.characters_in_shot)
            ? s.characters_in_shot.map((n: any) => String(n))
            : [],
        };
      })
      .filter((s: DirectorShot) => s.prompt.length > 0)
      .slice(0, SHOT_CEILING);
  }

  // ============================================================
  // Helpers
  // ============================================================
  /** Tolerant JSON extractor — strips ```json fences and finds the
   *  first {...} block. gpt-5.2 honors the JSON-only instruction
   *  almost always, but the fallback path matters when it slips. */
  private extractJson(raw: string, expectedTopKey: string): any {
    if (!raw) throw new Error(`empty LLM response (expected key ${expectedTopKey})`);
    let txt = raw
      .replace(/```json\s*/gi, '')
      .replace(/```/g, '')
      .trim();
    const m = txt.match(/\{[\s\S]*\}/);
    if (m) txt = m[0];
    try {
      return JSON.parse(txt);
    } catch (e: any) {
      throw new Error(
        `LLM JSON parse failed (${expectedTopKey}): ${e.message}; head=${raw.slice(0, 200)}`,
      );
    }
  }
}
