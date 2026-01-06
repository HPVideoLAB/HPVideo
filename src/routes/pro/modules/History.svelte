<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{ select: HistoryItem }>();

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
  class="rounded-2xl border border-gray-200 p-2
         shadow-sm dark:border-gray-850 md:overflow-y-auto md:h-[calc(100vh-90px)]"
>
  <div
    class="sticky top-0 z-10 p-3 flex items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-850 bg-bg-light dark:bg-bg-dark backdrop-blur-sm"
  >
    <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">历史</div>
    <div class="text-xs text-gray-600 dark:text-gray-400">{items.length}</div>
  </div>

  <div class="mt-3 space-y-2">
    {#if items.length === 0}
      <div
        class="rounded-xl border border-gray-200 px-4 py-8 text-center text-sm text-gray-700
               dark:border-gray-850 dark:text-gray-300"
      >
        暂无记录
      </div>
    {:else}
      {#each items as it (it.id)}
        <button
          type="button"
          on:click={() => dispatch('select', it)}
          class={`group w-full overflow-hidden rounded-2xl border p-2 text-left transition relative
            focus:outline-none 
            ${
              it.id === selectedId
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-500'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:hover:border-gray-700 dark:hover:bg-gray-900'
            }`}
        >
          <div class="flex flex-col gap-2">
            <div class="w-full aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900 relative">
              {#if !it.outputUrl || !loadedMedia.has(it.id)}
                <div
                  class="absolute inset-0 z-20 flex items-center justify-center bg-gray-200 dark:bg-gray-800 animate-pulse"
                >
                  {#if it.status === 'processing'}
                    <div class="flex flex-col items-center opacity-50">
                      <iconify-icon icon="eos-icons:loading" class="text-2xl mb-1" />
                      <span class="text-[10px]">生成中...</span>
                    </div>
                  {:else if it.status === 'failed'}
                    <div class="flex flex-col items-center text-red-500/70">
                      <iconify-icon icon="mdi:alert-circle-outline" class="text-2xl mb-1" />
                      <span class="text-[10px]">失败</span>
                    </div>
                  {:else}
                    <iconify-icon icon="mdi:video-outline" class="text-2xl opacity-20" />
                  {/if}
                </div>
              {/if}

              {#if it.outputUrl}
                <video
                  src={it.outputUrl}
                  class={`w-full h-full object-cover transition-opacity duration-500 ${
                    loadedMedia.has(it.id) ? 'opacity-100' : 'opacity-0'
                  }`}
                  muted
                  loop
                  playsinline
                  on:loadeddata={() => handleMediaLoaded(it.id)}
                  on:mouseenter={(e) => e.currentTarget.play()}
                  on:mouseleave={(e) => e.currentTarget.pause()}
                />
              {/if}
            </div>

            <div class="px-1">
              <p class="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 truncate">
                {it.prompt}
              </p>
              <div class="flex justify-between items-center mt-1">
                <span class="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
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
