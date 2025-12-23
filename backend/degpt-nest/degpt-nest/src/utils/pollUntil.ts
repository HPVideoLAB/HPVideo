// src/utils/pollUntil.ts
import { Logger } from '@nestjs/common';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type PollOptions = {
  intervalMs?: number; // 默认 2000
  maxAttempts?: number; // 默认 240（约 8 分钟）
  logEvery?: number; // 默认 10；0=不打印
  maxProcessingMs?: number; // 默认 3分钟：processing 超过就直接抛错
};

export async function pollUntil<T>(params: {
  requestId: string;
  fn: (attempt: number) => Promise<{
    done: boolean;
    value?: T;
    status?: string;
    raw?: any; // 用于调试：把服务端原始 data 带出来
  }>;
  opts?: PollOptions;
}): Promise<T> {
  const logger = new Logger('pollUntil');
  const requestId = params.requestId;

  const intervalMs = params.opts?.intervalMs ?? 2000;
  const maxAttempts = params.opts?.maxAttempts ?? 240;
  const logEvery = params.opts?.logEvery ?? 10;
  const maxProcessingMs = params.opts?.maxProcessingMs ?? 3 * 60 * 1000;

  let processingSince: number | null = null;
  let lastRaw: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await params.fn(attempt);
    const status = res.status;
    lastRaw = res.raw ?? lastRaw;

    // 处理 processing 卡死（非常重要：避免你说的“最后返回空”）
    if (status === 'processing' || status === 'created') {
      if (processingSince === null) processingSince = Date.now();
      const elapsed = Date.now() - processingSince;
      if (elapsed > maxProcessingMs) {
        logger.error(
          `[pika] requestId=${requestId} stuck in ${status} for ${Math.floor(elapsed / 1000)}s, lastRaw=${safeJson(
            lastRaw,
          )}`,
        );
        throw new Error(
          `任务长时间 ${status}（>${Math.floor(maxProcessingMs / 1000)}s），建议重试/更换图片源。requestId=${requestId}`,
        );
      }
    } else {
      processingSince = null;
    }

    if (logEvery > 0 && (attempt === 1 || attempt % logEvery === 0)) {
      logger.log(
        `[pika] requestId=${requestId} attempt=${attempt}/${maxAttempts} status=${status ?? ''} raw=${safeJson(
          lastRaw,
        )}`,
      );
    }

    if (res.done) return res.value as T;

    await sleep(intervalMs);
  }

  logger.error(
    `[pika] requestId=${requestId} timeout after ${maxAttempts} attempts, lastRaw=${safeJson(lastRaw)}`,
  );
  throw new Error(`任务超时：超过最大轮询次数 requestId=${requestId}`);
}

function safeJson(obj: any) {
  try {
    if (obj == null) return '';
    // 避免日志过大：截断
    const s = JSON.stringify(obj);
    return s.length > 800 ? s.slice(0, 800) + '...(truncated)' : s;
  } catch {
    return '[unserializable]';
  }
}
