<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import ResVideo from './ResVideo.svelte';
  import History from './History.svelte';

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

  const dispatch = createEventDispatcher();

  let manualSelection: HistoryItem | null = null;

  // 计算当前激活项
  $: activeItem = manualSelection || (items.length > 0 ? items[0] : null);

  // 自动切换到最新的 processing 任务逻辑 (保持不变)
  let lastFirstId = '';
  $: if (items.length > 0 && items[0].id !== lastFirstId) {
    lastFirstId = items[0].id;
    if (items[0].status === 'processing') {
      manualSelection = null;
    }
  }

  function handleHistorySelect(e: CustomEvent) {
    const item = e.detail;
    manualSelection = item;
    dispatch('select', item); // 回填参数给父组件
  }
</script>

<div class="w-full flex flex-col lg:flex-row gap-3 h-full">
  <div class="flex-1 min-w-0 h-full flex flex-col rounded-2xl border border-white/5 overflow-hidden relative">
    {#if activeItem}
      {#key activeItem.id}
        <ResVideo item={activeItem} />
      {/key}
    {:else}
      <div class="flex-1 flex flex-col items-center justify-center text-center p-3">
        <!-- Icon + glow -->
        <div class="relative mb-2">
          <!-- subtle glow -->
          <div
            class="pointer-events-none absolute inset-0 -z-10 h-16 w-16 rounded-full blur-2xl opacity-30
                 bg-primary-500/30 dark:bg-primary-500/20"
          />
          <iconify-icon icon="mdi:creation-outline" class="text-7xl text-primary-500/70 dark:text-primary-400/70" />
        </div>

        <!-- Text -->
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
          释放你的创造潜力，体验 <span class="text-primary-500/90 dark:text-primary-400">HPVideo AI</span> 的魔力。
        </p>

        <p class="mt-1 text-xs text-gray-500 dark:text-gray-500">选择模型并上传素材，即可开始生成。</p>
      </div>
    {/if}
  </div>

  <aside class="w-full lg:w-[140px] shrink-0 md:h-full overflow-hidden">
    <History {items} selectedId={activeItem?.id} on:select={handleHistorySelect} />
  </aside>
</div>
