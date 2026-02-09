<script lang="ts">
  import { getContext } from 'svelte';
  import Tooltip from '$lib/components/common/Tooltip.svelte';
  import MyButton from '$lib/components/common/MyButton.svelte';
  import { mediaQuery } from 'svelte-legos';

  const i18n: any = getContext('i18n');
  const isMobile = mediaQuery('(max-width: 768px)');

  export let topPlayers: { rank: number; address: string; points: number }[] = [];

  export let onViewFullLeaderboard: () => void = () => {};

  const fmt = (n: number) => new Intl.NumberFormat('en-US').format(n);

  // 生成一个简单“头像色块”——不引入额外依赖，保持轻
  function avatarStyle(rank: number) {
    // 只用 tailwind 不好做动态色，这里用 inline style 允许简单区分
    const colors = ['#F59E0B', '#60A5FA', '#34D399']; // 1/2/3
    const c = colors[(rank - 1) % colors.length] || '#9CA3AF';
    return `background:${c};`;
  }
</script>

<div class="w-full">
  <div class="flex items-center justify-between">
    <h3 class="text-2xl md:text-3xl font-bold">{$i18n.t('Top players this week')}</h3>

    <Tooltip content={$i18n.t('View the full leaderboard')} placement="top">
      <button
        class="text-primary-500 hover:text-primary-600 font-semibold inline-flex items-center gap-1 transition"
        on:click={onViewFullLeaderboard}
      >
        {$i18n.t('View full leaderboard')}
        <iconify-icon icon="ph:arrow-right-bold" class="text-base" />
      </button>
    </Tooltip>
  </div>

  <section
    class="mt-4 rounded-2xl border border-border-light dark:border-border-dark
           bg-bg-light/40 dark:bg-bg-dark/40 backdrop-blur-md
           shadow-[0_10px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.35)]
           overflow-hidden"
  >
    <div class="flex flex-col">
      {#each topPlayers as p (p.rank)}
        <div
          class="px-5 md:px-6 py-4 flex items-center justify-between gap-4 border-b border-border-light/60 dark:border-border-dark/60"
        >
          <div class="flex items-center gap-4 min-w-0">
            <!-- 排名圆点 -->
            <div
              class="h-10 w-10 rounded-full flex items-center justify-center text-white font-extrabold shrink-0"
              style={avatarStyle(p.rank)}
            >
              {p.rank}
            </div>

            <!-- 地址 -->
            <div class="min-w-0">
              <div class="font-semibold truncate">{p.address}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">
                {$i18n.t('points')}
              </div>
            </div>
          </div>

          <!-- 积分 -->
          <div class="text-right shrink-0">
            <div class="text-xl md:text-2xl font-extrabold">{fmt(p.points)}</div>
            <div class="text-sm text-gray-500 dark:text-gray-400">points</div>
          </div>
        </div>
      {/each}

      <!-- 兜底：无数据 -->
      {#if topPlayers.length === 0}
        <div class="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
          {$i18n.t('No leaderboard data yet.')}
        </div>
      {/if}
    </div>

    <!-- 移动端给个更明显按钮（可选） -->
    {#if $isMobile}
      <div class="p-4 flex justify-center">
        <MyButton type="primary" size="medium" class="rounded-full w-full" on:click={onViewFullLeaderboard}>
          <span class="flex items-center justify-center gap-2">
            <iconify-icon icon="ph:trophy-fill" class="text-lg" />
            {$i18n.t('View full leaderboard')}
          </span>
        </MyButton>
      </div>
    {/if}
  </section>
</div>
