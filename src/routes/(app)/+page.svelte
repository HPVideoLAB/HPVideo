<script lang="ts">
  // Public landing for /creator/. Replaces the prior CSR redirect-to-pro
  // — bots and shared links now see a real hero with template reel +
  // value prop, and /pro is one click away. Returning users with a
  // wallet keystore are forwarded to /pro automatically.
  import { onMount, getContext } from 'svelte';
  import { goto } from '$app/navigation';
  import { fade } from 'svelte/transition';
  import VideoPreview from '$lib/components/common/VideoPreview.svelte';
  import { exampleData, type ExampleItem } from '../../constants/example-data';
  import { proModel } from '../../constants/pro-model';
  import { hasPointsWallet } from '$lib/utils/wallet/dlcp/wallet';
  import { initPageFlag } from '$lib/stores';

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

  // Returning users with a wallet keystore go straight to Studio so the
  // hero never feels like a forced detour. New users see the full landing.
  onMount(() => {
    initPageFlag.set(true);
    if (typeof window !== 'undefined' && hasPointsWallet()) {
      goto('/creator/pro', { replaceState: true });
    }
  });

  function applyTemplate(item: FlatExample) {
    try {
      sessionStorage.setItem('hpv:remix-params', JSON.stringify({ params: item.params }));
    } catch {
      /* sessionStorage unavailable */
    }
    goto('/creator/pro');
  }
</script>

<svelte:head>
  <title>HPVideo Studio · Pro AI video, pay-as-you-go</title>
  <meta
    name="description"
    content="Cinematic AI video on BNB Chain. 12 frontier models, pay-per-clip with credits, no subscription, no signup gate."
  />
</svelte:head>

<div class="w-full min-h-screen bg-bg-light dark:bg-bg-dark text-text-light dark:text-text-dark">
  <!-- Hero -->
  <section class="relative px-4 md:px-8 pt-16 md:pt-24 pb-10 md:pb-14">
    <div class="max-w-[1320px] mx-auto text-center">
      <span
        class="inline-block px-3 py-1 rounded-full text-[11px] uppercase tracking-wider mb-4
        bg-primary-500/10 text-primary-600 dark:text-primary-300 border border-primary-500/20"
      >
        {$i18n.t('12 frontier video models · 1 prompt')}
      </span>
      <h1
        class="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight
        bg-gradient-to-r from-primary-400 via-primary-500 to-violet-400 bg-clip-text text-transparent"
      >
        {$i18n.t('Pro AI video. No signup. No subscription.')}
      </h1>
      <p class="mt-4 text-sm md:text-base text-gray-600 dark:text-gray-300">
        {$i18n.t('Pay-as-you-go. 1,000 credits = $1. From product photo to broadcast-ready ad in one click.')}
      </p>
      <div class="mt-7 flex flex-wrap justify-center gap-3">
        <a
          href="/creator/pro"
          class="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary-500 hover:bg-primary-600 text-white text-sm md:text-base font-semibold shadow-[0_0_30px_rgba(194,19,242,0.35)] transition"
        >
          <iconify-icon icon="mdi:play-circle" class="text-xl" />
          {$i18n.t('Open Studio')}
        </a>
        <a
          href="#templates"
          class="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-border-light dark:border-border-dark text-sm md:text-base font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition"
        >
          <iconify-icon icon="mdi:image-multiple" class="text-xl" />
          {$i18n.t('Browse templates')}
        </a>
      </div>
    </div>
  </section>

  <!-- Template reel -->
  <section id="templates" class="px-4 md:px-8 pb-16">
    <div class="max-w-[1320px] mx-auto">
      <div class="flex items-end justify-between mb-5">
        <div>
          <h2 class="text-lg md:text-2xl font-bold">
            {$i18n.t('Pick a template to get started')}
          </h2>
          <p class="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
            {$i18n.t('Click any template to load its prompt, reference, and parameters. Edit then generate.')}
          </p>
        </div>
      </div>

      <div in:fade={{ duration: 220 }}
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4">
        {#each flatExamples as item (item.id)}
          <div class="space-y-1.5">
            <VideoPreview
              src={item.videoUrl}
              poster={item.coverUrl}
              title={item.title}
              params={item.params}
              on:apply={() => applyTemplate(item)}
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
    </div>
  </section>
</div>
