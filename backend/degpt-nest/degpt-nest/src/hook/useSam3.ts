import { Logger } from '@nestjs/common';
import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

interface Sam3TaskArgs {
  video: string;
  prompt: string;
  apply_mask?: boolean; // Default: true
}

export const useSam3 = () => {
  const logger = new Logger('useSam3');
  const apiKey = process.env.WAVESPEED_KEY;
  const baseUrl = process.env.WAVESPEED_URL;

  const submitSam3Task = async (args: Sam3TaskArgs): Promise<string> => {
    if (!apiKey || !baseUrl) throw new Error('环境变量配置缺失');

    // SAM3 只需要这三个参数
    const { video, prompt, apply_mask = true } = args;

    const payload = {
      video,
      prompt,
      apply_mask,
    };

    logger.log(`[SAM3 Submit] payload=${JSON.stringify(payload)}`);

    // 构建 URL: /wavespeed-ai/sam3-video
    const url = `${baseUrl}/wavespeed-ai/sam3-video`;

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
      30000, // 30秒超时
      { tag: 'submit_sam3' },
    );

    const text = await resp.text();
    if (!resp.ok) {
      logger.error(`[SAM3 Error] Status: ${resp.status}, Body: ${text}`);
      throw new Error(`SAM3 提交失败: ${resp.status}`);
    }

    try {
      const json = JSON.parse(text);
      const requestId = json?.data?.id;
      if (!requestId) throw new Error('未获取到 requestId');
      return requestId;
    } catch (e) {
      throw new Error(`解析 SAM3 响应失败: ${e.message}`);
    }
  };

  // SAM3 的查询接口也是通用的 /predictions/${id}/result
  // 这里保留空实现，你可以在 Service 层直接复用 usePika 或 useWan 的查询逻辑
  const getResult = async (id: string) => {
    // ...
  };

  return { submitSam3Task, getResult };
};
