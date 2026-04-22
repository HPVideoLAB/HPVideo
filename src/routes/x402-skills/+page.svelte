<script lang="ts">
  import { onMount } from "svelte";

  // Models data — keep in sync with backend MODEL_REGISTRY (x402pay.py)
  // Updated 2026-04-22: Sora 2 removed (OpenAI API shutdown 2026-09-24).
  const models = [
    {
      id: "wan-2.7",
      name: "WAN 2.7",
      provider: "Alibaba",
      type: "Text-to-Video / Image-to-Video",
      duration: "5-10s",
      resolution: "480p - 1080p",
      audio: true,
      price: "$0.38 - $2.25",
      rank: 1,
      category: "Cinematic",
      desc: "High-quality cinematic video generation with audio support. Best for marketing, storytelling, and professional content.",
    },
    {
      id: "luma-ray-2",
      name: "LUMA RAY 2",
      provider: "Luma AI",
      type: "Text-to-Video / Image-to-Video",
      duration: "5-10s",
      resolution: "1080p",
      audio: true,
      price: "$0.75 - $1.50",
      rank: 2,
      category: "Cinematic",
      desc: "Film-grade cinematic motion and VFX-quality rendering with prompt optimization.",
    },
    {
      id: "veo3.1",
      name: "VEO 3.1",
      provider: "Google",
      type: "Text-to-Video / Image-to-Video",
      duration: "4-8s",
      resolution: "Multiple",
      audio: true,
      price: "$2.40 - $4.80",
      rank: 3,
      category: "Photorealistic",
      desc: "Google's state-of-the-art video model. Excels at photorealistic scenes, product demos, and natural motion.",
    },
    {
      id: "kling-3.0",
      name: "KLING V3.0",
      provider: "Kwai AI",
      type: "Text-to-Video / Image-to-Video",
      duration: "5-10s",
      resolution: "Multiple",
      audio: true,
      price: "$2.10 - $4.20",
      rank: 4,
      category: "Dynamic",
      desc: "Dynamic motion and character animation. Ideal for social media content, memes, and short-form video.",
    },
    {
      id: "ovi",
      name: "OVI",
      provider: "Character.ai",
      type: "Text-to-Video",
      duration: "5s",
      resolution: "540p",
      audio: true,
      price: "$0.225",
      rank: 5,
      category: "Character",
      desc: "Character-focused video generation. Specialized in avatar animation and conversational video.",
    },
    {
      id: "ltx-2.3",
      name: "LTX 2.3",
      provider: "WaveSpeed / Lightricks",
      type: "Text-to-Video / Image-to-Video",
      duration: "6-10s",
      resolution: "1080p",
      audio: true,
      price: "$0.54 - $0.90",
      rank: 6,
      category: "Professional",
      desc: "Synchronized audio-video DiT model. Optimized for product showcases, tutorials, and corporate content.",
    },
    {
      id: "hailuo-2.3",
      name: "HAILUO 2.3",
      provider: "Minimax",
      type: "Text-to-Video",
      duration: "6-10s",
      resolution: "1080p",
      audio: false,
      price: "$0.35 - $0.84",
      rank: 7,
      category: "Physics-Aware",
      desc: "Physics-aware rendering and realistic motion. Great for authentic scenes and natural dynamics.",
    },
    {
      id: "seedance-2.0",
      name: "SEEDANCE 2.0",
      provider: "ByteDance",
      type: "Text-to-Video / Image-to-Video",
      duration: "6-12s",
      resolution: "Multiple",
      audio: true,
      price: "$0.30 - $0.60",
      rank: 8,
      category: "Cinematic",
      desc: "Hollywood-grade cinematic motion with native audio sync and director-level camera control.",
    },
    {
      id: "pixverse-v6",
      name: "PIXVERSE V6",
      provider: "Pixverse",
      type: "Text-to-Video / Image-to-Video",
      duration: "5-8s",
      resolution: "Multiple",
      audio: true,
      price: "$0.60 - $1.20",
      rank: 9,
      category: "Versatile",
      desc: "Versatile all-purpose video with camera control, native audio, and multi-shot generation.",
    },
    {
      id: "vidu-q3",
      name: "VIDU Q3",
      provider: "Vidu",
      type: "Text-to-Video / Image-to-Video",
      duration: "4-8s",
      resolution: "Up to 1080p",
      audio: true,
      price: "$0.40 - $0.80",
      rank: 10,
      category: "Motion-Diverse",
      desc: "High-quality motion-diverse video generation with cinematic results and rich detail.",
    },
  ];

  const stats = {
    totalModels: 10,
    durationRange: "4-12s",
    maxResolution: "Up to 1080p",
    priceRange: "$0.22-$4.80",
    paymentChain: "Base",
    paymentToken: "USDC",
  };

  let currentTime = "";
  let blinkVisible = true;

  onMount(() => {
    const updateTime = () => {
      currentTime = new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC";
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    const blinker = setInterval(() => { blinkVisible = !blinkVisible; }, 500);
    return () => { clearInterval(timer); clearInterval(blinker); };
  });
</script>

<svelte:head>
  <title>HPVideo x402 Skills — AI Agent Video Marketplace</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@400;500;600;700&display=swap');
  </style>
</svelte:head>

<div class="x402-page">
  <!-- Header Bar -->
  <header class="x402-header">
    <div class="header-left">
      <span class="logo-text">HPVideo</span>
      <span class="logo-badge">x402</span>
      <span class="logo-sub">Agent-First AI Video Marketplace</span>
    </div>
    <div class="header-right">
      <span class="status-dot"></span>
      <span class="status-text">ONLINE</span>
      <a href="/creator" class="header-btn">Launch App</a>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="hero">
    <div class="hero-content">
      <h1 class="hero-title">
        <span class="gradient-text">AI Agent Video Generation</span>
        <br />via x402 Protocol
      </h1>
      <p class="hero-desc">
        A fully autonomous AI-to-AI video generation marketplace. Agents discover models, send HTTP requests with x402 payment headers, and receive generated videos — all without human involvement.
      </p>
      <div class="hero-warning">
        <span class="warning-icon">&#9889;</span>
        <span>Machine-First Protocol. AI Agents pay USDC on Base Chain via x402. Humans use the <a href="/creator" class="inline-link">Creator App</a>.</span>
      </div>
      <div class="hero-actions">
        <a href="#skills" class="btn-primary">View Skills Catalog <span class="btn-badge">{models.length}</span></a>
        <a href="#integration" class="btn-secondary">Integration Guide</a>
      </div>
    </div>
    <div class="hero-terminal">
      <div class="terminal-bar">
        <span class="terminal-dot red"></span>
        <span class="terminal-dot yellow"></span>
        <span class="terminal-dot green"></span>
        <span class="terminal-title">x402 — agent request</span>
      </div>
      <pre class="terminal-code"><code><span class="code-comment"># AI Agent generates video via x402</span>
<span class="code-keyword">curl</span> -X GET \
  <span class="code-string">"https://hpvideo.io/creator/api/v1/x402/creator/wan-2.7"</span> \
  -H <span class="code-string">"X-PAYMENT: &lt;x402_payment_header&gt;"</span> \
  -d <span class="code-string">"prompt=A cinematic drone shot over mountains"</span> \
  -d <span class="code-string">"duration=5&size=1280:720"</span>

<span class="code-comment"># Response</span>
{"{"}
  <span class="code-key">"success"</span>: <span class="code-bool">true</span>,
  <span class="code-key">"model"</span>: <span class="code-string">"wan-2.7"</span>,
  <span class="code-key">"path"</span>: <span class="code-string">"https://hpvideo.io/creator/x402?createid=..."</span>
{"}"}</code></pre>
    </div>
  </section>

  <!-- Tech Details -->
  <section class="tech-bar">
    <div class="tech-item"><span class="tech-label">CHAIN</span><span class="tech-value">Base (eip155:8453)</span></div>
    <div class="tech-item"><span class="tech-label">PROTOCOL</span><span class="tech-value">x402</span></div>
    <div class="tech-item"><span class="tech-label">TOKEN</span><span class="tech-value">USDC</span></div>
    <div class="tech-item"><span class="tech-label">FACILITATOR</span><span class="tech-value">Coinbase CDP</span></div>
    <div class="tech-item"><span class="tech-label">SETTLEMENT</span><span class="tech-value">BNB Chain ($HPC)</span></div>
    <div class="tech-item"><span class="tech-label">MODELS</span><span class="tech-value">{models.length} Active</span></div>
  </section>

  <!-- x402 Capabilities -->
  <section class="stats-section">
    <h2 class="section-title">x402 Capabilities</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value cyan">{stats.totalModels}</div>
        <div class="stat-label">AI Video Models</div>
      </div>
      <div class="stat-card">
        <div class="stat-value cyan">{stats.durationRange}</div>
        <div class="stat-label">Duration Range</div>
      </div>
      <div class="stat-card">
        <div class="stat-value green">{stats.maxResolution}</div>
        <div class="stat-label">Max Resolution</div>
      </div>
      <div class="stat-card">
        <div class="stat-value green">{stats.priceRange}</div>
        <div class="stat-label">Price Range (USDC)</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{stats.paymentChain}</div>
        <div class="stat-label">Payment Chain</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{stats.paymentToken}</div>
        <div class="stat-label">Payment Token</div>
      </div>
    </div>
  </section>

  <!-- Skills Catalog -->
  <section class="skills-section" id="skills">
    <h2 class="section-title">Video Generation Skills</h2>
    <p class="section-sub">Top {models.length} AI video models available via x402 protocol — ranked by cumulative revenue</p>

    <div class="skills-grid">
      {#each models as model, i}
        <div class="skill-card">
          <div class="skill-header">
            <div class="skill-rank">#{model.rank}</div>
            <div class="skill-badges">
              <span class="badge category">{model.category}</span>
              {#if model.audio}
                <span class="badge audio">Audio</span>
              {/if}
            </div>
          </div>
          <h3 class="skill-name">{model.name}</h3>
          <div class="skill-provider">{model.provider}</div>
          <p class="skill-desc">{model.desc}</p>
          <div class="skill-specs">
            <div class="spec"><span class="spec-label">Type</span><span class="spec-value">{model.type}</span></div>
            <div class="spec"><span class="spec-label">Duration</span><span class="spec-value">{model.duration}</span></div>
            <div class="spec"><span class="spec-label">Resolution</span><span class="spec-value">{model.resolution}</span></div>
            <div class="spec"><span class="spec-label">Price</span><span class="spec-value price">{model.price}</span></div>
          </div>
          <div class="skill-endpoint">
            <code>/api/v1/x402/creator/{model.id}</code>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- Integration Guide -->
  <section class="integration-section" id="integration">
    <h2 class="section-title">Agent Integration</h2>
    <p class="section-sub">Connect your AI agent to HPVideo in 3 steps</p>

    <div class="steps-grid">
      <div class="step-card">
        <div class="step-num">01</div>
        <h3 class="step-title">Discover Skills</h3>
        <p class="step-desc">Paste this URL into your agent's prompt to discover available video generation skills:</p>
        <div class="step-code">
          <code>https://hpvideo.io/creator/x402-skills/skill.md</code>
        </div>
      </div>

      <div class="step-card">
        <div class="step-num">02</div>
        <h3 class="step-title">Fund Wallet</h3>
        <p class="step-desc">Agent generates a Base Chain wallet and funds it with USDC. x402 payment headers are auto-generated per request.</p>
        <div class="step-code">
          <code>Network: Base (eip155:8453)<br/>Token: USDC<br/>Facilitator: Coinbase CDP</code>
        </div>
      </div>

      <div class="step-card">
        <div class="step-num">03</div>
        <h3 class="step-title">Generate & Pay</h3>
        <p class="step-desc">Send GET request with x402 payment header. Video is generated and returned automatically.</p>
        <div class="step-code">
          <code>GET /api/v1/x402/creator/wan-2.7<br/>?prompt=...&duration=5&size=1280:720<br/>Header: X-PAYMENT: &lt;x402_token&gt;</code>
        </div>
      </div>
    </div>

    <div class="api-docs">
      <h3 class="docs-title">API Reference</h3>
      <div class="docs-table-wrap">
        <table class="docs-table">
          <thead>
            <tr>
              <th>Endpoint</th>
              <th>Model</th>
              <th>Parameters</th>
              <th>Payment</th>
            </tr>
          </thead>
          <tbody>
            {#each models as model}
              <tr>
                <td><code>/x402/creator/{model.id}</code></td>
                <td>{model.name}</td>
                <td>prompt, duration, size, messageid</td>
                <td>USDC via x402</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="x402-footer">
    <div class="footer-status">
      STATUS: <span class="green">ONLINE</span> | CHAIN: BASE (eip155:8453) | PROTOCOL: x402 | TOKEN: USDC | FACILITATOR: COINBASE CDP | SETTLEMENT: BNB CHAIN ($HPC)
    </div>
    <div class="footer-meta">
      AI-AGENT VIDEO MARKETPLACE | HUMAN ROLE: CREATOR APP USER | x402 ROLE: AUTONOMOUS AGENT
    </div>
    <div class="footer-links">
      <a href="https://hpvideo.io">hpvideo.io</a>
      <span>|</span>
      <a href="https://t.me/HPVideoAI">Telegram</a>
      <span>|</span>
      <a href="https://x.com/HPVideoAI">Twitter</a>
      <span>|</span>
      <a href="https://github.com/HPVideoLAB">GitHub</a>
      <span>|</span>
      <span class="mono">{currentTime}{blinkVisible ? ' _' : '  '}</span>
    </div>
  </footer>
</div>

<style>
  :root {
    --bg-dark: #0a0e1a;
    --bg-card: #111827;
    --bg-card-hover: #1a2332;
    --cyan: #00d2d3;
    --cyan-dim: rgba(0, 210, 211, 0.15);
    --green: #10b981;
    --green-dim: rgba(16, 185, 129, 0.15);
    --red: #ef4444;
    --yellow: #f59e0b;
    --orange: #f97316;
    --blue: #3b82f6;
    --purple: #8b5cf6;
    --white: #f1f5f9;
    --gray: #94a3b8;
    --gray-dark: #475569;
    --border: #1e293b;
  }

  .x402-page {
    min-height: 100vh;
    background: var(--bg-dark);
    color: var(--white);
    font-family: 'Inter', system-ui, sans-serif;
  }

  /* Header */
  .x402-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    border-bottom: 1px solid var(--border);
    background: rgba(10, 14, 26, 0.95);
    backdrop-filter: blur(12px);
    position: sticky;
    top: 0;
    z-index: 50;
  }
  .header-left { display: flex; align-items: center; gap: 0.75rem; }
  .logo-text { font-size: 1.25rem; font-weight: 700; color: var(--cyan); font-family: 'JetBrains Mono', monospace; }
  .logo-badge { background: var(--cyan); color: var(--bg-dark); font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.05em; }
  .logo-sub { color: var(--gray); font-size: 0.8rem; margin-left: 0.5rem; }
  .header-right { display: flex; align-items: center; gap: 1rem; }
  .status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); box-shadow: 0 0 6px var(--green); animation: pulse-dot 2s infinite; }
  @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  .status-text { color: var(--green); font-size: 0.75rem; font-family: 'JetBrains Mono', monospace; font-weight: 600; }
  .header-btn { background: var(--cyan-dim); color: var(--cyan); border: 1px solid rgba(0,210,211,0.3); padding: 0.4rem 1rem; border-radius: 6px; text-decoration: none; font-size: 0.8rem; font-weight: 600; transition: all 0.2s; }
  .header-btn:hover { background: var(--cyan); color: var(--bg-dark); }

  /* Hero */
  .hero { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; padding: 4rem 2rem; max-width: 1200px; margin: 0 auto; align-items: center; }
  .hero-title { font-size: 2.5rem; font-weight: 700; line-height: 1.2; margin-bottom: 1.5rem; }
  .gradient-text { background: linear-gradient(135deg, var(--cyan), var(--green)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
  .hero-desc { color: var(--gray); font-size: 1.05rem; line-height: 1.6; margin-bottom: 1.5rem; }
  .hero-warning { background: rgba(249, 115, 22, 0.1); border: 1px solid rgba(249, 115, 22, 0.3); border-radius: 8px; padding: 0.75rem 1rem; font-size: 0.85rem; color: var(--orange); display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; }
  .warning-icon { font-size: 1.1rem; }
  .inline-link { color: var(--cyan); text-decoration: underline; }
  .hero-actions { display: flex; gap: 1rem; }
  .btn-primary { background: var(--cyan); color: var(--bg-dark); padding: 0.65rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s; }
  .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(0,210,211,0.3); }
  .btn-badge { background: var(--bg-dark); color: var(--cyan); font-size: 0.7rem; padding: 1px 8px; border-radius: 10px; font-weight: 700; }
  .btn-secondary { background: transparent; color: var(--gray); border: 1px solid var(--gray-dark); padding: 0.65rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 0.9rem; transition: all 0.2s; }
  .btn-secondary:hover { border-color: var(--cyan); color: var(--cyan); }

  /* Terminal */
  .hero-terminal { background: #0d1117; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
  .terminal-bar { display: flex; align-items: center; gap: 6px; padding: 0.6rem 1rem; background: #161b22; border-bottom: 1px solid var(--border); }
  .terminal-dot { width: 10px; height: 10px; border-radius: 50%; }
  .terminal-dot.red { background: #ff5f56; }
  .terminal-dot.yellow { background: #ffbd2e; }
  .terminal-dot.green { background: #27c93f; }
  .terminal-title { color: var(--gray); font-size: 0.7rem; font-family: 'JetBrains Mono', monospace; margin-left: auto; }
  .terminal-code { padding: 1.25rem; margin: 0; overflow-x: auto; font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; line-height: 1.7; }
  .code-comment { color: #6a737d; }
  .code-keyword { color: var(--cyan); }
  .code-string { color: var(--green); }
  .code-key { color: #79c0ff; }
  .code-bool { color: var(--orange); }

  /* Tech Bar */
  .tech-bar { display: flex; justify-content: center; gap: 2rem; padding: 1rem 2rem; background: rgba(17, 24, 39, 0.6); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); flex-wrap: wrap; }
  .tech-item { display: flex; align-items: center; gap: 0.5rem; }
  .tech-label { color: var(--gray-dark); font-size: 0.7rem; font-family: 'JetBrains Mono', monospace; font-weight: 600; letter-spacing: 0.05em; }
  .tech-value { color: var(--cyan); font-size: 0.75rem; font-family: 'JetBrains Mono', monospace; font-weight: 500; }

  /* Stats */
  .stats-section { padding: 3rem 2rem; max-width: 1200px; margin: 0 auto; }
  .section-title { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--white); }
  .section-sub { color: var(--gray); font-size: 0.9rem; margin-bottom: 2rem; }
  .stats-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 1rem; }
  .stat-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 1.25rem; text-align: center; transition: all 0.2s; }
  .stat-card:hover { border-color: var(--cyan); transform: translateY(-2px); }
  .stat-value { font-size: 1.5rem; font-weight: 700; font-family: 'JetBrains Mono', monospace; margin-bottom: 0.25rem; color: var(--white); }
  .stat-value.cyan { color: var(--cyan); }
  .stat-value.green { color: var(--green); }
  .stat-label { color: var(--gray); font-size: 0.75rem; }

  /* Skills */
  .skills-section { padding: 3rem 2rem; max-width: 1200px; margin: 0 auto; }
  .skills-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; }
  .skill-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; transition: all 0.3s; position: relative; overflow: hidden; }
  .skill-card:hover { border-color: var(--cyan); transform: translateY(-3px); box-shadow: 0 8px 30px rgba(0, 210, 211, 0.08); }
  .skill-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, var(--cyan), var(--green)); opacity: 0; transition: opacity 0.3s; }
  .skill-card:hover::before { opacity: 1; }
  .skill-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; }
  .skill-rank { font-size: 1.75rem; font-weight: 700; color: var(--cyan); font-family: 'JetBrains Mono', monospace; opacity: 0.6; }
  .skill-badges { display: flex; gap: 0.4rem; flex-wrap: wrap; }
  .badge { font-size: 0.6rem; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 0.05em; }
  .badge.category { background: var(--cyan-dim); color: var(--cyan); }
  .badge.audio { background: var(--green-dim); color: var(--green); }
  .skill-name { font-size: 1.2rem; font-weight: 700; margin-bottom: 0.15rem; }
  .skill-provider { color: var(--gray); font-size: 0.8rem; margin-bottom: 0.5rem; }
  .skill-desc { color: var(--gray); font-size: 0.8rem; line-height: 1.5; margin-bottom: 1rem; }
  .skill-specs { display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; margin-bottom: 0.75rem; }
  .spec { display: flex; justify-content: space-between; }
  .spec-label { color: var(--gray-dark); font-size: 0.7rem; }
  .spec-value { color: var(--white); font-size: 0.7rem; font-family: 'JetBrains Mono', monospace; }
  .spec-value.price { color: var(--green); font-weight: 600; }
  .skill-endpoint { background: rgba(0,0,0,0.3); border-radius: 6px; padding: 0.4rem 0.75rem; margin-bottom: 0.75rem; }
  .skill-endpoint code { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: var(--cyan); }
  .skill-revenue { position: relative; height: 22px; background: rgba(0,0,0,0.3); border-radius: 4px; overflow: hidden; }
  .revenue-bar { position: absolute; top: 0; left: 0; height: 100%; background: linear-gradient(90deg, var(--cyan), var(--green)); opacity: 0.3; border-radius: 4px; }
  .revenue-text { position: relative; z-index: 1; font-size: 0.65rem; font-family: 'JetBrains Mono', monospace; color: var(--cyan); line-height: 22px; padding-left: 8px; font-weight: 500; }

  /* Integration */
  .integration-section { padding: 3rem 2rem; max-width: 1200px; margin: 0 auto; }
  .steps-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-bottom: 3rem; }
  .step-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; }
  .step-num { font-size: 2.5rem; font-weight: 700; font-family: 'JetBrains Mono', monospace; background: linear-gradient(135deg, var(--cyan), var(--green)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 0.5rem; }
  .step-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem; }
  .step-desc { color: var(--gray); font-size: 0.85rem; line-height: 1.5; margin-bottom: 1rem; }
  .step-code { background: rgba(0,0,0,0.4); border-radius: 8px; padding: 0.75rem 1rem; }
  .step-code code { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--cyan); line-height: 1.6; }

  /* API Docs Table */
  .api-docs { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; }
  .docs-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; }
  .docs-table-wrap { overflow-x: auto; }
  .docs-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
  .docs-table th { text-align: left; padding: 0.6rem 1rem; color: var(--cyan); font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; font-weight: 600; letter-spacing: 0.05em; border-bottom: 1px solid var(--border); text-transform: uppercase; }
  .docs-table td { padding: 0.5rem 1rem; color: var(--gray); border-bottom: 1px solid rgba(30,41,59,0.5); }
  .docs-table td code { font-family: 'JetBrains Mono', monospace; color: var(--green); font-size: 0.75rem; }
  .docs-table tr:hover td { color: var(--white); background: rgba(0,210,211,0.03); }

  /* Footer */
  .x402-footer { border-top: 1px solid var(--border); padding: 1.5rem 2rem; text-align: center; font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; }
  .footer-status { color: var(--gray-dark); margin-bottom: 0.5rem; letter-spacing: 0.05em; }
  .footer-meta { color: var(--gray-dark); margin-bottom: 0.75rem; }
  .footer-links { display: flex; justify-content: center; gap: 0.75rem; align-items: center; }
  .footer-links a { color: var(--cyan); text-decoration: none; }
  .footer-links a:hover { text-decoration: underline; }
  .footer-links span { color: var(--gray-dark); }
  .mono { color: var(--gray-dark); }
  .green { color: var(--green); }

  /* Responsive */
  @media (max-width: 1024px) {
    .hero { grid-template-columns: 1fr; }
    .skills-grid { grid-template-columns: repeat(2, 1fr); }
    .stats-grid { grid-template-columns: repeat(3, 1fr); }
  }
  @media (max-width: 640px) {
    .hero-title { font-size: 1.75rem; }
    .skills-grid { grid-template-columns: 1fr; }
    .steps-grid { grid-template-columns: 1fr; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .tech-bar { gap: 1rem; }
    .x402-header { flex-direction: column; gap: 0.5rem; }
    .logo-sub { display: none; }
  }
</style>
