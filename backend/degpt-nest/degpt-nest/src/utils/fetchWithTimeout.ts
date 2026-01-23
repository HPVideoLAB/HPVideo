// src/utils/fetchWithTimeout.ts
import { Logger } from '@nestjs/common';

export type FetchDebug = {
  tag?: string; // 这次请求属于哪个阶段：submit/poll
  requestId?: string; // 轮询时的任务 id
  logBodyOnError?: boolean; // 出错时是否打印响应 body
  // ✅ 新增：模型名（可选）
  model?: string;
};

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 1800000,
  debug?: FetchDebug,
) {
  const logger = new Logger('fetchWithTimeout');
  const tag = debug?.tag ?? 'http';

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  const startedAt = Date.now();

  try {
    const resp = await fetch(url, { ...init, signal: controller.signal });

    const costMs = Date.now() - startedAt;

    // 只做轻量调试：不默认打印 body，避免大输出
    logger.debug(
      `[${tag}] ${resp.status} ${resp.statusText} ${costMs}ms` +
        (debug?.model ? ` model=${debug.model}` : '') +
        (debug?.requestId ? ` requestId=${debug.requestId}` : '') +
        ` url=${url}`,
    );

    return resp;
  } catch (err: any) {
    const costMs = Date.now() - startedAt;
    logger.error(
      `[${tag}] request failed ${costMs}ms` +
        (debug?.model ? ` model=${debug.model}` : '') +
        (debug?.requestId ? ` requestId=${debug.requestId}` : '') +
        ` url=${url} err=${err?.name ?? ''}:${err?.message ?? err}`,
    );

    throw err;
  } finally {
    clearTimeout(t);
  }
}
