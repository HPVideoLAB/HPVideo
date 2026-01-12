<script lang="ts">
  import { createEventDispatcher, getContext } from 'svelte';
  import VideoPreview from '$lib/components/common/VideoPreview.svelte';
  import { exampleData } from '../../../constants/example-data';
  // 引入 fade 动画可以让切换更丝滑（可选）
  import { fade } from 'svelte/transition';

  export let currentModelValue: string = '';

  const dispatch = createEventDispatcher();
  const i18n: any = getContext('i18n');

  $: examples = (() => {
    if (!currentModelValue) return [];
    if (exampleData[currentModelValue]) {
      return exampleData[currentModelValue];
    }
    if (currentModelValue.includes('pika')) return exampleData['pika-v2.2-pikaframes'] || [];
    if (currentModelValue.includes('wan')) return exampleData['wan-2.1-v2v'] || [];
    if (currentModelValue.includes('sam')) return exampleData['sam3-video'] || [];
    return [];
  })();

  function handleApply(e: CustomEvent) {
    console.log('User applied params:', e.detail);
    dispatch('select', { params: e.detail });
  }

  $: console.log('currentModelValue:', currentModelValue);
</script>

<div class="p-3 border border-gray-200 dark:border-gray-850 rounded-2xl">
  <div class="flex items-center justify-between mb-3 px-1">
    <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-200">
      {$i18n.t('Example Showcase')}
      <span class="text-xs font-normal text-gray-500 ml-2">{$i18n.t('Click to apply parameters')}</span>
    </h2>
  </div>

  {#key currentModelValue}
    <div in:fade={{ duration: 200 }} class="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {#each examples as item (item.id)}
        <VideoPreview
          src={item.videoUrl}
          poster={item.coverUrl}
          title={item.title}
          params={item.params}
          on:apply={handleApply}
        />
      {/each}

      {#if examples.length === 0}
        <div
          class="col-span-full text-center text-gray-500 text-xs py-6 bg-gray-50 dark:bg-white/5 rounded-lg border border-dashed border-gray-200 dark:border-white/10"
        >
          {$i18n.t('No example data for this model')}
        </div>
      {/if}
    </div>
  {/key}
</div>
