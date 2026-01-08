import { promptTemplate } from '$lib/utils';
import { WEBUI_API_BASE_URL, DEGPT_API_BASE_URL } from '$lib/constants';

// 获取De的所有模型列表
export const getDeModels = async (token: string = '') => {
  const format_res = {
    models: [
      // 基础模型
      {
        name: 'WAN 2.5',
        source: 'alibaba',
        model: 'wan-2.5',
        textmodel: 'wan-2.5/text-to-video',
        imagemodel: 'wan-2.5/image-to-video',
        audio: true,
        duration: [5, 10],
        amount: { '480': [0.00001, 0.00001], '720': [0.75, 1.5], '1080': [1.125, 2.25] },
        size: ['480*832', '832*480', '720*1280', '1280*720', '1080*1920', '1920*1080'],
        tip: 'WAN 2.5',
        support: 'image',
        type: 1,
        desc: 'Multi-resolution with synchronized audio and video generation',
        modelicon: '/creator/static/icon/qwen.png',
        modelinfo: '',
      },
      {
        name: 'SORA 2',
        source: 'openai',
        model: 'sora-2',
        textmodel: 'sora-2/text-to-video',
        imagemodel: 'sora-2/image-to-video',
        audio: true,
        duration: [4, 8, 12],
        amount: { '720': [0.45, 1.35, 2.7] },
        size: ['720*1280', '1280*720'],
        tip: 'SORA 2',
        support: 'image',
        type: 1,
        desc: 'Physically accurate, synchronized audio and video',
        modelicon: '/creator/static/icon/gpt3.png',
        modelinfo: '',
      },
      {
        name: 'OVI',
        source: 'character-ai',
        model: 'ovi',
        textmodel: 'ovi/text-to-video',
        imagemodel: 'ovi/image-to-video',
        audio: true,
        duration: [5],
        amount: { '540': [0.225] },
        size: ['540*960', '960*540'],
        tip: 'OVI',
        support: 'image',
        type: 1,
        desc: 'Strong comprehension, generates precise videos',
        modelicon: '/creator/static/icon/gemini.png',
        modelinfo: '',
      },
      {
        name: 'VEO 3.1',
        source: 'google',
        model: 'veo3.1',
        textmodel: 'veo3.1/text-to-video',
        imagemodel: 'veo3.1/image-to-video',
        audio: true,
        duration: [4, 6, 8],
        amount: { '*': [2.4, 3.6, 4.8] },
        size: ['9:16', '16:9'],
        tip: 'VEO 3.1',
        support: 'image',
        type: 1,
        desc: 'High-quality long videos with smooth visual coherence',
        modelicon: '/creator/static/icon/gemini.png',
        modelinfo: '',
      },
      {
        name: 'LTX 2 PRO',
        source: 'lightricks',
        model: 'ltx-2-pro',
        textmodel: 'ltx-2-pro/text-to-video',
        imagemodel: 'ltx-2-pro/image-to-video',
        audio: false,
        duration: [6, 8, 10],
        amount: { '*': [0.54, 0.72, 0.9] },
        size: ['1920*1080'],
        tip: 'LTX 2 PRO',
        support: 'image',
        type: 1,
        desc: 'Realistic details and smooth motion',
        modelicon: '/creator/static/icon/ltx.png',
        modelinfo: '',
      },
      {
        name: 'HAILUO 02',
        source: 'minimax',
        model: 'hailuo-02',
        textmodel: 'hailuo-02/t2v-standard',
        imagemodel: 'hailuo-02/i2v-standard',
        audio: false,
        duration: [6, 10],
        amount: { '*': [0.345, 0.84] },
        size: ['1366*768'],
        tip: 'HAILUO 02',
        support: 'image',
        type: 1,
        desc: 'Realistic rendering of dynamic scenes',
        modelicon: '/creator/static/icon/hailuo.png',
        modelinfo: '',
      },
      {
        name: 'SEEDANCE V1',
        source: 'bytedance',
        model: 'seedance',
        textmodel: 'seedance-v1-pro-t2v-480p',
        imagemodel: 'seedance-v1-pro-i2v-480p',
        audio: false,
        duration: [6, 9, 12],
        amount: { '*': [0.27, 0.405, 0.54] },
        size: ['3:4', '4:3', '9:16', '16:9', '21:9'],
        tip: 'SEEDANCE V1',
        support: 'image',
        type: 1,
        desc: 'Multi-shot narrative, stable and smooth visuals',
        modelicon: '/creator/static/icon/doubao.png',
        modelinfo: '',
      },
      {
        name: 'KLING V2.0',
        source: 'kwaivgi',
        model: 'kling',
        textmodel: 'kling-v2.0-t2v-master',
        imagemodel: 'kling-v2.0-i2v-master',
        audio: true,
        duration: [5, 10],
        amount: { '*': [1.95, 3.9] },
        size: ['9:16', '16:9'],
        tip: 'KLING V2.0',
        support: 'image',
        type: 1,
        desc: 'Accurate physical motion simulation',
        modelicon: '/creator/static/icon/kling.png',
        modelinfo: '',
      },
      {
        name: 'PIXVERSE V4.5',
        source: 'pixverse',
        model: 'pixverse',
        textmodel: 'pixverse-v4.5-t2v',
        imagemodel: 'pixverse-v4.5-i2v',
        audio: true,
        duration: [5, 8],
        amount: { '*': [0.525, 1.05] },
        size: ['3:4', '4:3', '9:16', '16:9'],
        tip: 'PIXVERSE V4.5',
        support: 'image',
        type: 1,
        desc: 'Fluid motion and lifelike details',
        modelicon: '/creator/static/icon/pixverse.png',
        modelinfo: '',
      },
      //       Pika V2.2 Pikaframes (图片生成视频)	https://wavespeed.ai/models/pika/v2.2-pikaframes
      // SAM3 Video (替换/删除视频内容)	https://wavespeed.ai/models/wavespeed-ai/sam3-video
      // WAN 2.1 V2V (视频风格迁移与编辑)	https://wavespeed.ai/blogs/index.php/2025/12/10/wan-2-1-v2v-now-live-on-wavespeedai-a-powerful-visual-generation-model
      // ===== Add these 3 models at the end of `models: []` =====
      // ===== Add these 3 models at the end of `models: []` =====

      // ===== Add these 3 models at the end of `models: []` =====
      // {
      //   // 下拉列表展示名（最终会变成 label）
      //   name: 'Pika V2.2 Pikaframes',

      //   // 来源标识（可用于分组/统计；UI 不强依赖）
      //   source: 'pika',

      //   // 关键：模型 ID（会进入 chat.models[]，后端也通常用它做路由）
      //   model: 'pika-v2.2-pikaframes',

      //   // 你前端沿用的“文本/图片能力”字段：这里 Pikaframes 本质是 image->video
      //   // 建议填 WaveSpeed 的 model_uuid（后端更好映射）
      //   textmodel: 'pika/pika-v2.2-pikaframes',
      //   imagemodel: 'pika/pika-v2.2-pikaframes',

      //   // 是否带音频（你 UI 会在 audio=false 时显示静音 icon）
      //   audio: true,

      //   // 可选时长档位（你的 toolInfo.duration 会用）
      //   // Pikaframes 通过 transitions 可以做到更长，总长度可到 ~25s（WaveSpeed 模型页/README 有提）
      //   duration: [5, 25],

      //   // 价格档位：key 通常跟分辨率/尺寸相关；你们目前是展示 + 支付用
      //   // 这里先给一个示例（你后续可以按 WaveSpeed 的计费细化到不同 resolution/length）
      //   amount: { '720p': [0.00001], '1080p': [0.00001] },

      //   // UI 给用户选的“分辨率/尺寸”集合（你的 toolInfo.size 会用）
      //   // WaveSpeed 参数叫 resolution，常见是 720p / 1080p
      //   size: ['720p', '1080p'],

      //   // 下拉列表里展示的短标签（你 UI 显示 item.info.tip）
      //   tip: 'Pika Pikaframes',

      //   // 输入类型：这个模型需要“图片关键帧”（image -> video）
      //   support: 'image',

      //   // 分类：你当前 UI 用 type=1 做一类筛选
      //   type: 1,

      //   // 描述：你 UI 用 i18n.t() 展示
      //   desc: '关键帧图片生成视频：多张关键帧 + 分段提示词，生成连贯的视频',

      //   // 图标：你准备好 logo 后换成对应 png
      //   modelicon: '/icon/pika.png',

      //   // 建议：放真正的后端调用标识（WaveSpeed model_uuid）
      //   modelinfo: 'pika/pika-v2.2-pikaframes',
      // },
      // {
      //   name: 'SAM3 Video',
      //   source: 'wavespeed-ai',
      //   model: 'sam3-video',

      //   // SAM3 是视频编辑（video in/out），严格来说不是 textmodel/imagemodel，但你结构固定就沿用
      //   textmodel: 'wavespeed-ai/sam3-video',
      //   imagemodel: 'wavespeed-ai/sam3-video',

      //   audio: true,

      //   // 你 UI 以档位形式展示时长；SAM3 编辑类一般不太按这个选项限制，先给常用档位
      //   duration: [5, 10, 30, 60],

      //   // 价格示例（你按自己产品策略调整）
      //   amount: { '*': [0.05, 0.1, 0.3, 0.6] },

      //   // 编辑类通常不靠 size 选择，这里用 '*' 占位（避免 UI 报错）
      //   size: ['*'],

      //   tip: 'SAM3 Video',

      //   // 输入类型：需要用户上传“视频”（video edit）
      //   support: 'video',

      //   type: 1,

      //   desc: '视频内容编辑（替换/删除/清理等）：支持 prompt + 可选 apply_mask 限定编辑区域',

      //   modelicon: '/icon/sam.png',
      //   modelinfo: 'wavespeed-ai/sam3-video',
      // },
      // {
      //   name: 'WAN 2.1 V2V',
      //   source: 'wavespeed-ai',
      //   model: 'wan-2.1-v2v',

      //   // WAN 2.1 V2V 是 video->video（风格迁移/编辑）
      //   textmodel: 'wavespeed-ai/wan-2.1/v2v-480p-ultra-fast',
      //   imagemodel: 'wavespeed-ai/wan-2.1/v2v-480p-ultra-fast',

      //   audio: false,

      //   // WaveSpeed 这条 v2v 文档常见是 5~10s；你 UI 先给 5 起步最稳
      //   duration: [5],

      //   // 价格示例（按你产品策略调整）
      //   amount: { '480p': [0.125] },

      //   // 这条是 480p ultra fast（按文档命名）
      //   size: ['480p'],

      //   tip: 'WAN 2.1 V2V',
      //   support: 'video',
      //   type: 1,

      //   desc: '视频风格迁移/视频到视频编辑（V2V 480p Ultra-Fast）',

      //   modelicon: '/icon/qwen.png',
      //   modelinfo: 'wavespeed-ai/wan-2.1/v2v-480p-ultra-fast',
      // },
    ],
  };
  return (format_res?.models ?? []).map((model) => ({
    id: model.model,
    name: model.name ?? model.model,
    ...model,
  }));
};

// AI Video Request Encapsulation
export const getDeOpenAIChatCompletion = async (token: string = '', body: Object) => {
  let res: any;
  let error = null;
  const controller = new AbortController();
  try {
    res = await fetch(`${WEBUI_API_BASE_URL}/chat/completion/video`, {
      signal: controller.signal,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...body,
        project: 'HPVideo',
      }),
    });
    if (res.status != 200) {
      throw new Error('error');
    }
  } catch (err) {
    error = err;
    res = null;
  }

  if (error) {
    throw error;
  }

  return [res, controller];
};

// AI Video Result Request Encapsulation
export const getDeOpenAIChatResult = async (token: string = '', body: Object) => {
  let res: any;
  let error = null;
  const controller = new AbortController();
  try {
    res = await fetch(`${WEBUI_API_BASE_URL}/chat/video/result`, {
      signal: controller.signal,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...body,
        project: 'HPVideo',
      }),
    });
    if (res.status != 200) {
      throw new Error('error');
    }
  } catch (err) {
    error = err;
    res = null;
  }

  if (error) {
    throw error;
  }

  return [res, controller];
};

// AI Video X402 Result Request Encapsulation
export const getX402DeOpenAIChatResult = async (token: string = '', body: Object) => {
  let res: any;
  let error = null;
  const controller = new AbortController();
  try {
    res = await fetch(`${WEBUI_API_BASE_URL}/chat/video/x402/result`, {
      signal: controller.signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...body,
      }),
    });
    if (res.status != 200) {
      throw new Error('error');
    }
  } catch (err) {
    error = err;
    res = null;
  }

  if (error) {
    throw error;
  }

  return [res, controller];
};

// Add a shorthand
export const generateDeTitle = async (token: string = '', template: string, model: string, prompt: string) => {
  let error = null;
  let res: any;
  template = promptTemplate(template, prompt);
  model = 'qwen3-235b-a22b';
  try {
    const result = await fetch(`${DEGPT_API_BASE_URL}/chat/completion/proxy`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: model,
        // node_id: nodeList?.[0],
        messages: [
          {
            role: 'user',
            content: template,
          },
        ],
        stream: false,
        project: 'DecentralGPT',
        // Restricting the max tokens to 50 to avoid long titles
        max_tokens: 50,
        enable_thinking: false,
        reload: false,
        audio: false,
      }),
    });
    res = await result.json();

    console.log('Title API Response:', res);
  } catch (err) {
    error = err;
    console.log('Request Error');
  }

  if (error) {
    throw error;
  }

  return res?.choices[0]?.message?.content.replace(/["']/g, '') ?? 'New Chat';
};
