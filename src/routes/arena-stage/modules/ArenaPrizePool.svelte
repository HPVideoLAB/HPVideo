<script lang="ts">
  import { getContext } from 'svelte';
  import Tooltip from '$lib/components/common/Tooltip.svelte';

  const i18n: any = getContext('i18n');

  export let prizePool: {
    amount: number;
    currency: string; // 'USDT'
    topN: number; // 50
    resetHint: string; // 'Every Sunday 00:00 UTC'
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-US').format(n);
</script>

<div class="w-full">
  <section
    class="rounded-2xl border border-primary-500/30
           bg-primary-500/10 dark:bg-primary-500/10
           shadow-[0_10px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.35)]
           px-5 md:px-8 py-10 md:py-12"
  >
    <div class="flex flex-col items-center text-center gap-3">
      <div class="h-14 w-14 rounded-full bg-black/30 dark:bg-black/40 flex items-center justify-center">
        <iconify-icon icon="ph:star-fill" class="text-3xl text-primary-500" />
      </div>

      <h3 class="text-2xl md:text-4xl font-extrabold">
        {$i18n.t('Weekly prize pool')}
        {fmt(prizePool.amount)}
        {prizePool.currency}
      </h3>

      <p class="text-sm md:text-base text-gray-600 dark:text-gray-300">
        {$i18n.t('Top players share the weekly prize pool.')}
        <span class="font-semibold"> {$i18n.t('Top')} {prizePool.topN} </span>
        {$i18n.t('will receive rewards.')}
      </p>

      <Tooltip content={$i18n.t('The pool resets on the schedule shown below.')} placement="top">
        <p class="text-xs md:text-sm text-gray-600 dark:text-gray-300 opacity-90">
          {$i18n.t('Reset time:')}
          {prizePool.resetHint}
        </p>
      </Tooltip>
    </div>
  </section>
</div>
