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
    // 逻辑保持不变：只支持 5s 和 10s.
    const { duration = 5 } = params;

    // 官方 10s 成本 $0.45 -> 设置为 $0.90 (x2)
    if (duration >= 10) return 0.9;

    // 官方 5s 成本 $0.30 -> 设置为 $0.60 (x2)
    return 0.6;
  }

  return 0.0001;
};
