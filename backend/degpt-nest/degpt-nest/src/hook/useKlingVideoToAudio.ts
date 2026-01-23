// src/hook/useKlingVideoToAudio.ts
import { Logger } from '@nestjs/common';
import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

export const useKlingVideoToAudio = () => {
  const logger = new Logger('useKlingVideoToAudio');
  const apiKey = process.env.WAVESPEED_KEY;
  const baseUrl = process.env.WAVESPEED_URL;

  const submitKlingAudioTask = async (args: {
    video: string;
    sound_effect_prompt?: string;
    bgm_prompt?: string;
    asmr_mode?: boolean;
  }): Promise<string> => {
    if (!apiKey) throw new Error('请检查 WAVESPEED_KEY');
    if (!baseUrl) throw new Error('请检查 WAVESPEED_URL');

    const { video, sound_effect_prompt, bgm_prompt, asmr_mode = false } = args;

    if (!video?.trim()) throw new Error('缺少 video');
    if (sound_effect_prompt && sound_effect_prompt.length > 200)
      throw new Error('sound_effect_prompt 最大 200 字符');
    if (bgm_prompt && bgm_prompt.length > 200)
      throw new Error('bgm_prompt 最大 200 字符');

    const payload: any = {
      video,
      asmr_mode,
      ...(sound_effect_prompt ? { sound_effect_prompt } : {}),
      ...(bgm_prompt ? { bgm_prompt } : {}),
    };

    logger.log(`[submit] payload=${JSON.stringify(payload)}`);

    const resp = await fetchWithTimeout(
      `${baseUrl}/kwaivgi/kling-video-to-audio`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      },
      20000,
      { tag: 'submit', model: 'kling-video-to-audio' },
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
    if (!apiKey) throw new Error('请检查 WAVESPEED_KEY');
    if (!baseUrl) throw new Error('请检查 WAVESPEED_URL');

    const resp = await fetchWithTimeout(
      `${baseUrl}/predictions/${requestId}/result`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
      15000,
      { tag: 'poll', requestId, model: 'kling-video-to-audio' },
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

  return { submitKlingAudioTask, getResult };
};
