<!-- History.svelte -->
<script lang="ts">
  import { getContext } from 'svelte';
  import dayjs from 'dayjs';
  import { mobile } from '$lib/stores';
  import { toast } from 'svelte-sonner';

  const i18n: any = getContext('i18n');

  type Status = 'processing' | 'completed' | 'failed';

  type HistoryItem = {
    id: string;
    createdAt: number; // unix seconds
    model: string;
    status: Status;
    prompt: string;
    outputUrl?: string;
    // 去掉 videosize（固定 16:9 不再需要）
  };

  // ===== 静态数据（示例） =====
  let items: HistoryItem[] = [
    {
      id: 'req_9b7c2a1',
      createdAt: Math.floor(Date.now() / 1000) - 120,
      model: 'Pika · Img-to-Video',
      status: 'processing',
      prompt: 'A calm rainy street at night, neon reflections, cinematic, shallow depth of field, slow dolly forward',
    },
    {
      id: 'req_6f1a9d0',
      createdAt: Math.floor(Date.now() / 1000) - 3600,
      model: 'Pika · Img-to-Video',
      status: 'completed',
      prompt: 'A futuristic city skyline, sunrise, volumetric light, ultra wide, smooth camera movement',
      outputUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    },
    {
      id: 'req_21d0c8e',
      createdAt: Math.floor(Date.now() / 1000) - 86400,
      model: 'Pika · Img-to-Video',
      status: 'failed',
      prompt: 'Macro shot of a butterfly wing, glitter particles, dreamy bokeh, soft pastel palette',
    },
  ];

  function statusText(s: Status) {
    if (s === 'completed') return $i18n.t('Completed');
    if (s === 'processing') return $i18n.t('Video Generating...');
    return $i18n.t('Video Generation Failed');
  }

  function statusBadgeClass(s: Status) {
    if (s === 'completed')
      return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200';
    if (s === 'processing')
      return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200';
    return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200';
  }

  // 固定 16:9：移动端不限制宽度；桌面端统一 max-w 600
  function generatingBoxClass() {
    return `flex justify-center flex-col items-center w-full ${
      $mobile ? '' : 'max-w-[600px]'
    } rounded-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500`;
  }

  // 固定 16:9
  function generatingBoxStyle() {
    return 'aspect-ratio: 16/9';
  }

  async function copyText(text: string, okMsg: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(okMsg);
    } catch {
      toast.error($i18n.t('Copy failed'));
    }
  }

  function downloadVideo(url?: string) {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.download = '';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function openVideo(url?: string) {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }
</script>

<section class="mx-auto">
  {#if items.length === 0}
    <div
      class="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-700
             dark:border-gray-850 dark:bg-gray-950 dark:text-gray-300"
    >
      {$i18n.t('No history yet')}
    </div>
  {:else}
    <div class="space-y-3 md:w-[50%]">
      {#each items as item (item.id)}
        <div class="rounded-2xl border border-gray-200 bg-transparent p-3 sm:p-4 dark:border-gray-850">
          <!-- 顶部：时间 / 模型 / 状态 + 操作 -->
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {dayjs(item.createdAt * 1000).format('YYYY-MM-DD HH:mm')}
                </div>

                <span class="text-xs text-gray-600 dark:text-gray-400">·</span>

                <div class="truncate text-sm text-gray-700 dark:text-gray-300">
                  {item.model}
                </div>

                <span
                  class={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${statusBadgeClass(
                    item.status
                  )}`}
                >
                  {statusText(item.status)}
                </span>
              </div>
            </div>

            <!-- 按钮：播放 / 复制prompt / 下载 -->
            <div class="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                class="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-medium
                       text-gray-900 hover:border-primary-500 hover:text-primary-500
                       dark:border-gray-700 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!item.outputUrl}
                on:click={() => openVideo(item.outputUrl)}
              >
                {$i18n.t('Play')}
              </button>

              <button
                type="button"
                class="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-medium
                       text-gray-900 hover:border-primary-500 hover:text-primary-500
                       dark:border-gray-700 dark:text-gray-100"
                on:click={() => copyText(item.prompt, $i18n.t('Prompt copied'))}
              >
                {$i18n.t('Copy Prompt')}
              </button>

              <button
                type="button"
                class="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-medium
                       text-gray-900 hover:border-primary-500 hover:text-primary-500
                       dark:border-gray-700 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!item.outputUrl}
                on:click={() => downloadVideo(item.outputUrl)}
              >
                {$i18n.t('Download')}
              </button>
            </div>
          </div>

          <!-- 内容：根据状态展示不同 UI -->
          <div class="mt-3">
            {#if item.status === 'processing'}
              <div class="w-full">
                <div class="animate-pulse flex w-full">
                  <div class={generatingBoxClass()} style={generatingBoxStyle()}>
                    <img class="size-10" src="/creator/static/video/video_generating.png" alt="" />
                    <span class="text-sm text-gray-50 mt-1">{$i18n.t('Video Generating...')}</span>
                  </div>
                </div>
              </div>
            {:else if item.status === 'failed'}
              <div class="w-full">
                <div class="flex w-full">
                  <div
                    class={`${generatingBoxClass()} bg-gradient-to-r from-red-600 via-rose-600 to-pink-600`}
                    style={generatingBoxStyle()}
                  >
                    <img class="size-10" src="/creator/static/video/video_generating.png" alt="" />
                    <span class="text-sm text-gray-50 mt-1">视频生成失败</span>
                    <span class="text-xs text-gray-100/80 mt-1 px-4 text-center">请检查素材或提示词后重试</span>
                  </div>
                </div>
              </div>
            {:else}
              <div class="w-full {$mobile ? '' : 'max-w-[600px]'}">
                <video
                  style={generatingBoxStyle()}
                  class="w-full max-h-[300px] rounded-xl border border-gray-200 dark:border-gray-850"
                  controls
                  preload="metadata"
                  src={item.outputUrl}
                />
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</section>
