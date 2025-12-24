/**
 * 通用轮询工具（无依赖）
 *
 * 能力：
 * 1) 每隔 intervalMs 串行调用一次 fetcher()
 * 2) 满足 shouldStop(data) 时停止并返回 data
 * 3) 超过 timeoutMs 仍未满足条件 => 抛出 Polling timeout
 * 4) 支持 AbortSignal：外部可取消（组件卸载、用户点击取消、发起新任务前停止旧轮询）
 *
 * 关键修复：
 * - 解决 AbortSignal 监听器泄漏：
 *   以前写法每轮 setTimeout 都 addEventListener('abort')，但不 abort 就永远不移除。
 *   这里保证无论 resolve/reject，都清理 timer + removeEventListener。
 */

export type PollOptions<T> = {
  intervalMs?: number; // 每次轮询间隔，默认 3000ms
  timeoutMs?: number; // 最大轮询时长，默认 250000ms
  shouldStop: (data: T) => boolean; // 何时停止（例如 status === completed/failed）
  onTick?: (data: T) => void; // 每次拿到数据后的回调（可选，用于更新 UI）
  signal?: AbortSignal; // 外部取消信号（可选）
};

/**
 * 可取消的 sleep：
 * - 正常到时 resolve
 * - signal abort => 立即 reject
 * - 无论哪条路径，都会 cleanup：clearTimeout + removeEventListener
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // 若调用前已经 abort，直接失败
    if (signal?.aborted) return reject(new Error('Polling aborted'));

    let timer: ReturnType<typeof setTimeout> | null = null;

    const onAbort = () => {
      cleanup();
      reject(new Error('Polling aborted'));
    };

    const cleanup = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
    };

    // 注册 abort 监听（必须可移除）
    if (signal) {
      signal.addEventListener('abort', onAbort);
    }

    // 启动定时器
    timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
  });
}

/**
 * 轮询主函数：串行 while 循环，不会出现并发请求堆积
 */
export async function poll<T>(
  fetcher: () => Promise<T>,
  { intervalMs = 20000, timeoutMs = 1800000, shouldStop, onTick, signal }: PollOptions<T>
): Promise<T> {
  const start = Date.now();

  while (true) {
    // 外部取消（例如组件卸载、用户点击取消）
    if (signal?.aborted) throw new Error('Polling aborted');

    // 拉取一次最新数据（串行 await，保证不会并发堆积）
    const data = await fetcher();

    // 每次 tick 给外部更新 UI（可选）
    onTick?.(data);

    // 满足停止条件：返回最后一次 data
    if (shouldStop(data)) return data;

    // 超时：避免无限轮询
    if (Date.now() - start > timeoutMs) throw new Error('Polling timeout');

    // 等待 interval 再进入下一次循环（支持 abort）
    await sleep(intervalMs, signal);
  }
}
