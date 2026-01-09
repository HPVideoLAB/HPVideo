export const proModel = [
  {
    name: 'Pika V2.2 Pikaframes',
    model: 'pika-v2.2-pikaframes',
    modelicon: '/icon/pika.png',
    audio: false,
    // 精简后：强调核心机制（多图关键帧 + 转场）
    desc: '多关键帧图生视频：支持自定义转场，生成连贯流畅的动画。',
  },
  {
    name: 'SAM3 Video',
    model: 'sam3-video',
    modelicon: '/icon/sam.png',
    audio: false,
    // 精简后：强调核心功能（移除/替换对象）
    desc: '视频智能编辑：精准分割、移除或替换画面中的特定对象。',
  },
  {
    name: 'WAN 2.1 V2V',
    model: 'wan-2.1-v2v',
    modelicon: '/icon/qwen.png',
    audio: false,
    // 精简后：强调核心优势（保持动作 + 改风格）
    desc: '视频风格迁移：保持原动作节奏，重绘画面风格与光影',
  },
];

// 模型对应预估生成时间 (保持不变)
export const modelDuration = {
  pika: '5-10',
  'wan-2.1': '1-5',
  sam3: '1-5',
};
