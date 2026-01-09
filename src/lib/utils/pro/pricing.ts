// src/lib/utils/pro/pricing.ts

const PIKA_RATES = {
  '720p': 0.05,
  '1080p': 0.075,
};

const SAM_RATE = 0.0125;

export const calculateCost = (model: string, params: any): number => {
  // === Pika ===
  // if (model.includes('pika')) {
  //   const { resolution = '720p', duration = 0 } = params;
  //   const billableDuration = Math.max(duration, 5);
  //   const rate = PIKA_RATES[resolution] || 0.05;
  //   return Number((billableDuration * rate).toFixed(5));
  // }

  // // === Sam ===
  // if (model.includes('sam')) {
  //   const { duration = 5 } = params;
  //   const billableDuration = Math.max(5, Math.min(duration, 600));
  //   return Number((billableDuration * SAM_RATE).toFixed(5));
  // }

  // // === Wan 2.1 ===
  // if (model.includes('wan')) {
  //   // 文档只支持 5s 和 10s
  //   // 用户必须在界面上手选 5 或 10，不能随意填
  //   const { duration = 5 } = params;

  //   if (duration >= 10) return 0.5625; // 10s 价格 ($0.45 * 1.25)
  //   return 0.375; // 5s 价格 ($0.30 * 1.25)
  // }

  return 0.0001;
};
