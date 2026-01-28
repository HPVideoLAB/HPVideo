import { Logger } from '@nestjs/common';
import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

export interface PipelineState {
  stage: 'wan_submitted' | 'upscaling' | 'completed' | 'completed_with_error';
  videoPrompt: string;
  startFrame: any;
  wanRequestId: string;
  enableUpscale: 'default' | '2k' | '4k';
  wanOutputUrl?: string;
  upscaleRequestId?: string;
  error?: string;
}

export const useCommercialPipeline = () => {
  const logger = new Logger('useCommercialPipeline');

  // ✅ 1. 改用 WaveSpeed 的环境变量
  const apiKey = process.env.WAVESPEED_KEY;
  const baseUrl = process.env.WAVESPEED_URL;

  // ============================================================
  // 🔥 1. 提交任务 (适配 WaveSpeed 格式)
  // ============================================================
  const submitWan = async (args: {
    image: string;
    prompt: string;
    seed?: number;
    duration: number;
    resolution?: '720p' | '1080p';
    negative_prompt?: string;
    shot_type?: 'single' | 'multi';
  }): Promise<string> => {
    if (!apiKey) throw new Error('请检查 WAVESPEED_KEY');
    if (!baseUrl) throw new Error('请检查 WAVESPEED_URL');

    // 构造请求体
    // 注意：这里需要确认 WaveSpeed 上 Wan 2.6/2.1 的具体参数名
    // 通常 Wan 模型需要: prompt, image (或 image_url), duration
    const payload = {
      prompt: args.prompt,
      image: args.image, // WaveSpeed 通常直接传字符串 URL
      duration: args.duration || 5,
      ratio: '16:9', // 或者根据 image 自动推断，Wan 通常需要这个
      resolution: args.resolution || '1080p',
      seed: args.seed && args.seed !== -1 ? args.seed : -1,
      negative_prompt: args.negative_prompt,
    };

    logger.log(
      `[Wan Submit] 正在提交到 WaveSpeed... Prompt: ${JSON.stringify(payload)}`,
    );
    // 🔥 注意：请确认 WaveSpeed 上 Wan 模型的具体 Path
    // 这里假设是 /aliyun/wan-2.1-i2v-plus，如果不同请修改此处字符串
    const modelEndpoint = '/alibaba/wan-2.6/image-to-video';

    const resp = await fetchWithTimeout(
      `${baseUrl}${modelEndpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      },
      30000, // 30s timeout
      { tag: 'submit', model: 'wan-commercial' },
    );

    const text = await resp.text();
    if (!resp.ok) {
      logger.error(`[Wan Submit] 失败: ${resp.status} - ${text}`);
      throw new Error(`WaveSpeed Submit Failed: ${text}`);
    }

    const json = JSON.parse(text);
    // WaveSpeed 通常返回: { data: { id: "..." } }
    const requestId = json?.data?.id;

    if (!requestId) {
      throw new Error(`提交成功但未拿到 requestId: ${text}`);
    }

    logger.log(`[Wan Submit] 成功! Task ID: ${requestId}`);
    return requestId;
  };

  // ============================================================
  // 🔥 2. 查询结果 (使用 WaveSpeed 通用接口)
  // ============================================================
  const getWanResult = async (
    taskId: string,
  ): Promise<{
    status: 'SUCCEEDED' | 'FAILED' | 'PENDING' | 'RUNNING' | 'UNKNOWN';
    outputUrl?: string;
    errorMessage?: string;
  }> => {
    if (!taskId) return { status: 'UNKNOWN', errorMessage: 'No Task ID' };

    // 拦截之前的 Mock ID
    if (taskId.startsWith('mock_')) {
      return { status: 'FAILED', errorMessage: 'Legacy Mock ID' };
    }

    if (!apiKey) return { status: 'UNKNOWN', errorMessage: 'No API Key' };

    try {
      // ✅ 使用 WaveSpeed 的通用查询接口 /predictions/{id}/result
      const resp = await fetchWithTimeout(
        `${baseUrl}/predictions/${taskId}/result`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
        },
        15000,
        { tag: 'poll', requestId: taskId },
      );

      const text = await resp.text();
      if (!resp.ok) {
        // 处理 404 或其他错误
        return {
          status: 'UNKNOWN',
          errorMessage: `HTTP ${resp.status}: ${text}`,
        };
      }

      const json = JSON.parse(text);
      const data = json?.data;
      const wsStatus = data?.status; // 'created' | 'processing' | 'completed' | 'failed'

      // 映射 WaveSpeed 状态 -> 你的 Pipeline 状态
      if (wsStatus === 'completed') {
        const videoUrl = data?.outputs?.[0];
        if (!videoUrl)
          return {
            status: 'FAILED',
            errorMessage: 'Success but no output URL',
          };
        return { status: 'SUCCEEDED', outputUrl: videoUrl };
      }

      if (wsStatus === 'failed') {
        return {
          status: 'FAILED',
          errorMessage: data?.error || 'WaveSpeed reported failure',
        };
      }

      // created 或 processing 都算 RUNNING
      return { status: 'RUNNING' };
    } catch (e) {
      return { status: 'UNKNOWN', errorMessage: e.message };
    }
  };

  const advanceOnce = async (state: PipelineState) => state;

  return { submitWan, getWanResult, advanceOnce };
};
