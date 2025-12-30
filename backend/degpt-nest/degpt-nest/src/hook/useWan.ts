import { Logger } from '@nestjs/common';
import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

// 定义接口以匹配 API 文档
interface WanTaskArgs {
  video: string;
  prompt: string;
  negative_prompt?: string;
  loras?: { path: string; scale: number }[];
  strength?: number; // Default: 0.9
  num_inference_steps?: number; // Default: 30
  duration?: number; // Default: 5
  guidance_scale?: number; // Default: 5
  flow_shift?: number; // Default: 3
  seed?: number; // Default: -1
}

export const useWan = () => {
  const logger = new Logger('useWan');
  const apiKey = process.env.WAVESPEED_KEY;
  // 注意：根据你的文档，API 地址应该是指向 wavespeed-ai/wan-2.1/v2v-720p-lora
  const baseUrl = process.env.WAVESPEED_URL;

  const submitWanTask = async (args: WanTaskArgs): Promise<string> => {
    if (!apiKey || !baseUrl) throw new Error('环境变量配置缺失');

    // 解构参数并设置默认值 (与文档保持一致)
    const {
      video,
      prompt,
      negative_prompt,
      loras,
      strength = 0.9,
      num_inference_steps = 30,
      duration = 5,
      guidance_scale = 5,
      flow_shift = 3,
      seed = -1,
    } = args;

    // 构建 Payload
    const payload = {
      video,
      prompt,
      strength,
      seed,
      num_inference_steps,
      duration,
      guidance_scale,
      flow_shift,
      ...(negative_prompt ? { negative_prompt } : {}),
      ...(loras && loras.length > 0 ? { loras } : {}),
    };

    logger.log(`[Wan Submit] payload=${JSON.stringify(payload)}`);

    // 拼接完整的 Endpoint
    const url = `${baseUrl}/wavespeed-ai/wan-2.1/v2v-720p-lora`;

    const resp = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      },
      30000, // 30s timeout
      { tag: 'submit_wan' },
    );

    const text = await resp.text();
    if (!resp.ok) {
      logger.error(`[Wan Error] Status: ${resp.status}, Body: ${text}`);
      throw new Error(`Wan 提交失败: ${resp.status}`);
    }

    try {
      const json = JSON.parse(text);
      // 根据文档，Response 结构是 data.id
      const requestId = json?.data?.id;
      if (!requestId) throw new Error('未获取到 requestId');
      return requestId;
    } catch (e) {
      throw new Error(`解析响应失败: ${e.message}`);
    }
  };

  // 复用查询逻辑 (假设与 Pika 通用，如果不通用请参考文档中的 Result Request 代码)
  const getResult = async (id: string) => {
    // ... 你的查询逻辑 ...
    // Wavespeed 通常查询地址是 /predictions/{id}/result
  };

  return { submitWanTask, getResult };
};
