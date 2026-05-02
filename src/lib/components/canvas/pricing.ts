/**
 * Canvas pricing — per-block, per-model, with 2× markup over WaveSpeed.
 *
 * Convention: 1 cr = 1 DLP whole token = $0.001 USD.
 * So 1 USDT = 1000 cr = 1000 DLP.
 *
 * All numbers below are derived from `backend/apps/web/ai/wave.py` `amounts`
 * × 2 (100% markup) × 1000 (USD → cr). When wave.py changes, this file
 * needs to update — there's a mirror server-side in canvas.py.
 */

type BlockConfig = Record<string, any>;

// Videogen: cr per (model, resolution-bucket, duration-bucket).
// We pick the closest available duration tier in the source price table.
const VIDEOGEN_CR: Record<string, (cfg: BlockConfig) => number> = {
	'happyhorse-1.0': (cfg) => {
		const r = cfg.resolution || '720p';
		const d = Number(cfg.duration ?? 5);
		// Source: 720p/5s = $0.75, 720p/8s = $1.20, 1080p/5s = $1.50, 1080p/8s = $2.40.
		if (r.startsWith('1080')) return d >= 7 ? 4800 : 3000;
		return d >= 7 ? 2400 : 1500;
	},
	'wan-2.7': (cfg) => {
		const r = cfg.resolution || '720p';
		const d = Number(cfg.duration ?? 5);
		if (r.startsWith('480')) return d >= 8 ? 1500 : 750;
		if (r.startsWith('1080')) return d >= 8 ? 4500 : 2250;
		return d >= 8 ? 3000 : 1500; // 720p
	},
	'ovi': () => 450,                                      // 540p/5s = $0.225
	'veo3.1': (cfg) => {
		const d = Number(cfg.duration ?? 4);
		if (d >= 8) return 9600;
		if (d >= 6) return 7200;
		return 4800; // 4s
	},
	'ltx-2.3': (cfg) => {
		const d = Number(cfg.duration ?? 6);
		if (d >= 10) return 1800;
		if (d >= 8) return 1440;
		return 1080; // 6s
	},
	'hailuo-2.3': (cfg) => (Number(cfg.duration ?? 6) >= 10 ? 1680 : 690),
	'seedance-2.0': (cfg) => {
		const d = Number(cfg.duration ?? 6);
		if (d >= 12) return 1200;
		if (d >= 9) return 900;
		return 600; // 6s
	},
	'kling-3.0': (cfg) => (Number(cfg.duration ?? 5) >= 10 ? 8400 : 4200),
	'pixverse-v6': (cfg) => (Number(cfg.duration ?? 5) >= 8 ? 2400 : 1200),
	'luma-ray-2': (cfg) => (Number(cfg.duration ?? 5) >= 10 ? 3000 : 1500),
	'vidu-q3': (cfg) => (Number(cfg.duration ?? 4) >= 8 ? 1600 : 800)
};

// Imagegen: gpt-image-2 base $0.06 × 2 × 1000 = 120 cr at 1k medium.
const IMAGEGEN_CR: Record<string, (cfg: BlockConfig) => number> = {
	'gpt-image-2': (cfg) => {
		const r = cfg.resolution || '1k';
		const q = cfg.quality || 'medium';
		// Base table: 1k {low: $0.01, med: $0.06, high: $0.22}, 2k 2x, 4k 3x.
		const baseUSD = q === 'low' ? 0.01 : q === 'high' ? 0.22 : 0.06;
		const mult = r === '4k' ? 3 : r === '2k' ? 2 : 1;
		return Math.round(baseUSD * mult * 2 * 1000);
	},
	'nano-banana-2': (cfg) => {
		const r = cfg.resolution || '1k';
		const baseUSD = 0.06; // assumed similar tier
		const mult = r === '4k' ? 3 : r === '2k' ? 2 : 1;
		return Math.round(baseUSD * mult * 2 * 1000);
	},
	'seedream-v5-lite': (cfg) => {
		const r = cfg.resolution || '1k';
		const baseUSD = 0.04;
		const mult = r === '4k' ? 3 : r === '2k' ? 2 : 1;
		return Math.round(baseUSD * mult * 2 * 1000);
	},
	'flux-dev': () => 100 // legacy stub, free placeholder cost
};

export function blockCostCr(typeKey: string, config: BlockConfig = {}): number {
	if (typeKey === 'imageref' || typeKey === 'prompt' || typeKey === 'stitcher') return 0;
	if (typeKey === 'voice') return 200;
	if (typeKey === 'videogen') {
		const m = config.model || 'happyhorse-1.0';
		const fn = VIDEOGEN_CR[m];
		return fn ? fn(config) : 1500;
	}
	if (typeKey === 'imagegen') {
		const m = config.model || 'gpt-image-2';
		const fn = IMAGEGEN_CR[m];
		return fn ? fn(config) : 100;
	}
	return 0;
}
