<script lang="ts">
  import { getContext } from 'svelte';

  const i18n: any = getContext('i18n');

  export let taskNo = 1;
  export let promptLabelKey = 'Hint';
  export let promptTextKey = '';
  export let rewardPoints = 20;
</script>

<section
  class="w-full rounded-2xl border border-border-light dark:border-border-dark
         bg-white/70 dark:bg-[#0B0F14]/60 backdrop-blur-xl px-5 md:px-8 py-6"
>
  <div class="flex flex-col md:flex-row items-center justify-between gap-4">
    <div class="space-y-2">
      <div class="inline-flex items-center gap-2">
        <span
          class="inline-flex rounded-full text-xs font-bold px-3 py-1
                 bg-primary-500/20 text-primary-600 dark:text-primary-300
                 border border-primary-500/30"
        >
          {$i18n.t('Task')} #{taskNo}
        </span>

        <span class="text-sm text-gray-500 dark:text-gray-400">
          {$i18n.t(promptLabelKey)}
        </span>
      </div>

      <div class="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100 leading-relaxed">
        {$i18n.t(promptTextKey)}
      </div>
    </div>

    <div
      class="flex items-center gap-2 font-bold
             text-primary-600 dark:text-primary-300
             bg-primary-500/10 border border-primary-500/25
             rounded-xl px-3 py-2"
    >
      <span>+{rewardPoints}</span>
      <span class="text-sm opacity-90">pts</span>
      <iconify-icon icon="ph:star-fill" class="text-base" />
    </div>
  </div>
</section>
