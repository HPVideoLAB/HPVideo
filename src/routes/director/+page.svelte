<!--
  Director Mode (导演模式) — third top-level mode alongside Pro Mode
  and Infinite Canvas. Long-form text → agentic storyboard → multi-shot
  video. Phase 1 ships the planner (read-only). Phase 2 wires payment
  and runs the generation end-to-end via canvas backend internals.
-->
<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { WEBUI_API_BASE_URL } from '$lib/constants';
  import { dlcpBalance, initPageFlag } from '$lib/stores';
  import { walletAddress } from '$lib/stores/wallet';

  // Top-level routes (canvas, director) must signal the global layout
  // so it dismisses the splash screen. (app) routes get this for free
  // via their layout; director sits outside (app), same as canvas.
  onMount(() => {
    initPageFlag.set(true);
  });

  const i18n: any = getContext('i18n');

  type DirectorCharacter = {
    name: string;
    static_features: string;
    dynamic_features: string;
    voice_hint: string;
  };
  type DirectorShot = {
    idx: number;
    scene_idx: number;
    prompt: string;
    ff_desc: string;
    lf_desc: string;
    motion_desc: string;
    duration_s: 5 | 8;
    model: string;
    characters_in_shot: string[];
  };
  type Storyboard = {
    characters: DirectorCharacter[];
    shots: DirectorShot[];
    total_cost_cr: number;
    meta: { scene_count: number; shot_count: number; lang: string; cached: boolean };
  };

  import { chargeForRun } from '$lib/components/canvas/dlcpCharge';

  let rawText = '';
  let lang: 'en' | 'zh' | 'ja' | 'ko' = 'en';
  let planning = false;
  let storyboard: Storyboard | null = null;
  let planError = '';

  // Run state
  type ShotStatus = 'idle' | 'running' | 'ok' | 'failed';
  let running = false;
  let shotStatus: Record<number, { status: ShotStatus; url?: string; error?: string; elapsed?: number }> = {};
  let stitchStatus: { status: 'idle' | 'running' | 'ok' | 'failed'; url?: string; error?: string } = { status: 'idle' };
  let finalUrl = '';
  let runLog: string[] = [];

  function makeRunId(): string {
    // Cheap UUID; backend treats run_id as opaque.
    return 'd-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
  }

  $: charCount = rawText.length;
  $: walletConnected = !!$walletAddress;
  $: dlcpDisplay = (() => {
    const n = parseFloat(String($dlcpBalance || '0'));
    return Number.isFinite(n) ? n.toFixed(0) : '0';
  })();

  async function plan() {
    if (rawText.trim().length < 8) {
      toast.error($i18n.t('Give the director something to work with (≥ 8 characters).'));
      return;
    }
    planning = true;
    planError = '';
    try {
      const token = (typeof localStorage !== 'undefined' && localStorage.getItem('token')) || '';
      const r = await fetch(`${WEBUI_API_BASE_URL}/director/plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ text: rawText, lang })
      });
      if (!r.ok) {
        const t = await r.text().catch(() => '');
        throw new Error(`HTTP ${r.status}: ${t.slice(0, 200)}`);
      }
      storyboard = await r.json();
    } catch (e: any) {
      planError = e?.message || String(e);
      toast.error($i18n.t('Plan failed: {{err}}', { err: planError }));
    } finally {
      planning = false;
    }
  }

  function clearPlan() {
    storyboard = null;
    planError = '';
  }

  function resetRunState() {
    shotStatus = {};
    stitchStatus = { status: 'idle' };
    finalUrl = '';
    runLog = [];
  }

  async function handleRunAll() {
    if (!storyboard || running) return;
    if (!$walletAddress) {
      toast.error($i18n.t('Connect a points wallet to run.'));
      return;
    }
    if (storyboard.total_cost_cr <= 0) {
      toast.error($i18n.t('Storyboard has zero cost — nothing to pay for.'));
      return;
    }

    resetRunState();
    running = true;
    const runId = makeRunId();
    runLog = [...runLog, $i18n.t('💰 Charging {{cr}} credits…', { cr: storyboard.total_cost_cr.toLocaleString() })];

    // Phase 1 — pay
    let charge: Awaited<ReturnType<typeof chargeForRun>>;
    try {
      charge = await chargeForRun({
        runId,
        totalCostCr: storyboard.total_cost_cr,
        t: (k, v) => $i18n.t(k, v) as string,
        endpoint: '/director/charge'
      });
    } catch (e: any) {
      running = false;
      runLog = [...runLog, $i18n.t('✕ Charge failed: {{err}}', { err: e?.message || String(e) })];
      toast.error(e?.message || String(e));
      return;
    }
    if (!charge.success) {
      running = false;
      runLog = [...runLog, $i18n.t('✕ Charge failed')];
      return;
    }
    runLog = [...runLog, $i18n.t('✓ Payment verified. Starting generation…')];

    // Phase 2 — stream /director/run
    const token = (typeof localStorage !== 'undefined' && localStorage.getItem('token')) || '';
    let resp: Response;
    try {
      resp = await fetch(`${WEBUI_API_BASE_URL}/director/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          run_id: runId,
          storyboard,
          transitions: 'crossfade'
        })
      });
    } catch (e: any) {
      running = false;
      runLog = [...runLog, $i18n.t('✕ Run failed: {{err}}', { err: e?.message || String(e) })];
      toast.error(e?.message || String(e));
      return;
    }
    if (!resp.ok || !resp.body) {
      running = false;
      const txt = await resp.text().catch(() => '');
      runLog = [...runLog, $i18n.t('✕ HTTP {{s}}: {{t}}', { s: resp.status, t: txt.slice(0, 160) })];
      toast.error(`HTTP ${resp.status}`);
      return;
    }

    // SSE: read line-buffered, parse `data: {...}` events.
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        // Split on double newlines (SSE event boundary).
        let idx: number;
        while ((idx = buf.indexOf('\n\n')) >= 0) {
          const chunk = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 2);
          if (!chunk.startsWith('data:')) continue;
          const data = chunk.slice(5).trim();
          try {
            const evt = JSON.parse(data);
            handleEvent(evt);
          } catch (_) {
            // Tolerate non-JSON heartbeats.
          }
        }
      }
    } catch (e: any) {
      runLog = [...runLog, $i18n.t('✕ Stream error: {{err}}', { err: e?.message || String(e) })];
    }
    running = false;
  }

  function handleEvent(evt: any) {
    if (evt.type === 'start') {
      runLog = [...runLog, $i18n.t('▶ Generating {{n}} shots…', { n: evt.shot_count })];
    } else if (evt.type === 'shot') {
      shotStatus = {
        ...shotStatus,
        [evt.idx]: {
          status: evt.status,
          url: evt.url,
          error: evt.error,
          elapsed: evt.elapsed_s
        }
      };
      if (evt.status === 'running') {
        runLog = [...runLog, $i18n.t('▶ Shot #{{n}}…', { n: evt.idx + 1 })];
      } else if (evt.status === 'ok') {
        runLog = [...runLog, $i18n.t('✓ Shot #{{n}} done ({{s}}s)', { n: evt.idx + 1, s: evt.elapsed_s })];
      } else if (evt.status === 'failed') {
        runLog = [...runLog, $i18n.t('✕ Shot #{{n}}: {{err}}', { n: evt.idx + 1, err: evt.error })];
      }
    } else if (evt.type === 'stitch') {
      stitchStatus = { status: evt.status, url: evt.url, error: evt.error };
      if (evt.status === 'running') {
        runLog = [...runLog, $i18n.t('▶ Stitching with crossfade…')];
      } else if (evt.status === 'ok') {
        runLog = [...runLog, $i18n.t('✓ Stitch done')];
      } else if (evt.status === 'failed') {
        runLog = [...runLog, $i18n.t('✕ Stitch: {{err}}', { err: evt.error })];
      }
    } else if (evt.type === 'done') {
      finalUrl = evt.final_url;
      runLog = [...runLog, $i18n.t('🎬 Done in {{s}}s', { s: evt.total_elapsed_s })];
      toast.success($i18n.t('Video ready.'));
    } else if (evt.type === 'error') {
      runLog = [...runLog, $i18n.t('✕ {{err}}', { err: evt.message })];
      toast.error(evt.message || 'failed');
    }
  }
</script>

<svelte:head>
  <title>Director Mode · HPVideo</title>
</svelte:head>

<div class="director-root">
  <header class="topbar">
    <div class="brand">
      <span class="badge">🎬</span>
      <strong>{$i18n.t('Director Mode')}</strong>
      <span class="hint">{$i18n.t('Story in. Multi-shot video out.')}</span>
    </div>
    <div class="topbar-right">
      {#if walletConnected}
        <span class="wallet-pill">
          {$i18n.t('Wallet')} · {dlcpDisplay} {$i18n.t('cr')}
        </span>
      {/if}
    </div>
  </header>

  <section class="input-card">
    <label class="label" for="director-input">
      {$i18n.t('Paste your story, idea or novel excerpt')}
    </label>
    <textarea
      id="director-input"
      bind:value={rawText}
      maxlength="6000"
      rows="6"
      placeholder={$i18n.t(
        'Example: A young Korean barista meets a mysterious stranger in a rainy Seoul cafe; they exchange a single glance and a folded note that changes both their nights.'
      )}
      disabled={planning}
    ></textarea>
    <div class="input-meta">
      <select bind:value={lang} disabled={planning}>
        <option value="en">English</option>
        <option value="zh">中文</option>
        <option value="ja">日本語</option>
        <option value="ko">한국어</option>
      </select>
      <span class="counter">{charCount} / 6000</span>
      <button class="btn primary" on:click={plan} disabled={planning || charCount < 8}>
        {#if planning}
          ⏳ {$i18n.t('Planning storyboard…')}
        {:else}
          ▶ {$i18n.t('Plan storyboard')}
        {/if}
      </button>
    </div>
    {#if planError}
      <div class="err">{planError}</div>
    {/if}
  </section>

  {#if storyboard}
    <section class="bible-card">
      <header class="card-head">
        <strong>{$i18n.t('Character bible')}</strong>
        <span class="muted">
          {storyboard.characters.length} {$i18n.t('characters')}
          · {$i18n.t('language')}: {storyboard.meta.lang}
          {storyboard.meta.cached ? ' · cached' : ''}
        </span>
      </header>
      <div class="bible-grid">
        {#each storyboard.characters as c (c.name)}
          <article class="char">
            <header><strong>{c.name}</strong></header>
            <p><span class="tag">{$i18n.t('static')}</span> {c.static_features}</p>
            {#if c.dynamic_features}
              <p><span class="tag">{$i18n.t('dynamic')}</span> {c.dynamic_features}</p>
            {/if}
            {#if c.voice_hint}
              <p><span class="tag">{$i18n.t('voice')}</span> {c.voice_hint}</p>
            {/if}
          </article>
        {/each}
      </div>
    </section>

    <section class="shots">
      <header class="card-head">
        <strong>{$i18n.t('Storyboard')}</strong>
        <span class="muted">
          {storyboard.shots.length} {$i18n.t('shots')}
          · {storyboard.shots.reduce((acc, s) => acc + s.duration_s, 0)}s
          · {storyboard.total_cost_cr.toLocaleString()} {$i18n.t('cr')}
        </span>
      </header>
      <ol class="shot-list">
        {#each storyboard.shots as s (s.idx)}
          {@const st = shotStatus[s.idx]}
          <li class="shot" class:running={st?.status === 'running'} class:ok={st?.status === 'ok'} class:failed={st?.status === 'failed'}>
            <header class="shot-head">
              <span class="shot-num">#{s.idx + 1}</span>
              <span class="shot-meta">
                {s.duration_s}s · {s.model}
                · {s.idx === 0 ? $i18n.t('t2v') : $i18n.t('i2v chained')}
                {#if st?.status === 'running'}
                  <span class="status-pill running">▶ {$i18n.t('running…')}</span>
                {:else if st?.status === 'ok'}
                  <span class="status-pill ok">✓ {st.elapsed}s</span>
                {:else if st?.status === 'failed'}
                  <span class="status-pill failed">✕ {$i18n.t('failed')}</span>
                {/if}
              </span>
            </header>
            <p class="shot-prompt">{s.prompt}</p>
            <div class="shot-meta-grid">
              <div><strong>{$i18n.t('First frame')}</strong> {s.ff_desc}</div>
              <div><strong>{$i18n.t('Last frame')}</strong> {s.lf_desc}</div>
              <div><strong>{$i18n.t('Motion')}</strong> {s.motion_desc}</div>
              {#if s.characters_in_shot.length}
                <div>
                  <strong>{$i18n.t('Cast')}</strong>
                  {s.characters_in_shot.join(', ')}
                </div>
              {/if}
            </div>
            {#if st?.status === 'ok' && st.url}
              <!-- svelte-ignore a11y-media-has-caption -->
              <video class="shot-clip" src={st.url} controls muted playsinline preload="metadata"></video>
            {:else if st?.status === 'failed' && st.error}
              <p class="shot-err">{st.error}</p>
            {/if}
          </li>
        {/each}
      </ol>
    </section>

    {#if finalUrl}
      <section class="final-card">
        <header class="card-head">
          <strong>🎬 {$i18n.t('Final cut')}</strong>
        </header>
        <!-- svelte-ignore a11y-media-has-caption -->
        <video class="final-video" src={finalUrl} controls playsinline preload="metadata"></video>
        <p class="final-meta">
          <a href={finalUrl} target="_blank" rel="noopener">{$i18n.t('Open / download MP4 ↗')}</a>
        </p>
      </section>
    {/if}

    {#if runLog.length}
      <section class="log-card">
        <header class="card-head">
          <strong>{$i18n.t('Run log')}</strong>
        </header>
        <pre class="log-pre">{runLog.join('\n')}</pre>
      </section>
    {/if}

    <footer class="run-bar">
      <button class="btn ghost" on:click={clearPlan} disabled={running}>↺ {$i18n.t('New plan')}</button>
      <button
        class="btn primary big"
        on:click={handleRunAll}
        disabled={running || !walletConnected || storyboard.total_cost_cr <= 0}
        title={running
          ? $i18n.t('Generation in progress…')
          : walletConnected
            ? $i18n.t('Sign one DLP transfer, then generate every shot.')
            : $i18n.t('Connect a points wallet to run.')}
      >
        {#if running}
          ⏳ {$i18n.t('Generating…')}
        {:else}
          ▶ {$i18n.t('Generate & Pay')} · {storyboard.total_cost_cr.toLocaleString()}
          {$i18n.t('cr')}
        {/if}
      </button>
    </footer>
  {/if}
</div>

<style>
  .director-root {
    max-width: 960px;
    margin: 0 auto;
    padding: 24px;
    color: #e5e3f0;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .brand .badge {
    font-size: 22px;
  }
  .brand strong {
    font-size: 18px;
  }
  .brand .hint {
    color: #a6a2bc;
    font-size: 13px;
  }
  .wallet-pill {
    padding: 6px 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 13px;
  }
  .input-card,
  .bible-card,
  .shots {
    background: linear-gradient(180deg, rgba(28, 21, 56, 0.9), rgba(21, 16, 42, 0.9));
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    padding: 20px;
    margin-bottom: 20px;
  }
  .label {
    display: block;
    font-size: 13px;
    color: #a6a2bc;
    margin-bottom: 8px;
  }
  textarea {
    width: 100%;
    border-radius: 10px;
    background: #0a0014;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #e5e3f0;
    padding: 12px 14px;
    font: inherit;
    font-size: 14px;
    line-height: 1.5;
    resize: vertical;
  }
  textarea:focus {
    border-color: #c213f2;
    outline: none;
  }
  .input-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 10px;
  }
  .input-meta select {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #e5e3f0;
    border-radius: 8px;
    padding: 6px 10px;
    font: inherit;
  }
  .counter {
    color: #6b6884;
    font-size: 12px;
    flex: 1;
  }
  .err {
    margin-top: 12px;
    padding: 10px 12px;
    border-radius: 8px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #fca5a5;
    font-size: 13px;
  }
  .card-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .card-head .muted {
    color: #6b6884;
    font-size: 12px;
  }
  .bible-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 12px;
  }
  .char {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    padding: 12px 14px;
    font-size: 13px;
    line-height: 1.5;
  }
  .char header strong {
    font-size: 14px;
  }
  .char p {
    margin: 6px 0 0;
  }
  .tag {
    display: inline-block;
    font-size: 10px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    background: rgba(194, 19, 242, 0.15);
    color: #d090ff;
    padding: 1px 6px;
    border-radius: 4px;
    margin-right: 6px;
  }
  .shot-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .shot {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-left: 3px solid #c213f2;
    border-radius: 10px;
    padding: 14px 16px;
  }
  .shot-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 8px;
  }
  .shot-num {
    font-weight: 700;
    color: #d090ff;
  }
  .shot-meta {
    color: #6b6884;
    font-size: 12px;
  }
  .shot-prompt {
    margin: 0 0 10px;
    line-height: 1.5;
  }
  .shot-meta-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 6px 14px;
    font-size: 12px;
    color: #a6a2bc;
  }
  .shot-meta-grid strong {
    color: #d090ff;
    display: block;
    font-size: 10px;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    margin-bottom: 1px;
  }
  .run-bar {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-top: 12px;
  }
  .btn {
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.05);
    color: #e5e3f0;
    border-radius: 10px;
    padding: 8px 16px;
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .btn.primary {
    background: linear-gradient(90deg, #c213f2, #8a2ce6);
    border-color: transparent;
    color: white;
  }
  .btn.primary:hover:not(:disabled) {
    box-shadow: 0 4px 12px rgba(194, 19, 242, 0.3);
  }
  .btn.big {
    padding: 12px 24px;
    font-size: 14px;
  }
  .btn.ghost {
    background: transparent;
  }

  /* Per-shot status pills + clips */
  .status-pill {
    display: inline-block;
    margin-left: 8px;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.3px;
    text-transform: uppercase;
    border: 1px solid currentColor;
  }
  .status-pill.running {
    color: #f5a623;
    animation: pulse 1.4s infinite ease-in-out;
  }
  .status-pill.ok {
    color: #36c47b;
  }
  .status-pill.failed {
    color: #ef4444;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.55; }
  }
  .shot.running {
    border-left-color: #f5a623;
  }
  .shot.ok {
    border-left-color: #36c47b;
  }
  .shot.failed {
    border-left-color: #ef4444;
  }
  .shot-clip {
    display: block;
    margin-top: 12px;
    width: 100%;
    max-height: 280px;
    border-radius: 8px;
    background: #0a0014;
  }
  .shot-err {
    margin-top: 10px;
    padding: 8px 10px;
    border-radius: 6px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #fca5a5;
    font-size: 12px;
  }

  /* Final cut card */
  .final-card {
    background: linear-gradient(180deg, rgba(54, 196, 123, 0.12), rgba(21, 16, 42, 0.9));
    border: 1px solid rgba(54, 196, 123, 0.35);
    border-radius: 14px;
    padding: 20px;
    margin-bottom: 20px;
  }
  .final-video {
    display: block;
    width: 100%;
    max-height: 480px;
    border-radius: 10px;
    background: #0a0014;
  }
  .final-meta {
    margin-top: 10px;
    font-size: 13px;
  }
  .final-meta a {
    color: #d090ff;
    text-decoration: none;
  }
  .final-meta a:hover {
    text-decoration: underline;
  }

  /* Run log */
  .log-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 16px 20px;
    margin-bottom: 20px;
  }
  .log-pre {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    color: #a6a2bc;
    margin: 0;
    white-space: pre-wrap;
    max-height: 240px;
    overflow-y: auto;
  }
</style>
