import { NEST_API_BASE_URL } from '$lib/constants';

export type UploadUrlsResp = { count: number; urls: string[] };

export async function uploadImagesToOss(token: string, images: File[]): Promise<UploadUrlsResp> {
  const formData = new FormData();
  for (const img of images) formData.append('files', img); // 关键：files

  const res = await fetch(`${NEST_API_BASE_URL}/oss/upload`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  // 这里统一错误处理，别混用 then/catch（更干净）
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // 兼容 Nest 常见错误结构
    throw new Error(data?.message || data?.detail || 'Upload failed');
  }

  if (!data?.urls || !Array.isArray(data.urls)) {
    throw new Error('Upload response invalid');
  }
  return data;
}

export type Resolution = '720p' | '1080p';
export type Transition = { duration: number; prompt?: string };

export type SubmitReq = {
  prompt: string;
  images: string[]; // 2~5 urls
  transitions?: Transition[]; // len = images-1, sum<=25
  resolution?: Resolution;
  seed?: number; // -1 ~ 2147483647
  model: string;
};

export async function submitLargeLanguageModel(payload: SubmitReq): Promise<{ requestId: string }> {
  const token = localStorage.getItem('token') || localStorage.getItem('access_token') || '';

  const res = await fetch(`${NEST_API_BASE_URL}/large-language-model`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || data?.detail || 'Submit failed');

  const requestId = data?.requestId || data?.data?.id || data?.id;
  if (!requestId) throw new Error('Submit response invalid: missing requestId');
  return { requestId };
}

export async function getLargeLanguageModelResult(id: string): Promise<any> {
  const token = localStorage.getItem('token') || localStorage.getItem('access_token') || '';

  const res = await fetch(`${NEST_API_BASE_URL}/large-language-model/${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      Accept: 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || data?.detail || 'Get result failed');
  return data;
}
