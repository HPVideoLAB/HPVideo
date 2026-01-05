<!-- ResVideo.svelte -->
<script lang="ts">
  import { getContext } from 'svelte';
  import dayjs from 'dayjs';
  import { toast } from 'svelte-sonner';
  import MyButton from '$lib/components/common/MyButton.svelte';
  import Tooltip from '$lib/components/common/Tooltip.svelte';

  type Status = 'processing' | 'completed' | 'failed';

  type ResVideoItem = {
    id: string;
    createdAt: number;
    model: string;
    status: Status;
    prompt: string;
    outputUrl?: string;
  };

  export let item: ResVideoItem | undefined;

  const i18n: any = getContext('i18n');

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

  function boxStyle() {
    return 'aspect-ratio: 16/9';
  }

  function stageClass(status: Status) {
    if (status === 'failed') {
      return 'rounded-2xl w-full flex flex-col items-center justify-center bg-gradient-to-r from-red-600 via-rose-600 to-pink-600';
    }
    return 'rounded-2xl w-full flex flex-col items-center justify-center bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500';
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

  //按钮
  const buttons = [
    {
      label: $i18n.t('Copy Prompt'),
      icon: 'mdi:clipboard-text',
      action: (item) => copyText(item.prompt, $i18n.t('Prompt copied')),
      tooltip: $i18n.t('Copy Prompt'),
      disabled: false,
    },
    {
      label: $i18n.t('Download'),
      icon: 'mdi:download',
      action: (item) => downloadVideo(item.outputUrl),
      tooltip: $i18n.t('Download'),
      disabled: !item.outputUrl,
    },
    {
      label: $i18n.t('Good'),
      icon: 'mdi:thumb-up',
      action: (item) => {
        console.log('Good');
      },
      tooltip: $i18n.t('Good'),
      disabled: false,
    },
    {
      label: $i18n.t('Bad'),
      icon: 'mdi:thumb-down',
      action: (item) => {
        console.log('Bad');
      },
      tooltip: $i18n.t('Bad'),
      disabled: false,
    },
  ];
</script>

{#if !item}
  <div
    class="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-700
           dark:border-gray-850 dark:bg-gray-950 dark:text-gray-300"
  >
    {$i18n.t('No preview')}
  </div>
{:else}
  <section class="rounded-2xl flex flex-col gap-4 border border-border-light p-3 sm:p-4 dark:border-border-dark">
    <!-- 顶部信息条：时间 / 模型 / 状态 + 操作（贴近你 History 的那套样式） -->
    <div class="flex items-center justify-between gap-3">
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
    </div>

    <!-- 主预览区域：只显示一个 -->
    <div class=" w-full">
      {#if item.status === 'processing'}
        <div class="w-full mx-auto">
          <div class={`${stageClass(item.status)}`} style={boxStyle()}>
            <div class="animate-pulse flex flex-col items-center justify-center">
              <img class="size-10" src="/creator/static/video/video_generating.png" alt="" />
              <span class="text-sm text-gray-50 mt-2">{$i18n.t('Video Generating...')}</span>
              <span class="text-xs text-gray-100/80 mt-1 px-6 text-center">
                {$i18n.t('Please keep this page open')}
              </span>
            </div>
          </div>
        </div>
      {:else if item.status === 'failed'}
        <div class="w-full mx-auto">
          <div class={`${stageClass(item.status)}`} style={boxStyle()}>
            <img class="size-10" src="/creator/static/video/video_generating.png" alt="" />
            <span class="text-sm text-gray-50 mt-2">{$i18n.t('Video Generation Failed')}</span>
            <span class="text-xs text-gray-100/80 mt-1 px-6 text-center">
              {$i18n.t('Please check your assets or prompt and try again')}
            </span>
          </div>
        </div>
      {:else}
        <div class="w-full mx-auto">
          <video
            style={boxStyle()}
            class="w-full rounded-2xl border border-gray-200 dark:border-gray-850 bg-black"
            controls
            preload="metadata"
            src={item.outputUrl}
          />
        </div>
      {/if}
    </div>

    <div class="flex flex-wrap justify-end gap-2">
      {#each buttons as button (button.label)}
        <Tooltip content={button.tooltip} placement="top">
          <MyButton circle disabled={button.disabled} on:click={button.action}>
            <iconify-icon class="text-base" icon={button.icon} />
          </MyButton>
        </Tooltip>
      {/each}
    </div>
  </section>
{/if}
