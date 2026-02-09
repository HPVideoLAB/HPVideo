<script lang="ts">
  import { getContext } from 'svelte';
  import Tooltip from '$lib/components/common/Tooltip.svelte';
  import MyButton from '$lib/components/common/MyButton.svelte';
  import { mediaQuery } from 'svelte-legos';

  const i18n: any = getContext('i18n');
  const isMobile = mediaQuery('(max-width: 768px)');

  export let overview: {
    weeklyPoints: number;
    weeklyPointsDelta: number;
    totalPoints: number;

    weeklyRank: number;
    weeklyRankDelta: number;
    percentile: string;

    rewardsUsd: number;
  };

  // 父组件传入回调（不使用 dispatch，写法更直观）
  export let onViewRewardDetails: () => void = () => {};

  // 数字格式化：不引入额外库，尽量简洁
  const fmt = (n: number) => new Intl.NumberFormat('en-US').format(n);

  // 小标签文字：上升/下降/今日
  function deltaText(delta: number) {
    if (delta > 0) return `+${fmt(delta)}`;
    if (delta < 0) return `${fmt(delta)}`;
    return `${fmt(0)}`;
  }
</script>

<!-- ✅ 这块对应你截图中间那一排 3 张卡片 -->
<div class="w-full">
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <!-- Card 1: Weekly Points -->
    <section
      class="rounded-2xl border border-border-light dark:border-border-dark
             bg-bg-light/50 dark:bg-bg-dark/50 backdrop-blur-md
             shadow-[0_10px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.35)]
             p-5"
    >
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-2">
          <span
            class="h-10 w-10 rounded-full bg-primary-500/15 flex items-center justify-center
                   border border-primary-500/30"
          >
            <iconify-icon icon="ph:flag-fill" class="text-xl text-primary-500" />
          </span>
        </div>

        <Tooltip content={$i18n.t('Change since today')} placement="top">
          <span
            class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
                   bg-primary-500/15 text-primary-500 border border-primary-500/25"
          >
            {deltaText(overview.weeklyPointsDelta)}
            {$i18n.t('Today')}
          </span>
        </Tooltip>
      </div>

      <div class="mt-4">
        <div class="text-4xl font-extrabold tracking-tight">{fmt(overview.weeklyPoints)}</div>
        <div class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {$i18n.t('My weekly points')}
        </div>
      </div>

      <div class="mt-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>{$i18n.t('Total points')}</span>
        <span class="text-gray-700 dark:text-gray-200">{fmt(overview.totalPoints)} {$i18n.t('pts')}</span>
      </div>
    </section>

    <!-- Card 2: Weekly Rank -->
    <section
      class="rounded-2xl border border-border-light dark:border-border-dark
             bg-bg-light/50 dark:bg-bg-dark/50 backdrop-blur-md
             shadow-[0_10px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.35)]
             p-5"
    >
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-2">
          <span
            class="h-10 w-10 rounded-full bg-primary-500/15 flex items-center justify-center
                   border border-primary-500/30"
          >
            <iconify-icon icon="ph:chart-line-up-fill" class="text-xl text-primary-500" />
          </span>
        </div>

        <Tooltip content={$i18n.t('Rank movement this week')} placement="top">
          <span
            class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
                   bg-primary-500/15 text-primary-500 border border-primary-500/25"
          >
            <iconify-icon icon="ph:arrow-up-right-bold" class="text-sm" />
            {deltaText(overview.weeklyRankDelta)}
          </span>
        </Tooltip>
      </div>

      <div class="mt-4">
        <div class="text-4xl font-extrabold tracking-tight">#{fmt(overview.weeklyRank)}</div>
        <div class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {$i18n.t('Weekly rank')}
        </div>
      </div>

      <div class="mt-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>{$i18n.t('Percentile')}</span>
        <span class="text-gray-700 dark:text-gray-200">{overview.percentile}</span>
      </div>

      <div class="mt-4 flex justify-end">
        <MyButton
          type="primary"
          size={$isMobile ? 'small' : 'medium'}
          class="rounded-full"
          on:click={onViewRewardDetails}
          tooltip={$i18n.t('Learn how ranking and points work.')}
        >
          {$i18n.t('View details')}
        </MyButton>
      </div>
    </section>

    <!-- Card 3: Rewards -->
    <section
      class="rounded-2xl border border-border-light dark:border-border-dark
             bg-bg-light/50 dark:bg-bg-dark/50 backdrop-blur-md
             shadow-[0_10px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.35)]
             p-5"
    >
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-2">
          <span
            class="h-10 w-10 rounded-full bg-primary-500/15 flex items-center justify-center
                   border border-primary-500/30"
          >
            <iconify-icon icon="ph:currency-dollar-fill" class="text-xl text-primary-500" />
          </span>
        </div>
      </div>

      <div class="mt-4">
        <div class="text-4xl font-extrabold tracking-tight">${fmt(overview.rewardsUsd)}</div>
        <div class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {$i18n.t('Rewards earned')}
        </div>
      </div>

      <div class="mt-4 flex items-center justify-between text-sm">
        <button
          class="text-primary-500 hover:text-primary-600 font-semibold inline-flex items-center gap-1 transition"
          on:click={onViewRewardDetails}
        >
          {$i18n.t('Learn more')}
          <iconify-icon icon="ph:arrow-right-bold" class="text-base" />
        </button>
      </div>
    </section>
  </div>
</div>
