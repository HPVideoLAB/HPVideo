<script lang="ts">
  import { getContext } from 'svelte';
  const i18n: any = getContext('i18n');
</script>

<!-- ✅ 关键：给一个稳定的暗黑/亮色基础色，不依赖 prose -->
<div class="space-y-6 text-text-light dark:text-text-dark">
  <div class="space-y-2">
    <h4 class="text-base md:text-lg font-bold text-text-light dark:text-text-dark">
      {$i18n.t('AI Arena — Quick rules')}
    </h4>

    <p class="text-sm md:text-base text-gray-600 dark:text-gray-300">
      {$i18n.t(
        'AI Arena is a human evaluation program by DGrid AI that uses real user feedback to improve model quality.'
      )}
    </p>
  </div>

  <div class="space-y-2">
    <h5 class="font-bold text-text-light dark:text-text-dark">
      {$i18n.t('How to earn points')}
    </h5>

    <p class="text-sm md:text-base text-gray-600 dark:text-gray-300">
      {$i18n.t('You can earn points in two ways:')}
    </p>

    <div
      class="rounded-xl border border-border-light dark:border-border-dark bg-bg-light/60 dark:bg-bg-dark/60 p-4 space-y-2"
    >
      <div class="font-semibold text-text-light dark:text-text-dark">
        {$i18n.t('1) Complete tasks')}
      </div>

      <!-- ✅ 关键：li 的颜色明确指定，暗黑不发灰 -->
      <ul class="list-disc pl-5 text-sm md:text-base text-gray-700 dark:text-gray-200 space-y-1">
        <li>{$i18n.t('Compare AI outputs and choose the better response.')}</li>
        <li>{$i18n.t('Each task awards 10 or 20 points.')}</li>
        <li>{$i18n.t('If your choice matches the community consensus, you earn more points.')}</li>
        <li>{$i18n.t('You can complete up to 5 tasks per day.')}</li>
      </ul>
    </div>

    <div
      class="rounded-xl border border-border-light dark:border-border-dark bg-bg-light/60 dark:bg-bg-dark/60 p-4 space-y-2"
    >
      <div class="font-semibold text-text-light dark:text-text-dark">
        {$i18n.t('2) Invite contributors')}
      </div>

      <ul class="list-disc pl-5 text-sm md:text-base text-gray-700 dark:text-gray-200 space-y-1">
        <li>{$i18n.t('When an invited user completes activation, you receive a one-time bonus.')}</li>
        <li>{$i18n.t('The bonus is 10–100 points depending on the quality of the invited user’s X account.')}</li>
        <li>{$i18n.t('You also earn 10% of the invited user’s weekly points as an extra bonus.')}</li>
      </ul>
    </div>
  </div>

  <div class="space-y-2">
    <h5 class="font-bold text-text-light dark:text-text-dark">
      {$i18n.t('Weekly leaderboard')}
    </h5>

    <ul class="list-disc pl-5 text-sm md:text-base text-gray-700 dark:text-gray-200 space-y-1">
      <li>{$i18n.t('The leaderboard resets every Sunday at 00:00 UTC.')}</li>
      <li>{$i18n.t('Top 50 players share a $300 USDT prize pool.')}</li>
      <li>{$i18n.t('Weekly rewards become withdrawable once they reach 1 USDT.')}</li>
    </ul>
  </div>

  <div class="space-y-2">
    <h5 class="font-bold text-text-light dark:text-text-dark">
      {$i18n.t('Point redemption')}
    </h5>

    <ul class="list-disc pl-5 text-sm md:text-base text-gray-700 dark:text-gray-200 space-y-1">
      <li>{$i18n.t('1,000 points can be redeemed for 1 USDT.')}</li>
      <li>{$i18n.t('Redemptions must be in multiples of 1,000 points.')}</li>
      <li>{$i18n.t('Redeeming points does not affect your weekly leaderboard ranking.')}</li>
    </ul>
  </div>

  <div class="space-y-2">
    <h5 class="font-bold text-text-light dark:text-text-dark">
      {$i18n.t('Fair participation')}
    </h5>

    <ul class="list-disc pl-5 text-sm md:text-base text-gray-700 dark:text-gray-200 space-y-1">
      <li>{$i18n.t('Random clicking or low-quality judgments will result in lower rewards.')}</li>
      <li>{$i18n.t('Careful evaluation can unlock more tasks and better feedback.')}</li>
    </ul>
  </div>
</div>
