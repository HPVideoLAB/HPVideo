import { NEST_API_BASE_URL, WEBUI_API_BASE_URL } from '$lib/constants';

// 获取De的所有模型列表
export const getDeModels = async (token: string = '') => {
  const format_res = {
    models: [
      // Model catalog — keep slugs in sync with
      // backend/apps/web/routers/x402pay.py MODEL_REGISTRY.
      // 2026-04-22: Sora 2 removed (OpenAI API shutting down 2026-09-24);
      //             replaced by Luma Ray 2 + Vidu Q3.
      // 2026-04-26: Descriptions rewritten as strength pitches; verified
      //             every slug is the latest WaveSpeed version (Apr 2026).
      // 2026-05-02: HappyHorse 1.0 added at the top + made default. Native
      //             joint audio+video, 7-language lip-sync at 14.6% WER,
      //             #1 on WaveSpeed leaderboard (T2V Elo 1333, I2V 1392).
      {
        name: 'HappyHorse 1.0',
        source: 'alibaba',
        model: 'happyhorse-1.0',
        textmodel: 'happyhorse-1.0/text-to-video',
        imagemodel: 'happyhorse-1.0/image-to-video',
        audio: true,
        duration: [5, 8],
        amount: { '720': [0.75, 1.20], '1080': [1.50, 2.40] },
        size: ['720*1280', '1280*720', '1080*1920', '1920*1080', '1024*1024'],
        tip: '#1 leaderboard · native dialogue + lip-sync',
        support: 'image',
        type: 1,
        desc: 'Currently #1 on WaveSpeed video leaderboard. Joint audio+video in a single pass — phoneme-level lip-sync across English / Mandarin / Cantonese / Japanese / Korean / German / French at 14.6% WER. Cinematic 1080p with synced dialogue, ambient sound, and Foley out of the box.',
        modelicon: '/creator/static/icon/qwen.png',
        modelinfo: '',
        badge: '🥇 #1',
        featured: true,
      },
      {
        name: 'WAN 2.7',
        source: 'alibaba',
        model: 'wan-2.7',
        textmodel: 'wan-2.7/text-to-video',
        imagemodel: 'wan-2.7/image-to-video',
        audio: true,
        duration: [5, 10],
        amount: { '480': [0.375, 0.75], '720': [0.75, 1.5], '1080': [1.125, 2.25] },
        size: ['480*832', '832*480', '720*1280', '1280*720', '1080*1920', '1920*1080'],
        tip: 'WAN 2.7',
        support: 'image',
        type: 1,
        desc: 'First & last frame control, Thinking-Mode prompt planning, up to 5 reference videos. Native audio at 1080p.',
        modelicon: '/creator/static/icon/qwen.png',
        modelinfo: '',
      },
      {
        name: 'LUMA RAY 2',
        source: 'luma',
        model: 'luma-ray-2',
        textmodel: 'ray-2-t2v',
        imagemodel: 'ray-2-i2v',
        audio: true,
        duration: [5, 10],
        amount: { '*': [0.75, 1.5] },
        size: ['9:16', '16:9'],
        tip: 'LUMA RAY 2',
        support: 'image',
        type: 1,
        desc: 'Cinematic motion + reasoning-driven keyframes. HDR pipeline, the smoothest camera moves on the market.',
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
        desc: 'Open-source video + audio in a single pass. Cheapest in the catalog — perfect for fast experiments.',
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
        desc: 'Best-in-class prompt adherence + cinematic realism. Native dialogue and SFX, scene-extend up to 60s.',
        modelicon: '/creator/static/icon/gemini.png',
        modelinfo: '',
      },
      {
        name: 'LTX 2.3',
        source: 'wavespeed-ai',
        model: 'ltx-2.3',
        textmodel: 'ltx-2.3/text-to-video',
        imagemodel: 'ltx-2.3/image-to-video',
        audio: true,
        duration: [6, 8, 10],
        amount: { '*': [0.54, 0.72, 0.9] },
        size: ['1920*1080'],
        tip: 'LTX 2.3',
        support: 'image',
        type: 1,
        desc: 'Native 4K + 50fps with synced audio. Open-weights, the best fps-to-cost ratio for hi-res content.',
        modelicon: '/creator/static/icon/ltx.png',
        modelinfo: '',
      },
      {
        name: 'HAILUO 2.3',
        source: 'minimax',
        model: 'hailuo-2.3',
        textmodel: 'hailuo-2.3/t2v-pro',
        imagemodel: 'hailuo-2.3/i2v-pro',
        audio: false,
        duration: [6, 10],
        amount: { '*': [0.345, 0.84] },
        size: ['1366*768'],
        tip: 'HAILUO 2.3',
        support: 'image',
        type: 1,
        desc: 'Physics-accurate motion. #2 on the Artificial Analysis benchmark — the realism leader at this price point.',
        modelicon: '/creator/static/icon/hailuo.png',
        modelinfo: '',
      },
      {
        name: 'SEEDANCE 2.0',
        source: 'bytedance',
        model: 'seedance-2.0',
        textmodel: 'seedance-2.0/text-to-video',
        imagemodel: 'seedance-2.0/image-to-video',
        audio: true,
        duration: [6, 9, 12],
        amount: { '*': [0.30, 0.45, 0.60] },
        size: ['3:4', '4:3', '9:16', '16:9', '21:9'],
        tip: 'SEEDANCE 2.0',
        support: 'image',
        type: 1,
        desc: 'Hollywood-grade cinematic look + multilingual phoneme-accurate lip-sync. Best for talking-head and ad creative.',
        modelicon: '/creator/static/icon/doubao.png',
        modelinfo: '',
      },
      {
        name: 'KLING V3.0',
        source: 'kwaivgi',
        model: 'kling-3.0',
        textmodel: 'kling-v3.0-std/text-to-video',
        imagemodel: 'kling-v3.0-std/image-to-video',
        audio: true,
        duration: [5, 10],
        amount: { '*': [2.10, 4.20] },
        size: ['9:16', '16:9'],
        tip: 'KLING V3.0',
        support: 'image',
        type: 1,
        desc: 'Up to 6-shot multi-scene generation in one clip with character consistency. Native multilingual audio.',
        modelicon: '/creator/static/icon/kling.png',
        modelinfo: '',
      },
      {
        name: 'PIXVERSE V6',
        source: 'pixverse',
        model: 'pixverse-v6',
        textmodel: 'pixverse-v6/text-to-video',
        imagemodel: 'pixverse-v6/image-to-video',
        audio: true,
        duration: [5, 8],
        amount: { '*': [0.60, 1.20] },
        size: ['3:4', '4:3', '9:16', '16:9'],
        tip: 'PIXVERSE V6',
        support: 'image',
        type: 1,
        desc: '20+ cinematic lens controls — focal length, aperture, depth-of-field, vignette. The only model with real camera language.',
        modelicon: '/creator/static/icon/pixverse.png',
        modelinfo: '',
      },
      {
        name: 'VIDU Q3',
        source: 'vidu',
        model: 'vidu-q3',
        textmodel: 'q3/text-to-video',
        imagemodel: 'q3/image-to-video',
        audio: true,
        duration: [4, 8],
        amount: { '*': [0.40, 0.80] },
        size: ['9:16', '16:9', '1:1'],
        tip: 'VIDU Q3',
        support: 'image',
        type: 1,
        desc: 'Up to 16s single-pass continuous shot with reference-subject consistency + native dialogue/SFX/music.',
        modelicon: '/creator/static/icon/gpt3.png',
        modelinfo: '',
      },
    ],
  };
  return (format_res?.models ?? []).map(
    (model: any) =>
      ({
        id: model.model,
        name: model.name ?? model.model,
        ...model,
      } as any)
  );
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
  } catch (err: any) {
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
  } catch (err: any) {
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
  } catch (err: any) {
    error = err;
    res = null;
  }

  if (error) {
    throw error;
  }

  return [res, controller];
};

/**
 * 生成标题 (新版)
 * 逻辑：直接调用 NestJS 后端接口，不再在前端处理 Prompt 模板或 Token
 */
export const generateDeTitle = async (
  // 以前的 token, template, model 参数都不需要了，为了兼容调用位置可以保留占位，或者直接删掉
  // 这里我建议直接清理掉，只留 prompt
  prompt: string
) => {
  try {
    // 1. 请求你的 NestJS 后端
    const res = await fetch(`${NEST_API_BASE_URL}/smart-enhancer/generate-title`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt, // 直接传用户的原始输入即可，后端会加 system prompt
      }),
    });

    // 2. 解析响应
    const data = await res.json().catch(() => null);

    // 3. 错误处理
    if (!res.ok || !data?.title) {
      console.warn('Title generation failed via backend, using fallback.');
      return 'New Chat'; // 或者返回 '新建聊天'
    }

    // 4. 返回后端生成的标题
    return data.title;
  } catch (err) {
    console.error('generateDeTitle request error:', err);
    // 发生网络错误时，兜底返回
    return 'New Chat';
  }
};
