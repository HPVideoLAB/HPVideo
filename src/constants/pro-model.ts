export type ProModelEntry = {
  name: string;
  model: string;
  modelicon: string;
  audio: boolean;
  desc: string;
  /** Short colored chips on the model card. Order matters (most distinctive first). */
  badges?: string[];
  /** "Best for ..." tagline shown under the description. */
  bestFor?: string;
};

// `desc` is a fallback for when the i18n key model_desc_<model> is not
// loaded yet. Keep this English; the localized version lives in
// src/lib/i18n/locales/<locale>/translation.json under the same key.
export const proModel: ProModelEntry[] = [
  {
    name: 'Text to Video',
    model: 'text-to-video',
    modelicon: '/creator/static/icon/qwen.png',
    audio: true,
    desc: '10 frontier T2V models in one place: WAN 2.7, Veo 3.1, Kling 3.0, Hailuo, Seedance, LTX, Pixverse, Luma Ray 2, Vidu Q3, OVI.',
    badges: ['10 models', 'T2V', 'I2V'],
    bestFor: 'best_for_t2v',
  },
  {
    name: 'Make an Ad',
    model: 'commercial-pipeline',
    modelicon: '/creator/icon/wan.png',
    audio: true,
    desc: 'AI-directed commercial: smart shots + lip-sync voiceover + 4K upscale, in one click.',
    badges: ['Audio', '4K', 'Lip-sync'],
    bestFor: 'best_for_commercial',
  },
  {
    name: 'Pika V2.2 Pikaframes',
    model: 'pika-v2.2-pikaframes',
    modelicon: '/creator/icon/pika.png',
    audio: false,
    desc: 'Multi-keyframe image-to-video with custom transitions for smooth, continuous animation.',
    badges: ['Multi-keyframe', 'I2V'],
    bestFor: 'best_for_pika',
  },
  {
    name: 'SAM3 Video',
    model: 'sam3-video',
    modelicon: '/creator/icon/sam.png',
    audio: false,
    desc: 'Smart video editing: precisely segment, remove, or replace specific objects in a clip.',
    badges: ['Edit', 'Open-source'],
    bestFor: 'best_for_sam',
  },
  {
    name: 'WAN 2.1 V2V',
    model: 'wan-2.1-v2v',
    modelicon: '/creator/static/icon/qwen.png',
    audio: false,
    desc: 'Video style transfer: keep the original motion rhythm while restyling the look and lighting.',
    badges: ['Style transfer', 'V2V'],
    bestFor: 'best_for_wan_v2v',
  },
];

// 模型对应预估生成时间 (保持不变)
export const modelDuration = {
  pika: '5-10',
  'wan-2.1': '1-5',
  sam3: '1-5',
  commercial: '5-10',
};
