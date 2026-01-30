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

// === Wan 2.6 官方成本 ===
// 720p:  $0.10/s  -> x2 = $0.20/s
// 1080p: $0.15/s  -> x2 = $0.30/s
const WAN_26_RATES = {
  '720p': 0.2,
  '1080p': 0.3,
};

// === Video Upscaler Pro 官方成本 ===
// 2K: $0.04/s -> x2 = $0.08/s
// 4K: $0.05/s -> x2 = $0.10/s
const UPSCALE_RATES = {
  '2k': 0.08,
  '4k': 0.1,
};

export const calculateCost = (model: string, params: any): number => {
  // // === Pika ===
  // if (model.includes('pika')) {
  //   const { resolution = '720p', duration = 0 } = params;
  //   // 逻辑保持不变：不足 5s 按 5s 算
  //   const billableDuration = Math.max(duration, 5);
  //   const rate = PIKA_RATES[resolution] || 0.08;
  //   return Number((billableDuration * rate).toFixed(5));
  // }

  // // === Sam ===
  // if (model.includes('sam')) {
  //   const { duration = 5 } = params;
  //   // 逻辑保持不变：5s ~ 600s
  //   const billableDuration = Math.max(5, Math.min(duration, 600));
  //   return Number((billableDuration * SAM_RATE).toFixed(5));
  // }

  // // === Wan 2.1 ===
  // if (model.includes('wan')) {
  //   // 逻辑保持不变：只支持 5s 和 10s
  //   const { duration = 5 } = params;

  //   // 官方 10s 成本 $0.45 -> 设置为 $0.90 (x2)
  //   if (duration >= 10) return 0.9;

  //   // 官方 5s 成本 $0.30 -> 设置为 $0.60 (x2)
  //   return 0.6;
  // }

  // // === Commercial Pipeline (Wan 2.6 + Upscaler) ===
  // if (model.includes('commercial')) {
  //   const { duration = 15, enableUpscale = '1080p' } = params;
  //   // enableUpscale 的值可能是: '720p' | '1080p' | '2k' | '4k' | 'default'

  //   let baseRate = WAN_26_RATES['1080p']; // 默认基础费率 (1080p)
  //   let upscaleRate = 0; // 默认没有超分费

  //   // 1. 根据档位决定基础费率和超分费率
  //   switch (enableUpscale) {
  //     case '720p':
  //       // 极速版：只收 720p 的钱
  //       baseRate = WAN_26_RATES['720p']; // $0.20
  //       upscaleRate = 0;
  //       break;

  //     case '1080p':
  //     case 'default':
  //       // 高清版：收 1080p 的钱
  //       baseRate = WAN_26_RATES['1080p']; // $0.30
  //       upscaleRate = 0;
  //       break;

  //     case '2k':
  //       // 超分版：基础生成必用 1080p (底子好超分才好) + 2K 超分费
  //       baseRate = WAN_26_RATES['1080p']; // $0.30
  //       upscaleRate = UPSCALE_RATES['2k']; // +$0.08
  //       break;

  //     case '4k':
  //       // 影院版：基础生成必用 1080p + 4K 超分费
  //       baseRate = WAN_26_RATES['1080p']; // $0.30
  //       upscaleRate = UPSCALE_RATES['4k']; // +$0.10
  //       break;
  //   }

  //   // 2. 计算总价
  //   const totalCost = duration * (baseRate + upscaleRate);

  //   // 保留 3 位小数
  //   return Number(totalCost.toFixed(3));
  // }

  return 0.0001;
};
