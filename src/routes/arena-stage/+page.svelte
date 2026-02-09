<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import WalletConnect from '$lib/components/wallet/WalletConnect.svelte';
  import { initPageFlag } from '$lib/stores';
  import LanguageSwitcher from '$lib/components/common/LanguageSwitcher.svelte';
  import { mediaQuery } from 'svelte-legos';
  import Tooltip from '$lib/components/common/Tooltip.svelte';
  import MyButton from '$lib/components/common/MyButton.svelte';
  import { openDialog } from '$lib/stores/dialog';
  import ArenaRulesDialogContent from './modules/ArenaRulesDialogContent.svelte';

  // 三个子组件
  import ArenaOverview from './modules/ArenaOverview.svelte';
  import ArenaTopPlayers from './modules/ArenaTopPlayers.svelte';
  import ArenaPrizePool from './modules/ArenaPrizePool.svelte';
  import { goto } from '$app/navigation';

  const i18n: any = getContext('i18n');

  // ✅ 响应式：移动端判定
  const isMobile = mediaQuery('(max-width: 768px)');

  // =========================
  // ⚠️ 这里先用 mock 数据，后续你接 API 只要把 props 换掉即可
  // =========================
  const overview = {
    weeklyPoints: 0,
    weeklyPointsDelta: 0, // 今日/本周增量
    totalPoints: 90,

    weeklyRank: 0,
    weeklyRankDelta: 0, // 排名上升/下降
    percentile: 'Top 0%',

    rewardsUsd: 0,
  };

  const topPlayers = [
    { rank: 1, address: '0xcea...4df4d', points: 130_150 },
    { rank: 2, address: '0x192...e7967', points: 121_279 },
    { rank: 3, address: '0x490...62bb6', points: 69_417 },
  ];

  const prizePool = {
    amount: 300,
    currency: 'USDT',
    topN: 50,
    resetHint: 'Every Sunday 00:00 UTC',
  };
  // ⚠️ 这里先用 mock 数据，后面你接真实 store / API 即可
  const stats = {
    totalPoints: 90,
    rank: 0,
    referrals: 0,
  };
  function handleStart() {
    // TODO: 跳转到任务/对战页
    // 这里先留空（你接 router 或 window.location 都行）
    goto('/creator/vote');
  }

  function handleViewFullLeaderboard() {
    // TODO: 跳转完整榜单页
  }

  function handleViewRewardDetails() {
    // TODO: 跳转奖励详情/规则
  }
  function handleViewRules() {
    openDialog({
      titleKey: 'AI Arena — Quick rules',
      bodyComponent: ArenaRulesDialogContent,
      widthClass: 'max-w-[860px]',
      closeOnBackdrop: true,
      confirm: {
        enabled: true,
        cancelLabelKey: 'Cancel',
        confirmLabelKey: 'Got it',
        confirmType: 'primary',
        onConfirm: async () => {
          // optional
        },
      },
    });
  }
  onMount(() => initPageFlag.set(true));
</script>

<div class="flex flex-col min-h-screen bg-bg-light dark:bg-bg-dark text-text-light dark:text-text-dark">
  <!-- 顶部导航保持你原样 -->
  <nav
    class="fixed top-0 w-full z-[99]
         px-3 py-2.5 md:px-4 md:py-4
         flex justify-between items-center
         backdrop-blur-md
         border-b border-border-light dark:border-border-dark
         bg-bg-light/70 dark:bg-bg-dark/70"
  >
    <!-- 左侧 Logo -->
    <a href="/creator" class="flex items-center cursor-pointer select-none gap-2">
      <img src="/creator/static/favicon2.png" class="h-[20px]" alt="logo" />
      <span class="hidden md:inline-block font-bold tracking-wide">DGrid</span>
    </a>

    <!-- 右侧状态 + 控件 -->
    <div class="flex items-center gap-3 md:gap-6">
      <!-- Stats 区域 -->
      <div class="hidden md:flex items-center gap-5 text-sm text-gray-700 dark:text-gray-300">
        <!-- Total Points -->
        <Tooltip content={$i18n.t('Total points')} placement="bottom">
          <div class="flex items-center gap-1.5">
            <iconify-icon icon="ph:trophy-fill" class="text-primary-500 text-base" />
            <span class="font-medium">
              {$i18n.t('Total points')}: {stats.totalPoints}
            </span>
          </div>
        </Tooltip>

        <!-- Rank -->
        <Tooltip content={$i18n.t('Rank')} placement="bottom">
          <div class="flex items-center gap-1.5">
            <iconify-icon icon="ph:chart-bar-fill" class="text-primary-500 text-base" />
            <span class="font-medium">
              {$i18n.t('Rank')}: #{stats.rank}
            </span>
          </div>
        </Tooltip>

        <!-- Referrals -->
        <Tooltip content={$i18n.t('Referrals')} placement="bottom">
          <div class="flex items-center gap-1.5">
            <iconify-icon icon="ph:users-three-fill" class="text-primary-500 text-base" />
            <span class="font-medium">
              {$i18n.t('Referrals')}: {stats.referrals}
            </span>
          </div>
        </Tooltip>
      </div>

      <!-- 语言切换 -->
      <span class="hidden md:block">
        <LanguageSwitcher />
      </span>

      <!-- 钱包 -->
      <WalletConnect />
    </div>
  </nav>

  <main class="w-full flex flex-col gap-2 pt-[80.8px] md:pt-[100px] pb-12 px-4 md:px-40">
    <!-- ✅ 标题/副标题全 i18n -->
    <h1 class="text-3xl md:text-6xl font-bold text-center my-2 tracking-wider">
      {$i18n.t('Welcome to the AI Arena')}
    </h1>

    <h2 class="text-xl md:text-xl text-gray-500 text-center my-1">
      {$i18n.t('Complete tasks, earn points, redeem USDT, and share the weekly prize pool.')}
    </h2>

    <!-- 中间大按钮（对标你截图的“开始 AI 对战”） -->
    <div class=" mt-6 md:mt-12 flex flex-col items-center gap-3">
      <MyButton
        type="primary"
        size={$isMobile ? 'medium' : 'large'}
        class="rounded-full px-8 min-h-[46px] md:min-h-[56px]"
        on:click={handleStart}
        tooltip={$i18n.t('Start tasks to earn points and climb the leaderboard.')}
      >
        <span class="flex items-center gap-2">
          <iconify-icon icon="ph:play-fill" class="text-xl" />
          {$i18n.t('Start AI Battle')}
        </span>
      </MyButton>

      <button
        class="text-sm text-gray-500 dark:text-gray-400 hover:text-primary-500 transition underline underline-offset-4"
        on:click={handleViewRules}
      >
        {$i18n.t('View rules')}
      </button>
    </div>

    <!-- 内容区域：三个组件 -->
    <div class="mt-10 w-full flex flex-col items-center gap-16">
      <!-- 总概括 -->
      <ArenaOverview {overview} onViewRewardDetails={handleViewRewardDetails} />

      <!-- 本週最佳玩家 -->
      <ArenaTopPlayers {topPlayers} onViewFullLeaderboard={handleViewFullLeaderboard} />

      <!-- 本週奖池 -->
      <ArenaPrizePool {prizePool} />
    </div>
  </main>
</div>
