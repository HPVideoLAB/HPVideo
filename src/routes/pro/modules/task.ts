// $lib/features/img-to-video/task.ts
import { poll } from '$lib/utils/poll';

export function extractStatusAndOutputs(anyResp: any): {
  st: string;
  outputs: string[];
  err?: string;
  resultUrl?: string;
} {
  const data = anyResp?.data ?? anyResp;

  const st = data?.status ?? anyResp?.status ?? '';
  const outputsRaw = data?.outputs ?? data?.raw?.outputs ?? anyResp?.outputs ?? anyResp?.raw?.outputs ?? [];
  const resultUrl = data?.resultUrl ?? anyResp?.resultUrl ?? '';
  const err = data?.error ?? anyResp?.error;

  return {
    st,
    outputs: Array.isArray(outputsRaw) ? outputsRaw : [],
    err,
    resultUrl,
  };
}

export async function pollTaskResult<TResp>(args: {
  requestId: string;
  fetcher: (id: string) => Promise<TResp>;
  signal: AbortSignal;
  onCompleted?: (url: string, raw: TResp) => void;
  onTick?: (raw: TResp) => void;
  // 🔥 新增可选参数
  intervalMs?: number;
  timeoutMs?: number;
}) {
  const { requestId, fetcher, signal, onCompleted, onTick, intervalMs = 20000, timeoutMs = 1800000 } = args;

  const last = await poll(() => fetcher(requestId), {
    intervalMs, // 🔥 透传
    timeoutMs, // 🔥 透传
    signal,

    onTick: (resp) => {
      onTick?.(resp);
      const { st, outputs, err, resultUrl } = extractStatusAndOutputs(resp);

      if (st === 'failed') throw new Error(err || 'Task failed');

      if (st === 'completed') {
        const url = resultUrl || outputs[0] || '';
        onCompleted?.(url, resp);
      }
    },

    shouldStop: (resp) => {
      const { st } = extractStatusAndOutputs(resp);
      return st === 'completed' || st === 'failed';
    },
  });

  const { st, outputs, err, resultUrl } = extractStatusAndOutputs(last);

  if (st === 'completed') {
    return { status: 'completed' as const, url: resultUrl || outputs[0] || '', raw: last };
  }

  throw new Error(err || 'Task failed');
}
