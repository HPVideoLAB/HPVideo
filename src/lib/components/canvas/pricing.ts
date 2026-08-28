/**
 * Canvas pricing — per-block, per-model, with 1.1× markup over WaveSpeed.
 *
 * Convention: 1 cr = 1 DLP whole token = $0.001 USD.
 * So 1 USDT = 1000 cr = 1000 DLP.
 *
 * All numbers below are derived from `backend/apps/web/ai/wave.py` `amounts`
 * × 1.1 (10% markup) × 1000 (USD → cr). When wave.py changes, this file
 * needs to update — there's a mirror server-side in canvas.py.
 * (Markup unified 2×→1.1× on 2026-08-28; generation now runs on the cheapest
 * source (Atlas/WaveSpeed), so real margin exceeds 10%.)
 */

type BlockConfig = Record<string, any>;

// Videogen: cr per (model, resolution-bucket, duration-bucket).
// We pick the closest available duration tier in the source price table.
const VIDEOGEN_CR: Record<string, (cfg: BlockConfig) => number> = {
	'happyhorse-1.0': (cfg) => {
		// HappyHorse 1.1: $0.14/s @720p, $0.189/s @1080p → cr/s = raw$/s × 1100.
		const r = cfg.resolution || '720p';
		const d = Number(cfg.duration ?? 5);
		return (r.startsWith('1080') ? 208 : 154) * d;
	},
	'wan-2.7': (cfg) => {
		// WAN 3.0: $0.05/s@480, $0.10/s@720, $0.20/s@1080 → cr/s = raw$/s × 1100.
		const r = cfg.resolution || '720p';
		const d = Number(cfg.duration ?? 5);
		return (r.startsWith('1080') ? 220 : r.startsWith('480') ? 55 : 110) * d;
	},
	'ovi': () => 248,                                      // 540p/5s = $0.225
	'veo3.1': (cfg) => {
		const d = Number(cfg.duration ?? 4);
		if (d >= 8) return 5280;
		if (d >= 6) return 3960;
		return 2640; // 4s
	},
	'ltx-2.3': (cfg) => {
		const d = Number(cfg.duration ?? 6);
		if (d >= 10) return 990;
		if (d >= 8) return 792;
		return 594; // 6s
	},
	'hailuo-2.3': (cfg) => 110 * Number(cfg.duration ?? 6),   // MiniMax H3 768p: $0.10/s
	'seedance-2.0': (cfg) => 396 * Number(cfg.duration ?? 6), // Seedance 2.5 720p: $0.36/s
	'kling-3.0': (cfg) => 92 * Number(cfg.duration ?? 5),     // Kling O3 Std: $0.084/s
	'pixverse-v6': (cfg) => (Number(cfg.duration ?? 5) >= 8 ? 1320 : 660),
	'luma-ray-2': (cfg) => (Number(cfg.duration ?? 5) >= 10 ? 1650 : 825),
	'vidu-q3': (cfg) => (Number(cfg.duration ?? 4) >= 8 ? 880 : 440)
};

// Imagegen: gpt-image-2 base $0.06 × 1.1 × 1000 = 66 cr at 1k medium.
const IMAGEGEN_CR: Record<string, (cfg: BlockConfig) => number> = {
	'gpt-image-2': (cfg) => {
		const r = cfg.resolution || '1k';
		const q = cfg.quality || 'medium';
		// Base table: 1k {low: $0.01, med: $0.06, high: $0.22}, 2k 2x, 4k 3x.
		const baseUSD = q === 'low' ? 0.01 : q === 'high' ? 0.22 : 0.06;
		const mult = r === '4k' ? 3 : r === '2k' ? 2 : 1;
		return Math.round(baseUSD * mult * 1.1 * 1000);
	},
	'nano-banana-2': (cfg) => {
		const r = cfg.resolution || '1k';
		const baseUSD = 0.06; // assumed similar tier
		const mult = r === '4k' ? 3 : r === '2k' ? 2 : 1;
		return Math.round(baseUSD * mult * 1.1 * 1000);
	},
	'seedream-v5-lite': (cfg) => {
		const r = cfg.resolution || '1k';
		const baseUSD = 0.04;
		const mult = r === '4k' ? 3 : r === '2k' ? 2 : 1;
		return Math.round(baseUSD * mult * 1.1 * 1000);
	},
	'flux-dev': () => 55 // legacy stub, free placeholder cost
};

export function blockCostCr(typeKey: string, config: BlockConfig = {}): number {
	if (typeKey === 'imageref' || typeKey === 'prompt' || typeKey === 'stitcher') return 0;
	if (typeKey === 'voice') return 200;
	if (typeKey === 'videogen') {
		const m = config.model || 'happyhorse-1.0';
		const fn = VIDEOGEN_CR[m];
		return fn ? fn(config) : 825;
	}
	if (typeKey === 'imagegen') {
		const m = config.model || 'gpt-image-2';
		const fn = IMAGEGEN_CR[m];
		return fn ? fn(config) : 55;
	}
	return 0;
}
