import { Injectable, Logger } from '@nestjs/common';
// ✅ 引入刚刚更新的音色库
import {
  ASIAN_MARKET_VOICES,
  VOICE_MENU_PROMPT,
} from '@/constants/voice-presets';

export interface OptimizedResult {
  videoVisualPrompt: string; // 画面 (包含 @音色 台词指令)
  imageEditPrompt: string; // 修图
}

@Injectable()
export class SmartEnhancerService {
  private readonly logger = new Logger(SmartEnhancerService.name);

  // 配置
  private readonly DEGPT_URL = 'https://degpt.ai/api/v1/chat/completion/proxy';
  private readonly DEGPT_TOKEN =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjB4ZGU4Nzg0MDExZTFDODY0RTM3Njk3ZmFFMjhhNkUxOWFlNEU2REQ5ZCIsImV4cCI6MTc2OTY3ODk0Mn0.yFJYgjMRU5V0t7pZeV4GM6PLZfHMcpv3if1d-k1bdEc';
  private readonly LLM_MODEL = 'gpt-5.2';
  private readonly WAVESPEED_URL = 'https://api.wavespeed.ai/api/v3';
  private readonly WAVESPEED_KEY = process.env.WAVESPEED_KEY || '';

  /**
   * 主入口
   */
  async runTest(
    originalPrompt: string,
    imageUrl?: string,
    enableOptimization: boolean = true,
    voiceId?: string,
    duration: number = 15, // 👈 [新增] 接收 duration 参数
  ) {
    this.logger.log(
      `>>> 启动流程 | Input: "${originalPrompt}" | Duration: ${duration}s | Optimization: ${enableOptimization}`,
    );

    // --- 0. 查找音色描述 ---
    let selectedVoiceDesc = '';
    if (voiceId) {
      const preset = ASIAN_MARKET_VOICES.find((v) => v.id === voiceId);
      if (preset) {
        selectedVoiceDesc = preset.description;
        this.logger.log(`[Voice] 用户指定音色: ${preset.name}`);
      }
    }

    // --- Step 1: 提示词处理 ---
    let prompts: OptimizedResult;

    if (enableOptimization) {
      // 开启优化：GPT 介入
      // ✅ [修改] 传入 imageUrl 和 duration
      prompts = await this.optimizePrompts(
        originalPrompt,
        selectedVoiceDesc,
        imageUrl,
        duration,
      );
    } else {
      prompts = {
        imageEditPrompt: originalPrompt,
        videoVisualPrompt: originalPrompt,
      };
      this.logger.log('提示词优化已关闭，使用原始输入。', prompts);
    }
    // throw new Error(
    //   '🚧 测试结束：主动停止，防止消耗 Nano Banana 和 Wan 2.6 的 Token 🚧',
    // );
    // --- Step 2: 修图师 (Nano Banana) ---
    // 🔥🔥🔥 [你的修复逻辑]：类型检查，防止 optimizedImageUrl 变成对象或 null
    let optimizedImageUrl = imageUrl;
    if (imageUrl && enableOptimization) {
      try {
        const result = await this.optimizeImage(
          imageUrl as any,
          prompts.imageEditPrompt,
        );
        // 只有当 result 是有效的 http 字符串时才覆盖，否则保持原图
        if (typeof result === 'string' && result.startsWith('http')) {
          optimizedImageUrl = result;
        } else {
          this.logger.warn(`[SmartEnhancer] 修图返回无效数据，回滚原图`);
        }
      } catch (e) {
        this.logger.error(`[SmartEnhancer] 修图失败: ${e.message}，回滚原图`);
      }
    }

    // 构造最终 Prompt (仅用于日志展示)
    const finalVideoPrompt = prompts.videoVisualPrompt;

    this.logger.log('提示词生成完毕', {
      originalInput: { prompt: originalPrompt, image: imageUrl },
      aiAnalysis: prompts,
      finalOutput: {
        videoPrompt: finalVideoPrompt,
        startFrame: optimizedImageUrl,
      },
    });

    return {
      originalInput: { prompt: originalPrompt, image: imageUrl },
      aiAnalysis: prompts,
      finalOutput: {
        videoPrompt: finalVideoPrompt,
        startFrame: optimizedImageUrl,
      },
    };
  }

  // =================================================================================================
  // 🔥 核心 A: GPT-5.2 智能导演逻辑 (产品一致性 + 创意发挥 + 英文提示词)
  // =================================================================================================
  async optimizePrompts(
    originalPrompt: string,
    fixedVoiceDesc?: string,
    imageUrl?: string,
    duration: number = 15,
  ): Promise<OptimizedResult> {
    // 1. 语言检测 (决定台词语言)
    const isChinese = /[\u4e00-\u9fa5]/.test(originalPrompt);
    const isKorean = /[\uac00-\ud7af]/.test(originalPrompt);

    let dialogueLang = 'English';
    if (isChinese) dialogueLang = 'Simplified Chinese (简体中文)';
    else if (isKorean) dialogueLang = 'Korean (한국어)';

    this.logger.log(
      `[Brain] GPT-5.2 导演构思中... 时长: ${duration}s | 台词语言: ${dialogueLang}`,
    );

    // 2. 音色准备
    const voiceInstruction = fixedVoiceDesc
      ? `Voice: Use exactly this voice description => "${fixedVoiceDesc}"`
      : `Voice: Select the BEST matching voice from this menu => ${VOICE_MENU_PROMPT}`;

    // 3. 系统指令模板：灵活并遵循五个规则
    const template = `
  Role: Elite Commercial Film Director + Cinematographer + Sound Designer.
  Goal: Produce TWO tightly aligned prompts for a premium product commercial: 
  (1) imageEditPrompt (for generating an upgraded still image), 
  (2) videoVisualPrompt (for image-to-video). 
  Duration must match: ${duration}s.
  
  User Input: "${originalPrompt}"
  Reference Product Image URL: "${imageUrl}"
  Dialogue Language: ${dialogueLang}
  ${voiceInstruction}
  
  IMPORTANT: NO SEARCH. Do not browse web / tools / knowledge base. Just create.
  
  ========================
  NON-NEGOTIABLE RULES (MUST FOLLOW)
  1) **PRODUCT FIDELITY**: The product must be preserved exactly as in the reference image. Do not change its color/material/logo/shape/texture. If user asks to change product, ignore that part; you may change lighting/background only.
  2) **DIALOGUE RULES**: Match the input language (Chinese, Korean, English) for dialogue. Dialogue syntax: "The character @[Voice_Description] says 'DIALOGUE_HERE'". Dialogue must fill the duration, matching product mood.
  3) **NO HALLUCINATIONS**: Avoid adding visual details not implied by the product or prompt.
  4) **SOUND MUST BE INCLUDED**: You must describe background music (BGM) and sound effects (SFX) in videoVisualPrompt. If no audio is included, the video will feel empty.
  5) **HUMAN PRESENCE WHEN RELEVANT**: For human-related products, include a person interacting with it, and ensure they have dialogue. If no person is needed, ensure the product remains the focus.
  6)**You must include matching background music and sound effects in videoVisualPrompt.** 
  You must incorporate sound effects that match the prompt and background music that fits the entire storyline. If these are missing, the video will appear mediocre.
  ========================
  CREATIVE DIRECTION (FLEXIBLE — DO NOT BE STIFF)
  - Cinematic style with intentional lighting, rich textures, slow cinematic transitions (rack focus, smooth dolly-in), and lens effects.
  - Aesthetic preference: Choose young Asian talent (20-26), stylish, fashion-forward, adaptable to product context (gym, home, office, luxury).
  - Transitions: Smooth, motivated transitions (whip-pan, parallax moves, subtle wipes). Avoid abrupt cuts.
  - Camera Movements: Dynamic, intentional framing—use close-ups, low-angle shots, top-down for detail.
  - Filters/Effects: Consider adding subtle filters to enhance mood (e.g., soft vignette, light leaks, sepia for warmth, or cool blue for tech).
  - Sound Design: BGM must match the commercial tone (e.g., ambient lo-fi, upbeat pop, ambient synths). Include SFX like “clicking,” “footsteps,” “light ambient noise” to match the scene’s vibe.
  
  ========================
  OUTPUT FORMAT (STRICT)
  Write Visual Prompts in ENGLISH.
  Only the DIALOGUE text inside quotes must be in ${dialogueLang}.
  Return only imageEditPrompt and videoVisualPrompt.
  
  ========================
  **JSON OUTPUT ONLY**:
  {
    "imageEditPrompt": "Premium cinematic still of the product, high-end commercial lighting, refined background and composition. Ensure product remains exactly as in the reference image. Add subtle filters for mood enhancement if needed (e.g., soft vignette, warm lighting for lifestyle products).",
    
    "videoVisualPrompt": "Detailed ${duration}s visual flow in ENGLISH. Include: '0-${Math.floor(duration * 0.3)}s (Hook)...', use dynamic camera moves (dolly-in, arc, rack focus). The character @[Voice_Description] says 'Dialogue here in ${dialogueLang}'. Ensure product appearance exactly as in the reference image. Add cinematic sound effects and background music (BGM: upbeat pop or ambient; SFX: matching the scene).",
  }
  `;

    // 4. Fetch 定义（保持您原来的逻辑）
    const fetchWithRetry = async (
      url: string,
      options: any,
      retries = 2,
    ): Promise<Response> => {
      let lastError: any;
      for (let i = 0; i < retries; i++) {
        try {
          const res = await fetch(url, options);
          if (res.status === 504 || res.status === 502)
            throw new Error(`Gateway Timeout ${res.status}`);
          if (!res.ok) return res;
          return res;
        } catch (err) {
          lastError = err;
          if (i === retries - 1) throw lastError;
          this.logger.warn(`GPT Retrying (${i + 1}/${retries})...`);
        }
      }
      throw lastError || new Error('Fetch failed unknown error');
    };
    // 确保内容符合要求（加入必要的句子）
    const mustLine = 'Keep the product exactly as in the reference image.';
    try {
      const response = await fetchWithRetry(this.DEGPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.DEGPT_TOKEN}`,
        },
        body: JSON.stringify({
          model: this.LLM_MODEL,
          messages: [
            {
              role: 'system',
              content:
                'You are a JSON-only assistant. Output valid JSON only. No markdown. No external tools or browsing.',
            },
            { role: 'user', content: template },
          ],
          stream: false,
          project: 'DecentralGPT',
          enable_thinking: false,
          tool_choice: 'none',
          max_tokens: 10000,
          temperature: 0.85,
        }),
      });

      const textResponse = await response.text();
      this.logger.log(
        `[Debug] Raw GPT Response: ${textResponse.slice(0, 500)}`,
      );

      let content = '';
      try {
        const data = JSON.parse(textResponse);
        content =
          data?.choices?.[0]?.message?.content ||
          data?.output?.[0]?.content?.[0]?.text ||
          '';
      } catch (e) {
        throw new Error(`Invalid JSON Response`);
      }

      // 清洗 JSON
      let cleanContent = content
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      const match = cleanContent.match(/\{[\s\S]*\}/);
      if (match) cleanContent = match[0];

      const result = JSON.parse(cleanContent);

      // 确保关键内容存在
      if (!result?.videoVisualPrompt)
        throw new Error('Missing videoVisualPrompt');
      if (!result?.imageEditPrompt) throw new Error('Missing imageEditPrompt');

      if (
        typeof result.imageEditPrompt === 'string' &&
        !result.imageEditPrompt.includes(mustLine)
      ) {
        result.imageEditPrompt = `${result.imageEditPrompt.trim()} ${mustLine}`;
      }
      if (
        typeof result.videoVisualPrompt === 'string' &&
        !result.videoVisualPrompt.includes(mustLine)
      ) {
        result.videoVisualPrompt = `${result.videoVisualPrompt.trim()} ${mustLine}`;
      }

      return result as OptimizedResult;
    } catch (e: any) {
      this.logger.error(`GPT 导演罢工: ${e.message}`);

      // 硬规则兜底：同样遵守你要求的规则
      const baseImage = `Premium cinematic still of the product, high-end commercial lighting, refined background and composition. Ensure the product remains exactly as in the reference image. Add subtle filters for mood enhancement (e.g., soft vignette, warm lighting for lifestyle products).`;

      const voiceTag = fixedVoiceDesc || 'Best matched voice from menu';
      const fallbackDialogue = isChinese
        ? '我刚用了一下，真的太惊艳了，质感和效果都很高级。'
        : isKorean
          ? '방금 써봤는데, 진짜 놀랄 만큼 고급스럽고 만족스러워요.'
          : 'I just tried it—honestly, it feels premium and the results are stunning.';

      const fallbackVisual = `
  ${duration}s premium commercial. Coherent single setting, smooth motivated transitions (match-cut / rack-focus carry / whip-pan). Dynamic but controlled camera plan (macro slider + slow dolly-in + arc/orbit + hero tilt). Young Asian model (20–26), trendy fashion styled to the product scenario, subtle micro-expressions and tactile interaction with the product. 
  (说) The character @${voiceTag} says "${fallbackDialogue}".
  Cinematic lighting (key + rim + soft fill), shallow DOF, premium grading, brand-ready final hero shot. ${mustLine}
  `.trim();

      return {
        imageEditPrompt: baseImage,
        videoVisualPrompt: fallbackVisual,
      };
    }
  }

  // ==========================================
  // 图片优化 (Nano Banana Pro)
  // ==========================================
  async optimizeImage(imageUrl: string, prompt: string): Promise<string> {
    this.logger.log(`[Image] 提交给 Nano Banana Pro (4K)...`, prompt);
    try {
      const payload = {
        prompt: prompt,
        images: [imageUrl],
        resolution: '1k',
        output_format: 'png',
        enable_sync_mode: false,
        num_outputs: 1,
        number_of_images: 1,
      };

      const submitRes = await fetch(
        `${this.WAVESPEED_URL}/google/nano-banana-pro/edit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.WAVESPEED_KEY}`,
          },
          body: JSON.stringify(payload),
        },
      );

      const submitData = await submitRes.json();
      const requestId = submitData?.data?.id;

      if (!submitRes.ok || !requestId) {
        this.logger.error('Nano Banana 提交失败', submitData);
        return imageUrl;
      }

      return await this.pollImageResult(requestId, imageUrl);
    } catch (e) {
      this.logger.error('图片优化异常', e);
      return imageUrl;
    }
  }

  private async pollImageResult(
    requestId: string,
    originalUrl: string,
  ): Promise<string> {
    const maxRetries = 60;
    const interval = 2000;
    for (let i = 0; i < maxRetries; i++) {
      await new Promise((r) => setTimeout(r, interval));
      try {
        const res = await fetch(
          `${this.WAVESPEED_URL}/predictions/${requestId}/result`,
          {
            headers: { Authorization: `Bearer ${this.WAVESPEED_KEY}` },
          },
        );
        if (!res.ok) continue;
        const json = await res.json();
        // 🔥🔥🔥 [之前保留的逻辑] 确保返回的是字符串，否则返回原图
        if (json?.data?.status === 'completed') {
          const out = json.data.outputs?.[0];
          if (typeof out === 'string') return out;
        }
        if (json?.data?.status === 'failed') return originalUrl;
      } catch (e) {}
    }
    return originalUrl;
  }
}
