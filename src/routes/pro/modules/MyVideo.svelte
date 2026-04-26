<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import ResVideo from './ResVideo.svelte';
  import History from './History.svelte';
  import TemplateGallery from './TemplateGallery.svelte';

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
    console.log(item, 'itemitemitem');

    manualSelection = item;
    dispatch('select', item); // 回填参数给父组件
  }
</script>

<div class="w-full flex flex-col xl:flex-row gap-6 h-full">
  <div
    class=" w-full h-full flex flex-col
  relative"
  >
    {#if activeItem}
      {#key activeItem.id}
        <ResVideo on:retry item={activeItem} />
      {/key}
    {:else}
      <!-- Empty stage: surface the template wall instead of a placeholder so first-time
           users see what HPVideo can do and can one-click-load any example's params. -->
      <div class="flex-1 border rounded-3xl border-border-light dark:border-border-dark overflow-hidden">
        <TemplateGallery on:select={(e) => dispatch('select', e.detail)} />
      </div>
    {/if}
  </div>

  <aside class="w-full xl:w-[170px] shrink-0 md:h-full overflow-hidden">
    <History {items} selectedId={activeItem?.id} on:select={handleHistorySelect} />
  </aside>
</div>
