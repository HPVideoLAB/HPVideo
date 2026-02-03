// src/hook/useVideoUpscalerPro.ts
import { Logger } from '@nestjs/common';
import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

export const useVideoUpscalerPro = () => {
  const logger = new Logger('useVideoUpscalerPro');
  const apiKey = process.env.WAVESPEED_KEY;
  const baseUrl = process.env.WAVESPEED_URL; // 你的 baseUrl 应该类似：https://api.wavespeed.ai/api/v3

  const submitUpscalerTask = async (args: {
    video: string;
    target_resolution?: '720p' | '1080p' | '2k' | '4k';
  }): Promise<string> => {
    if (!apiKey) throw new Error('Please check WAVESPEED_KEY');
    if (!baseUrl) throw new Error('Please check WAVESPEED_URL');

    const { video, target_resolution = '1080p' } = args;

    if (!video?.trim()) throw new Error('Missing video');

    const payload = { video, target_resolution };

    logger.log(`[submit] payload=${JSON.stringify(payload)}`);

    const resp = await fetchWithTimeout(
      `${baseUrl}/wavespeed-ai/video-upscaler-pro`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      },
      1800000,
      { tag: 'submit', model: 'video-upscaler-pro' },
    );

    const text = await resp.text();
    if (!resp.ok) throw new Error(`Submission failed: ${resp.status}, ${text}`);

    const json = JSON.parse(text);
    const requestId = json?.data?.id;
    if (!requestId) throw new Error(`Submission succeeded but no requestId received: ${text}`);

    logger.log(`[submit] ok requestId=${requestId}`);
    return requestId;
  };

  const getResult = async (
    requestId: string,
  ): Promise<{
    status: 'created' | 'processing' | 'completed' | 'failed';
    resultUrl?: string;
    error?: string;
    raw?: any;
  }> => {
    if (!apiKey) throw new Error('Please check WAVESPEED_KEY');
    if (!baseUrl) throw new Error('Please check WAVESPEED_URL');

    const resp = await fetchWithTimeout(
      `${baseUrl}/predictions/${requestId}/result`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
      1800000,
      { tag: 'poll', requestId, model: 'video-upscaler-pro' },
    );

    const text = await resp.text();
    if (!resp.ok) throw new Error(`Query failed: ${resp.status}, ${text}`);

    const json = JSON.parse(text);
    const data = json?.data;
    const status = data?.status;

    if (status === 'completed') {
      return { status, resultUrl: data?.outputs?.[0], raw: data };
    }
    if (status === 'failed') {
      return { status, error: data?.error ?? 'unknown error', raw: data };
    }
    return { status, raw: data };
  };

  return { submitUpscalerTask, getResult };
};
