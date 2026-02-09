<script lang="ts">
  import { onDestroy } from 'svelte';

  export let active = false;

  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let raf = 0;
  let running = false;

  type Particle = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    rot: number;
    vr: number;
    life: number; // 0..1
    decay: number;
    shape: 'rect' | 'circle';
    hue: number;
    alpha: number;
  };

  let particles: Particle[] = [];

  const rand = (min: number, max: number) => min + Math.random() * (max - min);

  function resizeCanvas() {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx = canvas.getContext('2d');
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawParticles() {
    if (!canvas || !ctx) return;

    // 尾迹
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    const gravity = 0.12;
    const drag = 0.992;

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      p.vx *= drag;
      p.vy = p.vy * drag + gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;

      p.life -= p.decay;
      if (p.life <= 0 || p.y > window.innerHeight + 80) {
        particles.splice(i, 1);
        continue;
      }

      const flicker = 0.85 + Math.sin((1 - p.life) * 10 + p.hue) * 0.12;
      const a = Math.max(0, p.life) * p.alpha * flicker;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);

      ctx.fillStyle = `hsla(${p.hue}, 95%, 60%, ${a})`;
      if (p.shape === 'rect') {
        ctx.fillRect(-p.size * 0.6, -p.size * 0.2, p.size * 1.2, p.size * 0.5);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (particles.length === 0) {
      stop();
      return;
    }
    raf = requestAnimationFrame(drawParticles);
  }

  function start() {
    if (running) return;
    running = true;
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    ctx?.clearRect(0, 0, window.innerWidth, window.innerHeight);
    raf = requestAnimationFrame(drawParticles);
  }

  function stop() {
    running = false;
    window.removeEventListener('resize', resizeCanvas);
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (ctx) ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    particles = [];
  }

  /** 给父组件调用：一次爆炸 */
  export function burst(x: number, y: number, baseHue?: number) {
    start();

    const bursts = [
      { count: 80, speed: [3.5, 8.5], size: [3, 6], decay: [0.012, 0.018] },
      { count: 60, speed: [2.2, 6.0], size: [2, 5], decay: [0.015, 0.022] },
      { count: 40, speed: [1.6, 4.2], size: [2, 4], decay: [0.02, 0.03] },
    ];

    const hue0 = baseHue ?? rand(90, 150);
    for (const b of bursts) {
      for (let i = 0; i < b.count; i++) {
        const a = rand(0, Math.PI * 2);
        const sp = rand(b.speed[0], b.speed[1]);
        const hue = (hue0 + rand(-40, 40) + rand(0, 360) * 0.08) % 360;

        particles.push({
          x: x + rand(-10, 10),
          y: y + rand(-10, 10),
          vx: Math.cos(a) * sp + rand(-0.6, 0.6),
          vy: Math.sin(a) * sp - rand(1.0, 3.0),
          size: rand(b.size[0], b.size[1]),
          rot: rand(0, Math.PI * 2),
          vr: rand(-0.25, 0.25),
          life: 1,
          decay: rand(b.decay[0], b.decay[1]),
          shape: Math.random() > 0.28 ? 'rect' : 'circle',
          hue,
          alpha: rand(0.85, 1),
        });
      }
    }

    // 最大时长兜底
    setTimeout(() => stop(), 2600);
  }

  $: if (!active) {
    // 父组件让它隐藏时也停掉
    stop();
  }

  onDestroy(() => stop());
</script>

<canvas
  bind:this={canvas}
  class="pointer-events-none fixed inset-0 z-[999999] {active ? 'opacity-100' : 'opacity-0'} transition-opacity"
/>
