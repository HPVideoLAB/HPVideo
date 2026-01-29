<script lang="ts">
  import dayjs from 'dayjs';
  import { toast } from 'svelte-sonner';
  import MyButton from '$lib/components/common/MyButton.svelte';
  import Tooltip from '$lib/components/common/Tooltip.svelte';
  import { modelDuration } from '../../../constants/pro-model';
  import { createEventDispatcher, getContext } from 'svelte';

  type Status = 'processing' | 'completed' | 'failed';
  type ResVideoItem = {
    id: string;
    createdAt: number;
    model: string;
    status: Status;
    prompt: string;
    outputUrl?: string;
    duration?: '';
  };

  export let item: ResVideoItem | undefined;

  const i18n: any = getContext('i18n');
  const dispatch = createEventDispatcher(); // 👈 初始化
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
    console.log('8888888', item, url);
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

  //按钮 (注意：为了让语言切换时按钮文案也能变，建议这里用 reactive $:)
  $: buttons = [
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
      action: (item: any) => downloadVideo(item.outputUrl),
      tooltip: $i18n.t('Download'),
      disabled: false,
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
    class="rounded-2xl border border-border-light bg-bg-light p-6 text-center text-sm
       text-text-lightSecondary
       dark:border-border-dark dark:bg-bg-dark dark:text-text-darkSecondary"
  >
    {$i18n.t('No preview')}
  </div>
{:else}
  <section
    class="rounded-2xl flex flex-col gap-2
         border border-border-light bg-bg-light p-3 shadow-sm
         dark:border-border-dark dark:bg-bg-dark"
  >
    <div class="flex items-center justify-between gap-3">
      <div class="w-full">
        <div class="flex flex-wrap items-center justify-between gap-2 w-full">
          <div class="text-sm font-semibold text-text-light dark:text-text-dark">
            {dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          </div>

          <div class="flex gap-2 items-center">
            <div class="truncate text-sm text-text-lightSecondary dark:text-text-darkSecondary">
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
    </div>

    <div class=" w-full">
      {#if item.status === 'processing'}
        <div class="w-full mx-auto">
          <div class={`${stageClass(item.status)} text-white bg-gray-900 dark:bg-gray-900`} style={boxStyle()}>
            <div class="animate-pulse flex flex-col items-center justify-center">
              <img class="size-10" src="/creator/static/video/video_generating.png" alt="" />
              <span class="text-sm text-gray-50 mt-2">
                {$i18n.t('Video Generating...')}
                ({$i18n.t('(Estimated: ')}{modelDuration[item.model]}{$i18n.t(' minutes)')})
              </span>
              <span class="text-xs text-gray-100/80 mt-1 px-6 text-center">
                {$i18n.t('Please keep this page open')}
              </span>
            </div>
          </div>
        </div>
      {:else if item.status === 'failed'}
        <div class="w-full mx-auto">
          <div class={`${stageClass(item.status)} `} style={boxStyle()}>
            <img class="size-10" src="/creator/static/video/video_generating.png" alt="" />
            <span class="text-sm text-gray-50 mt-2">{$i18n.t('Video Generation Failed')}</span>
            <span class="text-xs text-gray-100/80 mt-1 px-6 text-center">
              {$i18n.t('Please check your assets or prompt and try again')}
            </span>

            <MyButton
              class="mt-2"
              round
              type="primary"
              on:click={(e) => {
                // 1. 获取 MyButton 传递出来的原始 DOM 事件并停止冒泡
                e.detail.stopPropagation();

                // 2. 执行你的逻辑
                dispatch('retry', item);
              }}
            >
              <iconify-icon class="text-xl" icon="mdi:refresh" />
              <span class="!text-[13px]"> {$i18n.t('Free Retry')}</span>
            </MyButton>
          </div>
        </div>
      {:else}
        <div class="w-full mx-auto cursor-pointer">
          <video
            style={boxStyle()}
            class="w-full rounded-2xl border border-border-light dark:border-border-dark bg-black shadow-sm"
            controls
            preload="metadata"
            src={item.outputUrl}
            on:mouseenter={(e) => e.currentTarget.play()}
            on:mouseleave={(e) => e.currentTarget.pause()}
          />
        </div>
      {/if}
    </div>

    <div class="flex flex-wrap justify-end gap-2">
      {#each buttons as button (button.label)}
        <Tooltip content={button.tooltip} placement="top">
          <MyButton circle disabled={button.disabled} on:click={() => button.action(item)}>
            <iconify-icon class="text-base text-text-light dark:text-text-dark" icon={button.icon} />
          </MyButton>
        </Tooltip>
      {/each}
    </div>
  </section>
{/if}
