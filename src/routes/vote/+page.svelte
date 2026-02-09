<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import WalletConnect from '$lib/components/wallet/WalletConnect.svelte';
  import { initPageFlag } from '$lib/stores';
  import LanguageSwitcher from '$lib/components/common/LanguageSwitcher.svelte';
  import Tooltip from '$lib/components/common/Tooltip.svelte';
  import { mediaQuery } from 'svelte-legos';

  // 子组件
  import ArenaDailyTasks from './modules/ArenaDailyTasks.svelte';
  import ModelVote from './modules/ModelVote.svelte';

  const i18n: any = getContext('i18n');
  const isMobile = mediaQuery('(max-width: 768px)');

  // ✅ 顶部 stats（你要的：Total points / Rank / Referrals）
  const stats = {
    totalPoints: 90,
    rank: 0,
    referrals: 0,
  };

  // =========================
  // ✅ Mock：每天最多 5 个任务
  // 你接 API 后：把 tasks/payload 换成真实接口即可
  // =========================
  type TaskPayload = {
    id: string;
    taskNo: number;
    dailyLimit: number; // 固定 5
    completed: number; // 当前已完成数量
    promptLabelKey: string; // 'Hint'
    promptTextKey: string; // 英文 key
    rewardPoints: number;

    modelA: {
      nameKey: string;
      providerKey: string;
      videoUrl: string;
      answerTextKey: string;
    };
    modelB: {
      nameKey: string;
      providerKey: string;
      videoUrl: string;
      answerTextKey: string;
    };
  };

  // ✅ 这里用英文 key，当没翻译时也能直接显示英文
  const tasks: TaskPayload[] = [
    {
      id: 't1',
      taskNo: 2,
      dailyLimit: 5,
      completed: 1,
      promptLabelKey: 'Hint',
      promptTextKey: 'Give suggestions for people who feel tired, but do not mention sleep.',
      rewardPoints: 20,
      modelA: {
        nameKey: 'Model A',
        providerKey: 'Google: Gemini 2.5 Flash Lite',
        videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        answerTextKey:
          'Here are practical suggestions focusing on lifestyle, nutrition, and activity to reduce fatigue without discussing sleep.',
      },
      modelB: {
        nameKey: 'Model B',
        providerKey: 'OpenAI: GPT-5 Nano',
        videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm',
        answerTextKey:
          'Below are actionable ideas to boost daily energy and focus, including hydration, balanced meals, and light exercise.',
      },
    },
    {
      id: 't2',
      taskNo: 3,
      dailyLimit: 5,
      completed: 2,
      promptLabelKey: 'Hint',
      promptTextKey: 'Write a friendly product description for a travel cup, keep it short and persuasive.',
      rewardPoints: 20,
      modelA: {
        nameKey: 'Model A',
        providerKey: 'Google: Gemini 2.5 Flash Lite',
        videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        answerTextKey:
          'A compact, leak-proof travel cup that keeps drinks hot or cold—perfect for commuting and trips.',
      },
      modelB: {
        nameKey: 'Model B',
        providerKey: 'OpenAI: GPT-5 Nano',
        videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm',
        answerTextKey:
          'Meet your new everyday cup: spill-resistant, comfortable to hold, and built for life on the go.',
      },
    },
  ];

  let taskIndex = 0;
  $: currentTask = tasks[taskIndex];

  function handleNextTask() {
    // ✅ 简单轮播（你接真实 API 时：这里改成 fetch 下一题）
    taskIndex = (taskIndex + 1) % tasks.length;
  }

  onMount(() => initPageFlag.set(true));
</script>

<div class="flex flex-col min-h-screen bg-bg-light dark:bg-bg-dark text-text-light dark:text-text-dark">
  <!-- 顶部导航：保持你原样 -->
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

    <!-- 右侧：Stats + 控件 -->
    <div class="flex items-center gap-3 md:gap-6">
      <div class="hidden md:flex items-center gap-5 text-sm text-gray-700 dark:text-gray-300">
        <Tooltip content={$i18n.t('Total points')} placement="bottom">
          <div class="flex items-center gap-1.5">
            <iconify-icon icon="ph:trophy-fill" class="text-primary-500 text-base" />
            <span class="font-medium">{$i18n.t('Total points')}: {stats.totalPoints}</span>
          </div>
        </Tooltip>

        <Tooltip content={$i18n.t('Rank')} placement="bottom">
          <div class="flex items-center gap-1.5">
            <iconify-icon icon="ph:chart-bar-fill" class="text-primary-500 text-base" />
            <span class="font-medium">{$i18n.t('Rank')}: #{stats.rank}</span>
          </div>
        </Tooltip>

        <Tooltip content={$i18n.t('Referrals')} placement="bottom">
          <div class="flex items-center gap-1.5">
            <iconify-icon icon="ph:users-three-fill" class="text-primary-500 text-base" />
            <span class="font-medium">{$i18n.t('Referrals')}: {stats.referrals}</span>
          </div>
        </Tooltip>
      </div>

      <span class="hidden md:block"><LanguageSwitcher /></span>
      <WalletConnect />
    </div>
  </nav>

  <main class="w-full flex flex-col gap-6 pt-[80.8px] md:pt-[100px] pb-12 px-4 md:px-40">
    <!-- 标题区 -->

    <!-- 标题 -->

    <h1 class="text-3xl md:text-6xl font-bold text-center my-2 tracking-wider">
      {$i18n.t('Choose the best answer')}
    </h1>

    <h2 class="text-xl md:text-xl text-gray-500 text-center my-1">
      {$i18n.t('Pick the AI output you think is better. Careful evaluation earns more points.')}
    </h2>

    <!-- 每日任务 -->
    <ArenaDailyTasks
      completed={currentTask.completed}
      dailyLimit={currentTask.dailyLimit}
      titleKey="Daily tasks"
      subtitleKey="Complete tasks to maximize your daily rewards."
    />

    <!-- 选择对比组件 -->
    <ModelVote {currentTask} onNext={handleNextTask} />
  </main>
</div>
