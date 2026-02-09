<script lang="ts">
  import { createEventDispatcher, getContext } from 'svelte';
  import MyButton from '$lib/components/common/MyButton.svelte';

  import ConfettiCanvas from './ConfettiCanvas.svelte';
  import TaskPromptCard from './TaskPromptCard.svelte';
  import ModelCompareCard from './ModelCompareCard.svelte';
  import { toast } from 'svelte-sonner';

  const i18n: any = getContext('i18n');
  const dispatch = createEventDispatcher<{ next: void }>();

  export let currentTask: any;
  export let onNext: () => void;

  type Choice = 'A' | 'B' | null;
  let choice: Choice = null;
  let showResult = false;

  let rewardPts = 0;
  let communityScoreA = 42.86;
  let communityScoreB = 57.14;

  // Confetti ref
  let confettiRef: any;

  const headerTitleClass =
    'text-lg md:text-xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-primary-500 to-emerald-400';

  function pick(which: 'A' | 'B') {
    if (showResult) return;
    choice = which;
    showResult = true;

    rewardPts = which === 'A' ? 10 : 5;

    // // 更像烟花：三次 burst
    // confettiRef?.burst?.(window.innerWidth * 0.5, window.innerHeight * 0.18);
    // setTimeout(() => confettiRef?.burst?.(window.innerWidth * 0.35, window.innerHeight * 0.22), 120);
    // setTimeout(() => confettiRef?.burst?.(window.innerWidth * 0.65, window.innerHeight * 0.22), 220);

    toast.warning('接下来要开发的功能是实现抽奖功能，以及后端功能', {
      duration: 999999999,
    });
  }

  function nextTask() {
    choice = null;
    showResult = false;
    rewardPts = 0;
    onNext?.();
    dispatch('next');
  }
</script>

<!-- 烟花画布 -->
<ConfettiCanvas bind:this={confettiRef} active={showResult} />

<!-- 顶部任务提示 -->
<TaskPromptCard
  taskNo={currentTask.taskNo}
  promptLabelKey={currentTask.promptLabelKey}
  promptTextKey={currentTask.promptTextKey}
  rewardPoints={currentTask.rewardPoints}
/>

<!-- 标题 -->
<div class="text-center pt-4">
  <h2 class={headerTitleClass}>{$i18n.t('Choose the best answer')}</h2>
  <p class="mt-2 text-sm md:text-base text-gray-500 dark:text-gray-400">
    {$i18n.t('Select which AI generated a better output.')}
  </p>
</div>

<!-- 对比区 -->
<section class="w-full grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 pt-6">
  <ModelCompareCard
    side="A"
    nameKey={currentTask.modelA.nameKey}
    providerKey={currentTask.modelA.providerKey}
    videoUrl={currentTask.modelA.videoUrl}
    answerTextKey={currentTask.modelA.answerTextKey}
    {showResult}
    isWinner={choice === 'A'}
    communityScore={communityScoreA}
    rewardText={choice === 'A' ? `+${rewardPts} pts` : '+0 pts'}
    onPick={(s) => pick(s)}
  />

  <ModelCompareCard
    side="B"
    nameKey={currentTask.modelB.nameKey}
    providerKey={currentTask.modelB.providerKey}
    videoUrl={currentTask.modelB.videoUrl}
    answerTextKey={currentTask.modelB.answerTextKey}
    {showResult}
    isWinner={choice === 'B'}
    communityScore={communityScoreB}
    rewardText={choice === 'B' ? `+${rewardPts} pts` : '+0 pts'}
    onPick={(s) => pick(s)}
  />
</section>

<!-- 结果区 -->
{#if showResult}
  <section class="w-full mt-10 flex flex-col items-center gap-4">
    <div class="text-center space-y-2">
      <h3 class={headerTitleClass}>{$i18n.t('Battle result')}</h3>
      <p class="text-sm md:text-base text-gray-500 dark:text-gray-400">
        {$i18n.t('You chose')}
        {choice === 'A' ? $i18n.t('Model A') : $i18n.t('Model B')}
      </p>
    </div>

    <MyButton type="default" size="large" round class="py-5 mt-4 md:h-10">
      <iconify-icon icon="ph:coins-fill" class="text-xl text-primary-500" />
      <span>+{rewardPts} {$i18n.t('points')}</span>
    </MyButton>

    <p class="text-sm text-gray-500 dark:text-gray-400">
      {$i18n.t('Nice! This time the other model was more popular with the community.')}
    </p>

    <MyButton type="primary" size="large" class="w-full rounded-3xl py-5 mt-4 md:h-14" on:click={nextTask}>
      <span class="flex items-center justify-center gap-2">
        <iconify-icon icon="ph:fast-forward-fill" class="text-xl" />
        {$i18n.t('Next task')}
      </span>
    </MyButton>

    <p class="text-xs text-gray-500 dark:text-gray-400 text-center">
      {$i18n.t('You can complete up to 5 tasks per day.')}
    </p>
  </section>
{/if}
