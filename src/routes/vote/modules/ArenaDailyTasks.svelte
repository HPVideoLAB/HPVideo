<script lang="ts">
  import { getContext } from 'svelte';

  const i18n: any = getContext('i18n');

  // ✅ 你在父组件传的就是这些
  export let completed = 0;
  export let dailyLimit = 5;

  // i18n keys（英文当 key）
  export let titleKey = 'Daily tasks';
  export let subtitleKey = 'Complete tasks to maximize your daily rewards.';

  $: safeLimit = Math.max(1, dailyLimit);
  $: safeCompleted = Math.max(0, Math.min(completed, safeLimit));
  $: progress = safeCompleted / safeLimit;

  // 生成 5 个节点（任务格）
  $: slots = Array.from({ length: safeLimit }, (_, i) => i + 1);
</script>

<section
  class="w-full rounded-2xl border border-border-light dark:border-border-dark
  bg-bg-light/60 dark:bg-bg-dark/60 backdrop-blur-md px-5 md:px-8 py-6"
>
  <div class="flex items-start justify-between gap-4">
    <div class="min-w-0">
      <h3 class="text-lg md:text-2xl font-bold text-text-light dark:text-text-dark">
        {$i18n.t(titleKey)}
      </h3>
      <p class="text-sm md:text-base text-primary-500/90 mt-1">
        {$i18n.t(subtitleKey)}
      </p>
    </div>

    <div class="text-sm md:text-base font-semibold text-primary-500">
      {safeCompleted}/{safeLimit}
      {$i18n.t('tasks completed')}
    </div>
  </div>

  <!-- 进度条 -->
  <div class="mt-4">
    <div class="h-2 rounded-full bg-gray-200/50 dark:bg-gray-800/60 overflow-hidden">
      <div class="h-full rounded-full bg-primary-500" style="width:{progress * 100}%;" />
    </div>
  </div>

  <!-- 任务圆点（对标你截图那排圆） -->
  <div class="mt-5 flex items-center justify-between gap-3">
    {#each slots as n (n)}
      <div class="flex flex-col items-center gap-2 flex-1">
        {#if n <= safeCompleted}
          <div
            class="h-12 w-12 rounded-full bg-primary-500 text-black flex items-center justify-center
              shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
            aria-label="completed"
          >
            <iconify-icon icon="ph:check-bold" class="text-xl" />
          </div>
        {:else}
          <div
            class="h-12 w-12 rounded-full bg-gray-200/60 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400
              flex items-center justify-center border border-border-light dark:border-border-dark"
            aria-label="locked"
          >
            <iconify-icon icon="ph:lock-simple-bold" class="text-xl" />
          </div>
        {/if}

        <div class="text-xs text-gray-500 dark:text-gray-400">+20</div>
      </div>
    {/each}
  </div>
</section>
