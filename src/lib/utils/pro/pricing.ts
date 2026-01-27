// src/lib/utils/pro/pricing.ts

// Pika 官方成本: 720p($0.04), 1080p($0.06)
// 设置为成本的 2 倍
const PIKA_RATES = {
  '720p': 0.08, // 0.04 * 2
  '1080p': 0.12, // 0.06 * 2
};

// Sam 官方成本: $0.01/s
// 设置为成本的 2 倍
const SAM_RATE = 0.02; // 0.01 * 2
// === Wan 2.6 (1080p) ===
// 官方: $0.75 / 5s = $0.15/s
// 设置为成本的 2 倍: $0.30/s
const WAN_1080P_RATE_PER_SEC = 0.3;

// === Video Upscaler Pro ===
// 官方 2K: $0.20 / 5s = $0.04/s -> x2 = $0.08/s
// 官方 4K: $0.25 / 5s = $0.05/s -> x2 = $0.10/s
const UPSCALE_RATES = {
  '2k': 0.08,
  '4k': 0.1,
};

export const calculateCost = (model: string, params: any): number => {
  // === Pika ===
  if (model.includes('pika')) {
    const { resolution = '720p', duration = 0 } = params;
    // 逻辑保持不变：不足 5s 按 5s 算
    const billableDuration = Math.max(duration, 5);
    const rate = PIKA_RATES[resolution] || 0.08;
    return Number((billableDuration * rate).toFixed(5));
  }

  // === Sam ===
  if (model.includes('sam')) {
    const { duration = 5 } = params;
    // 逻辑保持不变：5s ~ 600s
    const billableDuration = Math.max(5, Math.min(duration, 600));
    return Number((billableDuration * SAM_RATE).toFixed(5));
  }

  // === Wan 2.1 ===
  if (model.includes('wan')) {
    // 逻辑保持不变：只支持 5s 和 10s
    const { duration = 5 } = params;

    // 官方 10s 成本 $0.45 -> 设置为 $0.90 (x2)
    if (duration >= 10) return 0.9;

    // 官方 5s 成本 $0.30 -> 设置为 $0.60 (x2)
    return 0.6;
  }

  // === Commercial Pipeline (新增修正版) ===
  if (model.includes('commercial')) {
    const { duration = 5, enableUpscale = 'default' } = params;

    // 1. 基础视频生成费用 (Wan 2.6 1080p)
    // 算法: 时长 * 单价
    let totalCost = duration * WAN_1080P_RATE_PER_SEC;

    // 2. 超分费用 (Upscaler)
    // 只有当用户选择了 2k 或 4k 时才叠加费用
    if (enableUpscale === '2k') {
      totalCost += duration * UPSCALE_RATES['2k'];
    } else if (enableUpscale === '4k') {
      totalCost += duration * UPSCALE_RATES['4k'];
    }

    // 保留 3 位小数 (例如 15s + 4K = 4.5 + 1.5 = $6.000)
    return Number(totalCost.toFixed(3));
  }

  return 0.0001;
};
