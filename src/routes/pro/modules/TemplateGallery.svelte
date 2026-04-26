<script lang="ts">
  // First-load template wall: shows every example across all models so a
  // brand-new user has immediate inspiration instead of an empty stage.
  // Click a card -> applies that template's params and switches to its
  // model in the parent page.
  import { createEventDispatcher, getContext } from 'svelte';
  import { fade } from 'svelte/transition';
  import VideoPreview from '$lib/components/common/VideoPreview.svelte';
  import { exampleData, type ExampleItem } from '../../../constants/example-data';
  import { proModel } from '../../../constants/pro-model';

  const dispatch = createEventDispatcher();
  const i18n: any = getContext('i18n');

  type FlatExample = ExampleItem & { modelKey: string; modelLabel: string };

  const modelLabels: Record<string, string> = Object.fromEntries(
    proModel.map((m) => [m.model, m.name]),
  );

  const flatExamples: FlatExample[] = Object.entries(exampleData).flatMap(
    ([modelKey, items]) =>
      (items || []).map((item) => ({
        ...item,
        modelKey,
        modelLabel: modelLabels[modelKey] || modelKey,
      })),
  );

  $: filters = [
    { key: 'all', label: $i18n.t('All') },
    ...proModel.map((m) => ({ key: m.model, label: m.name })),
  ];

  let activeFilter = 'all';

  $: visible = activeFilter === 'all'
    ? flatExamples
    : flatExamples.filter((e) => e.modelKey === activeFilter);

  function handleApply(item: FlatExample, e: CustomEvent) {
    dispatch('select', {
      modelKey: item.modelKey,
      params: e.detail,
    });
  }
</script>

<div class="w-full h-full overflow-y-auto px-4 md:px-8 py-6 md:py-10">
  <div class="max-w-6xl mx-auto">
    <header class="mb-5 md:mb-8">
      <h1
        class="text-xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary-400 via-primary-500 to-violet-400 bg-clip-text text-transparent"
      >
        {$i18n.t('Pick a template to get started')}
      </h1>
      <p class="mt-2 text-xs md:text-sm text-gray-500 dark:text-gray-400">
        {$i18n.t('Click any template to load its prompt, reference, and parameters. Edit then generate.')}
      </p>
    </header>

    <!-- Model filter tabs -->
    <div class="flex flex-wrap gap-2 mb-5">
      {#each filters as f (f.key)}
        <button
          type="button"
          class="px-3 py-1.5 text-xs md:text-sm rounded-full border transition
            {activeFilter === f.key
              ? 'border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-300'
              : 'border-border-light dark:border-border-dark text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600'}"
          on:click={() => (activeFilter = f.key)}
        >
          {f.label}
        </button>
      {/each}
    </div>

    <!-- Grid -->
    {#key activeFilter}
      <div in:fade={{ duration: 180 }} class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
        {#each visible as item (item.id)}
          <div class="space-y-1.5">
            <VideoPreview
              src={item.videoUrl}
              poster={item.coverUrl}
              title={item.title}
              params={item.params}
              on:apply={(e) => handleApply(item, e)}
            />
            <div class="flex items-center justify-between px-1">
              <p class="text-xs font-medium text-gray-700 dark:text-gray-200 truncate" title={item.title}>
                {item.title}
              </p>
              <span
                class="ml-2 shrink-0 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-md
                  bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400"
              >
                {item.modelLabel}
              </span>
            </div>
          </div>
        {/each}
      </div>
    {/key}
  </div>
</div>
