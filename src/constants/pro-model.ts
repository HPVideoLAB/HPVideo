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

export const proModel: ProModelEntry[] = [
  {
    name: 'Commercial Video',
    model: 'commercial-pipeline',
    modelicon: '/creator/icon/wan.png',
    audio: true,
    desc: 'AI 导演生成的商业级短视频，支持智能运镜与口型同步。',
    badges: ['Audio', '4K', 'Lip-sync'],
    bestFor: 'best_for_commercial',
  },
  {
    name: 'Pika V2.2 Pikaframes',
    model: 'pika-v2.2-pikaframes',
    modelicon: '/creator/icon/pika.png',
    audio: false,
    desc: '多关键帧图生视频：支持自定义转场，生成连贯流畅的动画。',
    badges: ['Multi-keyframe', 'I2V'],
    bestFor: 'best_for_pika',
  },
  {
    name: 'SAM3 Video',
    model: 'sam3-video',
    modelicon: '/creator/icon/sam.png',
    audio: false,
    desc: '视频智能编辑：精准分割、移除或替换画面中的特定对象。',
    badges: ['Edit', 'Open-source'],
    bestFor: 'best_for_sam',
  },
  {
    name: 'WAN 2.1 V2V',
    model: 'wan-2.1-v2v',
    modelicon: '/creator/static/icon/qwen.png',
    audio: false,
    desc: '视频风格迁移：保持原动作节奏，重绘画面风格与光影',
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
