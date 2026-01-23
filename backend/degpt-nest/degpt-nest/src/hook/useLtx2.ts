import { Logger } from '@nestjs/common';

export const useLtx2 = () => {
  const logger = new Logger('UseLtx2');

  const apiKey = process.env.WAVESPEED_KEY;
  const baseUrl = process.env.WAVESPEED_URL;

  // 1. 提交任务
  const submitLtx2Task = async (params: {
    image: string;
    prompt: string;
    duration?: number; // 🔥 接收 duration
    seed?: number;
  }) => {
    if (!apiKey) {
      throw new Error('API Key not configured');
    }

    const url = `${baseUrl}/wavespeed-ai/ltx-2-19b/image-to-video`;

    // 🔥 核心修改：duration 动态化
    const payload = {
      image: params.image,
      prompt: params.prompt,
      resolution: '1080p', // 分辨率依然写死 1080p
      duration: params.duration || 5, // 🔥 默认 5s，如果传了就用传的
      seed: params.seed ?? -1,
    };

    logger.log(
      `Submitting LTX-2 (1080p, ${payload.duration}s) Task: ${JSON.stringify(payload)}`,
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`LTX-2 API Error (${response.status}): ${errText}`);
      }

      const result = await response.json();
      const requestId = result?.data?.id;

      if (!requestId) {
        throw new Error('No Request ID returned from LTX-2 API');
      }

      return requestId;
    } catch (error) {
      logger.error(error);
      throw error;
    }
  };

  // 2. 查询结果 (保持不变)
  const getResult = async (requestId: string) => {
    const url = `${baseUrl}/predictions/${requestId}/result`;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Query Error: ${response.statusText}`);
      }

      const json = await response.json();
      const data = json.data;

      return {
        status: data.status,
        resultUrl: data.status === 'completed' ? data.outputs[0] : '',
        error: data.error,
      };
    } catch (error) {
      logger.error(error);
      throw error;
    }
  };

  return { submitLtx2Task, getResult };
};
