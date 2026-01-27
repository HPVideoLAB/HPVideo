import { Logger } from '@nestjs/common';

export const useWan26 = () => {
  const logger = new Logger('UseWan26');
  const apiKey = process.env.WAVESPEED_KEY;
  const baseUrl = process.env.WAVESPEED_URL;

  const submitWan26Task = async (params: {
    image: string;
    prompt: string;
    duration: number; // 必填
    resolution?: '720p' | '1080p';
    negative_prompt?: string;
    shot_type?: 'single' | 'multi';
    seed?: number;
  }) => {
    if (!apiKey) throw new Error('API Key not configured');

    const url = `${baseUrl}/alibaba/wan-2.6/image-to-video`;

    const payload = {
      image: params.image,
      prompt: params.prompt,
      // ✅ 接收 DTO 传来的参数
      duration: params.duration,
      resolution: params.resolution || '1080p', // 默认 1080p
      negative_prompt: params.negative_prompt,
      shot_type: params.shot_type || 'multi', // 默认多镜头叙事

      enable_prompt_expansion: true,
      seed: params.seed ?? -1,
    };

    logger.log(`Submitting Wan 2.6 Task: ${JSON.stringify(payload)}`);

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
        throw new Error(`Wan 2.6 API Error (${response.status}): ${errText}`);
      }

      const result = await response.json();
      const requestId = result?.data?.id;

      if (!requestId)
        throw new Error('No Request ID returned from Wan 2.6 API');

      return requestId;
    } catch (error) {
      logger.error(error);
      throw error;
    }
  };

  // getResult 保持不变
  const getResult = async (requestId: string) => {
    const url = `${baseUrl}/predictions/${requestId}/result`;
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!response.ok) throw new Error(`Query Error: ${response.statusText}`);
      const json = await response.json();
      const data = json.data;
      return {
        status: data.status,
        resultUrl: data.status === 'completed' ? data.outputs[0] : '',
        error: data.error,
        raw: data,
      };
    } catch (error) {
      logger.error(error);
      throw error;
    }
  };

  return { submitWan26Task, getResult };
};
