import { promptTemplate } from "$lib/utils";
import { WEBUI_API_BASE_URL, DEGPT_API_BASE_URL } from '$lib/constants';

// 获取De的所有模型列表
export const getDeModels = async (token: string = "") => {

  const format_res = {
    models: [
      // 基础模型
      {
        name: "WAN 2.5",
        source: "alibaba",
        model: "wan-2.5",
        textmodel: "wan-2.5/text-to-video",
        imagemodel: "wan-2.5/image-to-video",
        audio: true,
        duration: [5, 10],
        amount: {"480": [0.375, 0.75], "720": [0.75, 1.5], "1080": [1.125, 2.25]},
        size: ["480*832","832*480","720*1280","1280*720","1080*1920","1920*1080"],
        tip: "WAN 2.5",
        support: "image",
        type: 1,
        desc: "Multi-resolution with synchronized audio and video generation",
        modelicon: "/creator/static/icon/qwen.png",
        modelinfo: ""
      },
      {
        name: "SORA 2",
        source: "openai",
        model: "sora-2",
        textmodel: "sora-2/text-to-video",
        imagemodel: "sora-2/image-to-video",
        audio: true,
        duration: [4, 8, 12],
        amount: {"720": [0.45, 1.35, 2.7]},
        size: ["720*1280","1280*720"],
        tip: "SORA 2",
        support: "image",
        type: 1,
        desc: "Physically accurate, synchronized audio and video",
        modelicon: "/creator/static/icon/gpt3.png",
        modelinfo: ""
      },
      {
        name: "OVI",
        source: "character-ai",
        model: "ovi",
        textmodel: "ovi/text-to-video",
        imagemodel: "ovi/image-to-video",
        audio: true,
        duration: [5],
        amount: {"540": [0.225]},
        size: ["540*960","960*540"],
        tip: "OVI",
        support: "image",
        type: 1,
        desc: "Strong comprehension, generates precise videos",
        modelicon: "/creator/static/icon/gemini.png",
        modelinfo: ""
      },
      {
        name: "VEO 3.1",
        source: "google",
        model: "veo3.1",
        textmodel: "veo3.1/text-to-video",
        imagemodel: "veo3.1/image-to-video",
        audio: true,
        duration: [4, 6, 8],
        amount: {"*": [2.4, 3.6, 4.8]},
        size: ["9:16","16:9"],
        tip: "VEO 3.1",
        support: "image",
        type: 1,
        desc: "High-quality long videos with smooth visual coherence",
        modelicon: "/creator/static/icon/gemini.png",
        modelinfo: ""
      },
      {
        name: "LTX 2 PRO",
        source: "lightricks",
        model: "ltx-2-pro",
        textmodel: "ltx-2-pro/text-to-video",
        imagemodel: "ltx-2-pro/image-to-video",
        audio: false,
        duration: [6, 8, 10],
        amount: {"*": [0.54, 0.72, 0.9]},
        size: ["1920*1080"],
        tip: "LTX 2 PRO",
        support: "image",
        type: 1,
        desc: "Realistic details and smooth motion",
        modelicon: "/creator/static/icon/ltx.png",
        modelinfo: ""
      },
      {
        name: "HAILUO 02",
        source: "minimax",
        model: "hailuo-02",
        textmodel: "hailuo-02/t2v-standard",
        imagemodel: "hailuo-02/i2v-standard",
        audio: false,
        duration: [6, 10],
        amount: {"*": [0.345, 0.84]},
        size: ["1366*768"],
        tip: "HAILUO 02",
        support: "image",
        type: 1,
        desc: "Realistic rendering of dynamic scenes",
        modelicon: "/creator/static/icon/hailuo.png",
        modelinfo: ""
      },
      {
        name: "SEEDANCE V1",
        source: "bytedance",
        model: "seedance",
        textmodel: "seedance-v1-pro-t2v-480p",
        imagemodel: "seedance-v1-pro-i2v-480p",
        audio: false,
        duration: [6, 9, 12],
        amount: {"*": [0.27, 0.405, 0.54]},
        size: ["3:4","4:3","9:16","16:9","21:9"],
        tip: "SEEDANCE V1",
        support: "image",
        type: 1,
        desc: "Multi-shot narrative, stable and smooth visuals",
        modelicon: "/creator/static/icon/doubao.png",
        modelinfo: ""
      },
      {
        name: "KLING V2.0",
        source: "kwaivgi",
        model: "kling",
        textmodel: "kling-v2.0-t2v-master",
        imagemodel: "kling-v2.0-i2v-master",
        audio: true,
        duration: [5, 10],
        amount: {"*": [1.95, 3.9]},
        size: ["9:16","16:9"],
        tip: "KLING V2.0",
        support: "image",
        type: 1,
        desc: "Accurate physical motion simulation",
        modelicon: "/creator/static/icon/kling.png",
        modelinfo: ""
      },
      {
        name: "PIXVERSE V4.5",
        source: "pixverse",
        model: "pixverse",
        textmodel: "pixverse-v4.5-t2v",
        imagemodel: "pixverse-v4.5-i2v",
        audio: true,
        duration: [5, 8],
        amount: {"*": [0.525, 1.05]},
        size: ["3:4","4:3","9:16","16:9"],
        tip: "PIXVERSE V4.5",
        support: "image",
        type: 1,
        desc: "Fluid motion and lifelike details",
        modelicon: "/creator/static/icon/pixverse.png",
        modelinfo: ""
      }
    ],
  };
  return (format_res?.models ?? []).map((model) => ({
    id: model.model,
    name: model.name ?? model.model,
    ...model,
  }));
};

// AI Video Request Encapsulation
export const getDeOpenAIChatCompletion = async (
  token: string = "",
  body: Object
) => {
  let res: any;
  let error = null;
  const controller = new AbortController();
  try {
    res = await fetch(`${WEBUI_API_BASE_URL}/chat/completion/video`, {
      signal: controller.signal,
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...body,
        project: "HPVideo"
      }),
    });
    if (res.status != 200) {
      throw new Error("error");
    }
  } catch (err) {
    error = err;
    res = null;
  }

  if (error) {
    throw error;
  }

  return [res, controller];
}

// AI Video Result Request Encapsulation
export const getDeOpenAIChatResult = async (
  token: string = "",
  body: Object
) => {
  let res: any;
  let error = null;
  const controller = new AbortController();
  try {
    res = await fetch(`${WEBUI_API_BASE_URL}/chat/video/result`, {
      signal: controller.signal,
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...body
      }),
    });
    if (res.status != 200) {
      throw new Error("error");
    }
  } catch (err) {
    error = err;
    res = null;
  }

  if (error) {
    throw error;
  }

  return [res, controller];
}

// AI Video X402 Result Request Encapsulation
export const getX402DeOpenAIChatResult = async (
  token: string = "",
  body: Object
) => {
  let res: any;
  let error = null;
  const controller = new AbortController();
  try {
    res = await fetch(`${WEBUI_API_BASE_URL}/chat/video/x402/result`, {
      signal: controller.signal,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...body
      }),
    });
    if (res.status != 200) {
      throw new Error("error");
    }
  } catch (err) {
    error = err;
    res = null;
  }

  if (error) {
    throw error;
  }

  return [res, controller];
}

// Add a shorthand
export const generateDeTitle = async (
  token: string = "",
  template: string,
  model: string,
  prompt: string
) => {
  let error = null;
  let res: any;
  template = promptTemplate(template, prompt);
  model = 'qwen3-235b-a22b';
  try {
    const result = await fetch(`${DEGPT_API_BASE_URL}/chat/completion/proxy`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: model,
        // node_id: nodeList?.[0],
        messages: [
          {
            role: "user",
            content: template,
          },
        ],
        stream: false,
        project: "DecentralGPT",
        // Restricting the max tokens to 50 to avoid long titles
        max_tokens: 50,
        enable_thinking: false,
        reload: false,
        audio: false
      })
    });
    res = await result.json();
  } catch (err) {
    error = err;
    console.log("Request Error");
  }

  if (error) {
    throw error;
  }

  return (
    res?.choices[0]?.message?.content.replace(/["']/g, "") ?? "New Chat"
  );
};