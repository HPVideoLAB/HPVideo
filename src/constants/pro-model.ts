export const proModel = [
  //       Pika V2.2 Pikaframes (图片生成视频)	https://wavespeed.ai/models/pika/v2.2-pikaframes
  // SAM3 Video (替换/删除视频内容)	https://wavespeed.ai/models/wavespeed-ai/sam3-video
  // WAN 2.1 V2V (视频风格迁移与编辑)	https://wavespeed.ai/blogs/index.php/2025/12/10/wan-2-1-v2v-now-live-on-wavespeedai-a-powerful-visual-generation-model
  // ===== Add these 3 models at the end of `models: []` =====
  // ===== Add these 3 models at the end of `models: []` =====

  // ===== Add these 3 models at the end of `models: []` =====
  {
    // 下拉列表展示名（最终会变成 label）
    name: 'Pika V2.2 Pikaframes',

    // 来源标识（可用于分组/统计；UI 不强依赖）
    source: 'pika',

    // 关键：模型 ID（会进入 chat.models[]，后端也通常用它做路由）
    model: 'pika-v2.2-pikaframes',

    // 你前端沿用的“文本/图片能力”字段：这里 Pikaframes 本质是 image->video
    // 建议填 WaveSpeed 的 model_uuid（后端更好映射）
    textmodel: 'pika/pika-v2.2-pikaframes',
    imagemodel: 'pika/pika-v2.2-pikaframes',

    // 是否带音频（你 UI 会在 audio=false 时显示静音 icon）
    audio: true,

    // 可选时长档位（你的 toolInfo.duration 会用）
    // Pikaframes 通过 transitions 可以做到更长，总长度可到 ~25s（WaveSpeed 模型页/README 有提）
    duration: [5, 25],

    // 价格档位：key 通常跟分辨率/尺寸相关；你们目前是展示 + 支付用
    // 这里先给一个示例（你后续可以按 WaveSpeed 的计费细化到不同 resolution/length）
    amount: { '720p': [0.00001], '1080p': [0.00001] },

    // UI 给用户选的“分辨率/尺寸”集合（你的 toolInfo.size 会用）
    // WaveSpeed 参数叫 resolution，常见是 720p / 1080p
    size: ['720p', '1080p'],

    // 下拉列表里展示的短标签（你 UI 显示 item.info.tip）
    tip: 'Pika Pikaframes',

    // 输入类型：这个模型需要“图片关键帧”（image -> video）
    support: 'image',

    // 分类：你当前 UI 用 type=1 做一类筛选
    type: 1,

    // 描述：你 UI 用 i18n.t() 展示
    desc: '关键帧图片生成视频：多张关键帧 + 分段提示词，生成连贯的视频',

    // 图标：你准备好 logo 后换成对应 png
    modelicon: '/icon/pika.png',

    // 建议：放真正的后端调用标识（WaveSpeed model_uuid）
    modelinfo: 'pika/pika-v2.2-pikaframes',
  },
  {
    name: 'SAM3 Video',
    source: 'wavespeed-ai',
    model: 'sam3-video',

    // SAM3 是视频编辑（video in/out），严格来说不是 textmodel/imagemodel，但你结构固定就沿用
    textmodel: 'wavespeed-ai/sam3-video',
    imagemodel: 'wavespeed-ai/sam3-video',

    audio: true,

    // 你 UI 以档位形式展示时长；SAM3 编辑类一般不太按这个选项限制，先给常用档位
    duration: [5, 10, 30, 60],

    // 价格示例（你按自己产品策略调整）
    amount: { '*': [0.05, 0.1, 0.3, 0.6] },

    // 编辑类通常不靠 size 选择，这里用 '*' 占位（避免 UI 报错）
    size: ['*'],

    tip: 'SAM3 Video',

    // 输入类型：需要用户上传“视频”（video edit）
    support: 'video',

    type: 1,

    desc: '视频内容编辑（替换/删除/清理等）：支持 prompt + 可选 apply_mask 限定编辑区域',

    modelicon: '/icon/sam.png',
    modelinfo: 'wavespeed-ai/sam3-video',
  },
  {
    name: 'WAN 2.1 V2V',
    source: 'wavespeed-ai',
    model: 'wan-2.1-v2v',

    // WAN 2.1 V2V 是 video->video（风格迁移/编辑）
    textmodel: 'wavespeed-ai/wan-2.1/v2v-480p-ultra-fast',
    imagemodel: 'wavespeed-ai/wan-2.1/v2v-480p-ultra-fast',

    audio: false,

    // WaveSpeed 这条 v2v 文档常见是 5~10s；你 UI 先给 5 起步最稳
    duration: [5],

    // 价格示例（按你产品策略调整）
    amount: { '480p': [0.125] },

    // 这条是 480p ultra fast（按文档命名）
    size: ['480p'],

    tip: 'WAN 2.1 V2V',
    support: 'video',
    type: 1,

    desc: '视频风格迁移/视频到视频编辑（V2V 480p Ultra-Fast）',

    modelicon: '/icon/qwen.png',
    modelinfo: 'wavespeed-ai/wan-2.1/v2v-480p-ultra-fast',
  },
];
