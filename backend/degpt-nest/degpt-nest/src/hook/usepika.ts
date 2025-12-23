// src/hook/usepika.ts
import { Logger } from '@nestjs/common';
import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

export const usePika = () => {
  const logger = new Logger('usePika');
  const apiKey = process.env.WAVESPEED_KEY;
  const baseUrl = process.env.WAVESPEED_URL;

  const submitTask = async (args: {
    prompt: string;
    images: string[];
    resolution?: '720p' | '1080p';
    seed?: number;
    transitions?: Array<{ duration: number; prompt?: string }>;
  }): Promise<string> => {
    if (!apiKey) throw new Error('请检查 WAVESPEED_KEY');
    if (!baseUrl) throw new Error('请检查 WAVESPEED_URL');

    const {
      prompt,
      images,
      resolution = '720p',
      seed = -1,
      transitions,
    } = args;

    if (!prompt?.trim()) throw new Error('缺少 prompt');
    if (!Array.isArray(images) || images.length < 2)
      throw new Error('images 至少 2 张（接口要求）');
    if (images.length > 5) throw new Error('images 最多 5 张（接口要求）');
    if (transitions && transitions.length !== images.length - 1) {
      throw new Error('transitions 长度必须等于 images.length - 1');
    }

    const payload: any = {
      prompt,
      images,
      resolution,
      seed,
      ...(transitions ? { transitions } : {}),
    };

    logger.log(`[submit] payload=${JSON.stringify(payload)}`);

    const resp = await fetchWithTimeout(
      `${baseUrl}/pika/v2.2-pikaframes`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      },
      20000,
      { tag: 'submit' },
    );

    const text = await resp.text();
    if (!resp.ok) throw new Error(`提交失败: ${resp.status}, ${text}`);

    const json = JSON.parse(text);
    const requestId = json?.data?.id;
    if (!requestId) throw new Error(`提交成功但未拿到 requestId: ${text}`);

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
    console.log(requestId);
    if (!apiKey) throw new Error('请检查 WAVESPEED_KEY');
    if (!baseUrl) throw new Error('请检查 WAVESPEED_URL');

    const resp = await fetchWithTimeout(
      `${baseUrl}/predictions/${requestId}/result`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
      15000,
      { tag: 'poll', requestId },
    );

    const text = await resp.text();
    if (!resp.ok) throw new Error(`查询失败: ${resp.status}, ${text}`);

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

  return { submitTask, getResult };
};
