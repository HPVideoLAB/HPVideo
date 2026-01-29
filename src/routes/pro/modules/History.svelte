<script lang="ts">
  import { createEventDispatcher, getContext } from 'svelte';
  import MyButton from '$lib/components/common/MyButton.svelte';
  // 1. 引入我们刚才封装的全局指令
  import { lazyRender } from '@/actions/lazyRender';

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
    thumbUrl?: string;
  };

  export let items: HistoryItem[] = [];
  export let selectedId: string | undefined;

  // 视频加载动画状态
  let loadedMedia = new Set<string>();
  function handleMediaLoaded(id: string) {
    loadedMedia.add(id);
    loadedMedia = new Set(loadedMedia);
  }

  // --- 懒加载核心逻辑 ---

  // 2. 存储“允许渲染”的 ID 集合
  let visibleIds = new Set<string>();

  // 3. 回调函数：指令告诉我们“这个ID可见了”，我们把它加入集合
  function handleVisible(id: string) {
    if (!visibleIds.has(id)) {
      visibleIds.add(id);
      visibleIds = new Set(visibleIds);
    }
  }
</script>

<section
  class="scroll-fade rounded-2xl border border-border-light dark:border-border-dark
         bg-bg-light dark:bg-bg-dark shadow-sm overflow-hidden
         md:h-[calc(100vh-90px)] md:overflow-y-auto"
>
  <div
    class="sticky top-0 z-10 bg-purple-500
           p-3 flex items-center justify-between gap-2
           border-b border-border-light dark:border-border-dark
           bg-bg-light/90 dark:bg-bg-dark/80
           supports-[backdrop-filter]:backdrop-blur
           supports-[backdrop-filter]:bg-bg-light/75 supports-[backdrop-filter]:dark:bg-bg-dark/60"
  >
    <div class="text-sm font-semibold text-text-light dark:text-text-dark">{$i18n.t('History')}</div>
    <div class="text-xs text-text-lightSecondary dark:text-text-darkSecondary">{items.length}</div>
  </div>

  <div class="w-full pr-0 p-3 pt-2 space-y-2 grid grid-cols-2 xl:grid-cols-1 gap-2">
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
              use:lazyRender={{ id: it.id, onVisible: handleVisible }}
              class={`w-full aspect-video rounded-xl overflow-hidden relative
                      bg-gray-100 dark:bg-gray-950
                      border border-border-light/60 dark:border-border-dark/60`}
            >
              {#if !it.outputUrl || !loadedMedia.has(it.id) || !visibleIds.has(it.id)}
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

              {#if it.outputUrl && visibleIds.has(it.id)}
                <video
                  src={it.outputUrl}
                  class={`w-full h-full object-cover transition-opacity duration-500
                          ${loadedMedia.has(it.id) ? 'opacity-100' : 'opacity-0'}`}
                  muted
                  loop
                  playsinline
                  preload="metadata"
                  on:loadeddata={() => handleMediaLoaded(it.id)}
                  on:mouseenter={(e) => e.currentTarget.play()}
                  on:mouseleave={(e) => e.currentTarget.pause()}
                />
              {/if}

              {#if it.id === selectedId}
                <div class="absolute inset-0 ring-1 ring-primary-500/60 pointer-events-none rounded-xl" />
              {/if}
            </div>

            <div class="flex items-center md:items-start md:flex-col gap-2">
              <MyButton class="text-xs w-fit " round size="tiny" type="default">
                {it.model}
              </MyButton>
              <p class="text-[9px] pl-1.5 text-text-lightSecondary dark:text-text-darkSecondary line-clamp-1 truncate">
                {it.prompt}
              </p>
            </div>
          </div>
        </button>
      {/each}
    {/if}
  </div>
</section>

<style>
  /* 确保这个类名存在，且有滚动属性，指令依赖它来计算位置 */
  .scroll-fade {
    position: relative; /* 建议加上 relative */

    scrollbar-gutter: stable;
    --sb-thumb: rgba(180, 180, 180, 0);
    --sb-thumb-dark: rgba(180, 180, 180, 0);
    scrollbar-width: thin;
    scrollbar-color: rgba(180, 180, 180, 0) transparent;
  }

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

  .dark .scroll-fade::-webkit-scrollbar-thumb {
    background-color: var(--sb-thumb-dark);
  }
</style>
