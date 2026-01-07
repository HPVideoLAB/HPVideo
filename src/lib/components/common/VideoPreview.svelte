<!-- VideoPreview.svelte
  - 数据驱动 actions（overlay / dialog）
  - 骨架屏（封面/metadata 未就绪）
  - 弹窗按原视频比例展示（aspect-ratio = videoWidth/videoHeight）
  - 无 Svelte a11y 警告：不在 div/dialog 上绑 click；全部用 button/a
-->
<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import MyButton from '$lib/components/common/MyButton.svelte';
  type VideoPreviewParams = Record<string, any>;
  type Aspect = 'video' | 'square' | '4/3';

  type ActionKey = 'apply' | 'open' | 'download' | 'close';
  type ActionPlacement = 'overlay' | 'dialog';

  type Action = {
    key: ActionKey;
    icon: string;
    title: string;
    label?: string;
    placement: ActionPlacement;
    variant?: 'primary' | 'neutral';
  };

  export let src: string;
  export let poster: string | undefined = undefined;
  export let title: string = '';
  export let params: VideoPreviewParams = {};
  export let aspect: Aspect = 'video';

  /**
   * 数据驱动 actions：
   * - overlay: 封面左上按钮（填充参数 / 播放）
   * - dialog: 弹窗右上按钮（编辑=填充参数 / 下载 / 关闭）
   */
  export let actions: any = [
    { key: 'apply', icon: 'mdi:pencil-outline', title: '填充参数', placement: 'overlay', variant: 'neutral' },
    { key: 'open', icon: 'mdi:play', title: '播放/预览', placement: 'overlay', variant: 'primary' },

    {
      key: 'apply',
      icon: 'mdi:pencil-outline',
      title: '编辑（填充参数）',
      label: '编辑',
      placement: 'dialog',
      variant: 'primary',
    },
    {
      key: 'download',
      icon: 'mdi:download',
      title: '下载视频',
      label: '下载',
      placement: 'dialog',
      variant: 'primary',
    },
    { key: 'close', icon: 'mdi:close', title: '关闭', placement: 'dialog', variant: 'primary' },
  ];

  const dispatch = createEventDispatcher<{ apply: VideoPreviewParams }>();

  let dialogEl: HTMLDialogElement | null = null;

  // 用于弹窗播放的 video
  let playerEl: HTMLVideoElement | null = null;

  // 骨架屏：封面 load 或预览 metadata ready 后消失
  let isPosterReady = false;

  // 弹窗按原视频比例展示
  let videoAspect = 16 / 9;

  const aspectClass = aspect === 'square' ? 'aspect-square' : aspect === '4/3' ? 'aspect-[4/3]' : 'aspect-video';

  $: overlayActions = actions.filter((a) => a.placement === 'overlay');
  $: dialogActions = actions.filter((a) => a.placement === 'dialog');

  function open() {
    if (!dialogEl) return;
    if (!dialogEl.open) dialogEl.showModal();
    queueMicrotask(() => playerEl?.play().catch(() => void 0));
  }

  function close() {
    if (!dialogEl) return;
    playerEl?.pause();
    if (playerEl) playerEl.currentTime = 0;
    dialogEl.close();
  }

  function apply() {
    dispatch('apply', params);
  }

  function onMeta() {
    if (!playerEl) return;
    const w = playerEl.videoWidth || 16;
    const h = playerEl.videoHeight || 9;
    videoAspect = w / h;
  }

  function runAction(key: ActionKey, e?: MouseEvent) {
    e?.stopPropagation();
    switch (key) {
      case 'apply':
        apply();
        break;
      case 'open':
        open();
        break;
      case 'close':
        close();
        break;
      case 'download':
        // 下载使用 <a>，无需这里处理
        break;
    }
  }

  function btnHover(variant: Action['variant'] = 'neutral') {
    return variant === 'primary' ? 'hover:border-primary-500/40 hover:text-primary-300' : 'hover:border-gray-700';
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && dialogEl?.open) close();
  }

  onMount(() => window.addEventListener('keydown', onKeydown));
  onDestroy(() => window.removeEventListener('keydown', onKeydown));
</script>

<!-- 封面卡片：整体可点击打开 -->
<button
  type="button"
  class="group relative w-full overflow-hidden rounded-2xl
         bg-bg-light dark:bg-bg-dark
         border border-border-light dark:border-border-dark
         transition
         hover:border-gray-300 dark:hover:border-gray-700
         hover:shadow-[0_10px_30px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
  on:click={open}
  aria-label={title ? `Open video: ${title}` : 'Open video'}
>
  <div class={`relative w-full ${aspectClass}`}>
    <!-- 骨架屏 -->
    {#if !isPosterReady}
      <div class="absolute inset-0 z-20 overflow-hidden bg-gray-200 dark:bg-gray-850">
        <div class="skeleton-shimmer" />

        <div class="absolute inset-0 flex items-center justify-center opacity-10 dark:opacity-20">
          <iconify-icon icon="mdi:image-filter-hdr" class="text-5xl text-gray-400 dark:text-gray-500" />
        </div>
      </div>
    {/if}

    {#if poster}
      <img
        src={poster}
        alt={title || 'video'}
        class={`h-full w-full min-h-[90px] object-cover transition ${
          isPosterReady ? 'opacity-95 group-hover:opacity-100' : 'opacity-0'
        }`}
        loading="lazy"
        on:load={() => (isPosterReady = true)}
        on:error={() => (isPosterReady = true)}
        referrerpolicy="no-referrer"
      />
    {:else}
      <!-- 没有 poster：用静音 video 做缩略 -->
      <video
        class={`h-full w-full object-cover transition ${
          isPosterReady ? 'opacity-90 group-hover:opacity-100' : 'opacity-0'
        }`}
        {src}
        muted
        playsinline
        preload="metadata"
        on:loadedmetadata={() => (isPosterReady = true)}
        on:error={() => (isPosterReady = true)}
      />
    {/if}

    <!-- hover 暗幕 -->
    <div class="absolute inset-0 bg-black/15 dark:bg-black/25 opacity-0 transition group-hover:opacity-100" />

    <!-- 左上 actions（数据驱动） -->
    <div
      class="absolute left-1/2 top-1/2 z-10 flex items-center gap-1
         -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-150
         group-hover:opacity-100 focus-within:opacity-100"
    >
      {#each overlayActions as a (a.key + a.icon)}
        <button
          type="button"
          class={`flex h-9 w-9 items-center justify-center rounded-xl
          border border-border-light dark:border-white/10
          bg-white/70 dark:bg-black/45
          text-text-light dark:text-gray-200
          backdrop-blur transition
          hover:bg-white/85 dark:hover:bg-black/55
          ${btnHover(a.variant)}`}
          on:click={(e) => runAction(a.key, e)}
          title={a.title}
          aria-label={a.title}
        >
          <iconify-icon
            icon={a.icon}
            class={`text-xl ${a.key === 'open' ? 'text-primary-500 dark:text-primary-400' : ''}`}
          />
        </button>
      {/each}
    </div>
  </div>
</button>

<!-- 弹窗：不在 dialog/div 上绑 click（避免 a11y 警告） -->
<dialog bind:this={dialogEl} class="bg-transparent p-0 rounded-2xl backdrop:bg-black/70 overflow-hidden">
  <!-- Overlay：点击关闭 -->
  <button type="button" class="fixed inset-0 cursor-default" aria-label="Close preview" on:click={close} />

  <!-- 居中容器（无 click handler） -->
  <div class="fixed inset-0 flex items-center justify-center p-3 md:p-6">
    <!-- 外壳 -->
    <div
      class="relative z-10 w-[min(980px,94vw)] max-h-[90vh] overflow-hidden rounded-2xl
           border border-border-light dark:border-border-dark
           bg-bg-light dark:bg-gray-950
           flex flex-col"
    >
      <!-- 顶栏 -->
      <div
        class="shrink-0 flex items-center justify-between border-b border-border-light dark:border-border-dark px-4 py-3"
      >
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-text-light dark:text-text-dark">{title || 'Preview'}</p>
        </div>

        <div class="flex items-center gap-1">
          {#each dialogActions as a (a.key + a.icon)}
            {#if a.key === 'download'}
              <MyButton
                type="default"
                size="small"
                ghost
                href={src}
                download
                target="_blank"
                rel="noreferrer"
                title={a.title}
                aria-label={a.title}
                class="shadow-sm"
              >
                <div class="flex items-center gap-1">
                  <iconify-icon icon={a.icon} class="text-lg" />
                  {#if a.label}<span class="hidden sm:inline">{a.label}</span>{/if}
                </div>
              </MyButton>
            {:else if a.key === 'close' && !a.label}
              <MyButton
                type="default"
                size="small"
                text
                circle
                title={a.title}
                aria-label={a.title}
                on:click={(e) => runAction(a.key, e)}
                class="h-9 w-9 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <div class="flex items-center gap-1">
                  <iconify-icon icon={a.icon} class="text-xl" />
                </div>
              </MyButton>
            {:else}
              <MyButton
                type={a.key === 'edit' ? 'primary' : 'default'}
                size="small"
                ghost={a.key !== 'edit'}
                title={a.title}
                aria-label={a.title}
                on:click={(e) => runAction(a.key, e)}
                class="shadow-sm"
              >
                <div class="flex items-center gap-1">
                  <iconify-icon icon={a.icon} class="text-lg" />
                  {#if a.label}<span class="hidden sm:inline">{a.label}</span>{/if}
                </div>
              </MyButton>
            {/if}
          {/each}
        </div>
      </div>

      <!-- 视频区：真实比例容器 + 不超过视口高度 -->
      <div class="bg-black">
        <!-- 说明：
          - aspect-ratio 用真实视频比例
          - max-height 扣掉顶栏高度，避免超出 90vh
          - 这里按 px-4 py-3 的顶栏高度大概 56px（可按你实际调整 56~72）
        -->
        <div class="w-full" style={`aspect-ratio: ${videoAspect}; max-height: calc(90vh - 56px);`}>
          <video
            bind:this={playerEl}
            class="h-full w-full object-contain"
            {src}
            controls
            playsinline
            preload="metadata"
            on:loadedmetadata={onMeta}
          />
        </div>
      </div>
    </div>
  </div>
</dialog>

<style>
  /* 定义扫光动画关键帧 */
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  /* 扫光条样式 */
  .skeleton-shimmer {
    position: absolute;
    inset: 0;
    /* 核心：线性渐变，中间亮，两边透明 */
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.05) 40%,
      /* 亮光部分 (浅色模式可调深一点) */ rgba(255, 255, 255, 0.1) 50%,
      /* 最亮处 */ rgba(255, 255, 255, 0.05) 60%,
      transparent 100%
    );
    transform: translateX(-100%);
    animation: shimmer 1.5s infinite; /* 1.5秒循环一次 */
  }

  /* 浅色模式下的微调 (可选) */
  :global(.light) .skeleton-shimmer {
    background: linear-gradient(90deg, transparent 0%, rgba(0, 0, 0, 0.04) 50%, transparent 100%);
  }
</style>
