<script lang="ts">
  import { getContext } from 'svelte';
  import MyButton from '$lib/components/common/MyButton.svelte';

  const i18n: any = getContext('i18n');

  type Side = 'A' | 'B';

  export let side: Side;

  export let nameKey = 'Model A';
  export let providerKey = '';
  export let videoUrl = '';
  export let answerTextKey = '';

  export let showResult = false;
  export let isWinner = false;
  export let communityScore = 0;
  export let rewardText = '+0 pts';

  export let onPick: (side: Side) => void;

  // 颜色（A 紫、B 蓝）
  $: pillClass = side === 'A' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white';

  $: providerClass = side === 'A' ? 'text-purple-600 dark:text-purple-300' : 'text-blue-600 dark:text-blue-300';

  $: headerGlow = side === 'A' ? 'from-fuchsia-500/15 via-purple-500/10' : 'from-sky-500/15 via-blue-500/10';

  $: tone = !showResult
    ? ''
    : isWinner
    ? 'ring-2 ring-primary-500/70 shadow-[0_0_60px_rgba(34,197,94,0.20)]'
    : 'opacity-55 saturate-[0.9] grayscale-[0.15]';
</script>

<div
  class="rounded-3xl border border-border-light dark:border-border-dark
         bg-white/75 dark:bg-[#0B0F14]/70 backdrop-blur-xl
         overflow-hidden
         {tone}"
>
  <!-- Header -->
  <div class="px-5 py-4 flex items-center justify-between relative">
    <div class="absolute inset-0 opacity-90 bg-gradient-to-r {headerGlow} to-transparent" />
    <div class="relative flex items-center gap-2">
      <span class="inline-flex rounded-xl px-3 py-1 text-sm font-extrabold {pillClass}">
        {$i18n.t(nameKey)}
      </span>
    </div>
    <div class="relative text-sm font-semibold {providerClass}">
      {$i18n.t(providerKey)}
    </div>
  </div>

  <div class="p-5 space-y-4">
    <!-- Video -->
    <div
      class="rounded-2xl overflow-hidden border border-border-light dark:border-border-dark
             bg-black"
    >
      <video class="w-full h-[220px] md:h-[280px] object-cover" src={videoUrl} controls playsinline />
    </div>

    <!-- Text -->
    <div
      class="rounded-2xl border border-border-light dark:border-border-dark
             bg-white/90 dark:bg-black/25
             p-4 text-sm md:text-base text-gray-800 dark:text-gray-100
             leading-relaxed max-h-[220px] overflow-auto"
    >
      {$i18n.t(answerTextKey)}
    </div>

    {#if !showResult}
      <MyButton type="primary" round class="w-full py-4 h-10" on:click={() => onPick?.(side)}>
        <span class="flex items-center justify-center gap-2">
          <iconify-icon icon="ph:check-circle-fill" class="text-xl" />
          {$i18n.t(side === 'A' ? 'Choose Model A' : 'Choose Model B')}
        </span>
      </MyButton>
    {:else}
      <div
        class="rounded-2xl px-4 py-4 border border-border-light dark:border-border-dark
               bg-gray-50/70 dark:bg-white/5"
      >
        <div class="flex items-center justify-between text-sm md:text-base">
          <div class="text-gray-600 dark:text-gray-300">{$i18n.t('Community score')}</div>
          <div class="font-extrabold text-gray-900 dark:text-gray-100">{communityScore.toFixed(2)}%</div>
        </div>
        <div class="flex items-center justify-between mt-2 text-sm md:text-base">
          <div class="text-gray-600 dark:text-gray-300">{$i18n.t('Your reward')}</div>
          <div class="font-extrabold text-primary-600 dark:text-primary-300">{rewardText}</div>
        </div>
      </div>
    {/if}
  </div>
</div>
