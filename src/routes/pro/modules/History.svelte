<script lang="ts">
  import { createEventDispatcher, getContext } from 'svelte';

  const dispatch = createEventDispatcher<{ select: HistoryItem }>();
  const i18n: any = getContext('i18n');

  type Status = 'processing' | 'completed' | 'failed';

  type HistoryItem = {
    id: string;
    createdAt: number;
    model: string;
    status: Status;
    prompt: string;
    outputUrl?: string;
    thumbUrl?: string; // 虽然定义了，但我们不再使用它
  };

  export let items: HistoryItem[] = [];
  export let selectedId: string | undefined;

  // 追踪视频真实加载状态
  let loadedMedia = new Set<string>();

  function handleMediaLoaded(id: string) {
    loadedMedia.add(id);
    loadedMedia = new Set(loadedMedia);
  }
</script>

<section
  class="rounded-2xl border border-border-light dark:border-border-dark
         bg-bg-light dark:bg-bg-dark shadow-sm overflow-hidden
         md:h-[calc(100vh-90px)] md:overflow-y-auto scroll-fade"
>
  <div
    class="sticky top-0 z-10
           p-3 flex items-center justify-between gap-2
           border-b border-border-light dark:border-border-dark
           bg-bg-light/90 dark:bg-bg-dark/80
           supports-[backdrop-filter]:backdrop-blur
           supports-[backdrop-filter]:bg-bg-light/75 supports-[backdrop-filter]:dark:bg-bg-dark/60"
  >
    <div class="text-sm font-semibold text-text-light dark:text-text-dark">{$i18n.t('History')}</div>
    <div class="text-xs text-text-lightSecondary dark:text-text-darkSecondary">{items.length}</div>
  </div>

  <div class="p-3 pt-2 space-y-2">
    {#if items.length === 0}
      <div
        class="rounded-xl border border-border-light dark:border-border-dark
               bg-gray-50 dark:bg-gray-950
               px-4 py-8 text-center text-sm
               text-text-lightSecondary dark:text-text-darkSecondary"
      >
        {$i18n.t('No records')}
      </div>
    {:else}
      {#each items as it (it.id)}
        <button
          type="button"
          on:click={() => dispatch('select', it)}
          class={`group w-full overflow-hidden rounded-2xl border p-2 text-left transition relative
            focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
            focus-visible:ring-offset-2 focus-visible:ring-offset-bg-light dark:focus-visible:ring-offset-bg-dark
            ${
              it.id === selectedId
                ? 'border-primary-500 bg-primary-50/70 dark:bg-primary-900/20 shadow-sm'
                : 'border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark hover:bg-gray-50 dark:hover:bg-gray-900/40 hover:border-gray-300 dark:hover:border-gray-700'
            }`}
        >
          <div class="flex flex-col gap-2">
            <div
              class={`w-full aspect-video rounded-xl overflow-hidden relative
                      bg-gray-100 dark:bg-gray-950
                      border border-border-light/60 dark:border-border-dark/60`}
            >
              {#if !it.outputUrl || !loadedMedia.has(it.id)}
                <div
                  class="absolute inset-0 z-20 flex items-center justify-center
                         bg-gray-200/70 dark:bg-gray-900/60
                         supports-[backdrop-filter]:backdrop-blur-sm
                         animate-pulse"
                >
                  {#if it.status === 'processing'}
                    <div class="flex flex-col items-center text-text-lightSecondary dark:text-text-darkSecondary">
                      <iconify-icon icon="eos-icons:loading" class="text-2xl mb-1" />
                      <span class="text-[10px]">{$i18n.t('Generating...')}</span>
                    </div>
                  {:else if it.status === 'failed'}
                    <div class="flex flex-col items-center text-error-600 dark:text-error-400">
                      <iconify-icon icon="mdi:alert-circle-outline" class="text-2xl mb-1" />
                      <span class="text-[10px]">{$i18n.t('Failed')}</span>
                    </div>
                  {:else}
                    <iconify-icon icon="mdi:video-outline" class="text-2xl opacity-25 dark:opacity-30" />
                  {/if}
                </div>
              {/if}

              {#if it.outputUrl}
                <video
                  src={it.outputUrl}
                  class={`w-full h-full object-cover transition-opacity duration-500
                          ${loadedMedia.has(it.id) ? 'opacity-100' : 'opacity-0'}`}
                  muted
                  loop
                  playsinline
                  on:loadeddata={() => handleMediaLoaded(it.id)}
                  on:mouseenter={(e) => e.currentTarget.play()}
                  on:mouseleave={(e) => e.currentTarget.pause()}
                />
              {/if}

              {#if it.id === selectedId}
                <div class="absolute inset-0 ring-1 ring-primary-500/60 pointer-events-none rounded-xl" />
              {/if}
            </div>

            <div class="px-1">
              <p class="text-xs text-text-lightSecondary dark:text-text-darkSecondary line-clamp-1 truncate">
                {it.prompt}
              </p>

              <div class="flex justify-between items-center mt-1">
                <span
                  class="text-[10px] px-1.5 py-0.5 rounded-full
                         border border-border-light dark:border-border-dark
                         bg-gray-50 dark:bg-gray-900/50
                         text-text-lightSecondary dark:text-text-darkSecondary"
                >
                  {it.model}
                </span>
              </div>
            </div>
          </div>
        </button>
      {/each}
    {/if}
  </div>
</section>

<style>
  .scroll-fade {
    scrollbar-gutter: stable;

    /* 默认：thumb 透明（视觉隐藏） */
    --sb-thumb: rgba(180, 180, 180, 0);
    --sb-thumb-dark: rgba(180, 180, 180, 0);

    /* Firefox 默认 */
    scrollbar-width: thin;
    scrollbar-color: rgba(180, 180, 180, 0) transparent;
  }

  /* hover 或 focus-within：thumb 显现（更“平滑”） */
  .scroll-fade:hover,
  .scroll-fade:focus-within {
    --sb-thumb: rgba(180, 180, 180, 0.35);
    --sb-thumb-dark: rgba(180, 180, 180, 0.25);

    scrollbar-color: rgba(180, 180, 180, 0.35) transparent;
  }

  .dark .scroll-fade:hover,
  .dark .scroll-fade:focus-within {
    scrollbar-color: rgba(180, 180, 180, 0.25) transparent;
  }

  /* WebKit */
  .scroll-fade::-webkit-scrollbar {
    width: 10px;
  }

  .scroll-fade::-webkit-scrollbar-track {
    background: transparent;
  }

  .scroll-fade::-webkit-scrollbar-thumb {
    background-color: var(--sb-thumb);
    border-radius: 999px;
    border: 3px solid transparent;
    background-clip: padding-box;
  }

  /* 暗色：thumb 读另一个变量 */
  .dark .scroll-fade::-webkit-scrollbar-thumb {
    background-color: var(--sb-thumb-dark);
  }
</style>
