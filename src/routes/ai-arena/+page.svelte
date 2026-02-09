<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import WalletConnect from '$lib/components/wallet/WalletConnect.svelte';
  import { initPageFlag } from '$lib/stores';
  import LanguageSwitcher from '$lib/components/common/LanguageSwitcher.svelte';
  import Tooltip from '$lib/components/common/Tooltip.svelte';
  import MyButton from '$lib/components/common/MyButton.svelte';
  import { mediaQuery } from 'svelte-legos';
  import { goto } from '$app/navigation';

  const isMobile = mediaQuery('(max-width: 768px)');
  const i18n: any = getContext('i18n');

  // ✅ 所有可见文案都走 i18n（key 用英文句子本身，value 可回退英文）
  $: steps = [
    {
      id: 'invite',
      index: 0,
      title: $i18n.t('Invite code'),
      desc: $i18n.t('Optional'),
      status: 'optional',
      icon: 'ph:ticket-fill',
      rightBadge: { text: $i18n.t('Optional'), type: 'neutral' },
      slotType: 'invite',
      action: {
        text: $i18n.t('Apply'),
        tooltip: $i18n.t('Enter an invite code to unlock extra benefits (if available).'),
        disabled: false,
      },
    },
    {
      id: 'connect',
      index: 1,
      title: $i18n.t('Connect X'),
      desc: $i18n.t('Connect your X account to verify your identity.'),
      status: 'done',
      icon: 'ph:x-logo-fill',
      rightBadge: { text: $i18n.t('Completed'), type: 'success' },
      slotType: 'connect',
      action: { text: $i18n.t('Connected'), tooltip: $i18n.t('X account connected successfully.'), disabled: true },
    },
    {
      id: 'follow',
      index: 2,
      title: $i18n.t('Follow @dgrid_ai'),
      desc: $i18n.t('Follow our official X account to verify you are human.'),
      status: 'inprogress',
      icon: 'ph:user-plus-fill',
      rightBadge: { text: $i18n.t('In progress'), type: 'warning' },
      slotType: 'follow',
      action: {
        text: $i18n.t('Check follow status'),
        tooltip: $i18n.t('Click to check whether you have followed the account.'),
        disabled: false,
      },
    },
    {
      id: 'sign',
      index: 3,
      title: $i18n.t('Sign and activate'),
      desc: $i18n.t('After signing, you can enter the arena.'),
      status: 'locked',
      icon: 'ph:signature-fill',
      rightBadge: { text: $i18n.t('Locked'), type: 'neutral' },
      slotType: 'sign',
      action: {
        text: $i18n.t('Sign to activate'),
        tooltip: $i18n.t('Complete the previous steps to unlock signing.'),
        disabled: true,
      },
    },
  ];

  // 仅演示：决定底部大按钮是否可用
  $: canEnterArena = true;

  // 进入竞技场
  const enterArena = () => {
    console.log('进入竞技场');
    goto('/creator/arena-stage');
  };

  onMount(() => initPageFlag.set(true));
</script>

<div class="flex flex-col min-h-screen bg-bg-light dark:bg-bg-dark text-text-light dark:text-text-dark">
  <nav
    class="fixed top-0 w-full z-[999999] px-3 py-2.5 md:px-4 md:py-4 flex justify-between items-center backdrop-blur-md border-b border-border-light dark:border-border-dark"
  >
    <a href="/creator" class="flex items-center cursor-pointer select-none">
      <img src="/creator/static/favicon2.png" class="h-[20px]" alt="logo" />
    </a>

    <div class="flex items-center gap-1 md:gap-4">
      <span class="hidden md:block"><LanguageSwitcher /></span><WalletConnect />
    </div>
  </nav>

  <main class="w-full flex flex-col gap-2 pt-[80.8px] md:pt-[100px] pb-12 px-4 md:px-32">
    <h1 class="text-3xl md:text-6xl font-bold text-center my-2 tracking-wider">
      {$i18n.t('Participate in AI evaluation, earn USDT')}
    </h1>
    <h2 class="text-xl md:text-xl text-gray-500 text-center my-1">
      {$i18n.t('Complete the steps below to unlock the arena')}
    </h2>

    <!-- 卡片区域：最大宽度 + 居中 + 间距 -->
    <div class="mt-8 w-full flex flex-col items-center gap-4">
      <div class="w-full max-w-[760px] flex flex-col gap-4">
        {#each steps as step (step.id)}
          <section
            class="relative w-full rounded-2xl border border-border-light dark:border-border-dark
               bg-bg-light/70 dark:bg-bg-dark/60 backdrop-blur-md
               shadow-[0_10px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.35)]
               px-4 py-4 md:px-6 md:py-5"
          >
            <!-- 左侧大圆点（步骤号 / 勾） -->
            <div class="absolute -left-3 md:-left-4 top-1/2 -translate-y-1/2">
              {#if step.status === 'done'}
                <div
                  class="h-12 w-12 md:h-14 md:w-14 rounded-full bg-success-500 text-white
                     flex items-center justify-center shadow-md"
                >
                  <iconify-icon icon="ph:check-bold" class="text-2xl" />
                </div>
              {:else}
                <div
                  class="h-12 w-12 md:h-14 md:w-14 rounded-full
                     bg-gray-100 dark:bg-gray-850 border border-border-light dark:border-border-dark
                     flex items-center justify-center"
                >
                  <span class="text-base md:text-lg font-bold text-gray-600 dark:text-gray-300">{step.index}</span>
                </div>
              {/if}
            </div>

            <!-- 顶部：标题 + badge -->
            <div class="flex items-start justify-between gap-3 pl-8 md:pl-10">
              <div class="flex items-center gap-2">
                <div class="flex flex-col">
                  <div class="flex items-center gap-2">
                    <h3 class="text-lg md:text-xl font-semibold leading-tight">{step.title}</h3>

                    {#if step.rightBadge && step.rightBadge.text}
                      <span
                        class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
                    {step.rightBadge.type === 'success'
                          ? 'bg-success-50 text-success-700 dark:bg-success-500/20 dark:text-success-300'
                          : step.rightBadge.type === 'warning'
                          ? 'bg-warning-50 text-warning-700 dark:bg-warning-500/20 dark:text-warning-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-850 dark:text-gray-300'}"
                      >
                        {step.rightBadge.text}
                      </span>
                    {/if}
                  </div>

                  <p class="text-sm md:text-base text-gray-500 dark:text-gray-400 mt-1">{step.desc}</p>
                </div>
              </div>
            </div>

            <!-- 内容区域 -->
            <div class="mt-4 pl-8 md:pl-10">
              {#if step.slotType === 'invite'}
                <!-- ✅ 胶囊一体化输入框 + 右侧按钮 -->
                <div
                  class="w-full rounded-full border border-border-light dark:border-border-dark
                     bg-bg-light dark:bg-bg-dark
                     shadow-sm
                     px-3 py-2 md:px-4 md:py-2.5
                     flex items-center gap-2
                     focus-within:ring-2 focus-within:ring-primary-500/40 focus-within:border-primary-500/60
                     transition"
                >
                  <iconify-icon icon="ph:key-fill" class="text-lg text-gray-500 dark:text-gray-400" />

                  <input
                    class="min-w-0 flex-1 bg-transparent outline-none text-sm md:text-base
                       placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    placeholder={$i18n.t('ABC123')}
                  />

                  <!-- 分隔线：更像输入框内按钮区 -->
                  <div class="h-6 w-px bg-border-light dark:bg-border-dark opacity-70" />

                  <Tooltip content={step.action?.tooltip || ''} placement="top">
                    <div class="flex">
                      <!-- 让按钮看起来像“嵌在输入框里” -->
                      <MyButton
                        type="primary"
                        size={$isMobile ? 'small' : 'medium'}
                        class="rounded-full px-4 md:px-5   shadow-none"
                        disabled={step.action?.disabled}
                      >
                        <span class="flex items-center gap-1">
                          <iconify-icon icon="ph:seal-check-fill" class="text-lg" />
                          {step.action?.text}
                        </span>
                      </MyButton>
                    </div>
                  </Tooltip>
                </div>
              {:else if step.slotType === 'connect'}
                <div
                  class="rounded-xl border border-border-light dark:border-border-dark
                     bg-bg-light dark:bg-bg-dark px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div class="flex items-center gap-2">
                    <span class="text-sm md:text-base font-medium">@ked1643445</span>
                    <Tooltip content={$i18n.t('Verified')} placement="top">
                      <span class="inline-flex">
                        <iconify-icon icon="ph:check-circle-fill" class="text-success-500 text-lg" />
                      </span>
                    </Tooltip>
                  </div>

                  <Tooltip content={step.action?.tooltip || ''} placement="top">
                    <MyButton size={$isMobile ? 'small' : 'medium'} disabled={true} class="justify-center rounded-full">
                      <span class="flex items-center gap-1">
                        <iconify-icon icon="ph:link-simple-horizontal-fill" class="text-lg" />
                        {step.action?.text}
                      </span>
                    </MyButton>
                  </Tooltip>
                </div>
              {:else if step.slotType === 'follow'}
                <div class="flex items-center justify-between gap-3">
                  <Tooltip
                    content={$i18n.t('Open the official account (or check your follow status).')}
                    placement="top"
                  >
                    <div class="flex items-center gap-2 text-primary-500 select-none">
                      <span class="font-semibold">@dgrid_ai</span>
                    </div>
                  </Tooltip>

                  <Tooltip content={step.action?.tooltip || ''} placement="top">
                    <MyButton size={$isMobile ? 'small' : 'medium'} type="primary" class="justify-center rounded-full">
                      <span class="flex items-center gap-1">
                        <iconify-icon icon="ph:magnifying-glass-fill" class="text-lg" />
                        {step.action?.text}
                      </span>
                    </MyButton>
                  </Tooltip>
                </div>
              {:else if step.slotType === 'sign'}
                <div class="flex items-center justify-between gap-3 opacity-80">
                  <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <span class="text-sm md:text-base">{$i18n.t('Unlock after completing the previous steps')}</span>
                  </div>

                  <Tooltip content={step.action?.tooltip || ''} placement="top">
                    <MyButton size={$isMobile ? 'small' : 'medium'} disabled={true} class="justify-center rounded-full">
                      <span class="flex items-center gap-1">
                        <iconify-icon icon="ph:signature-fill" class="text-lg" />
                        {step.action?.text}
                      </span>
                    </MyButton>
                  </Tooltip>
                </div>
              {/if}
            </div>
          </section>
        {/each}

        <!-- 底部大按钮（进入竞技场） -->
        <div class="pt-6 flex flex-col items-center gap-4">
          <Tooltip
            content={canEnterArena
              ? $i18n.t('All required steps completed. You can enter the arena.')
              : $i18n.t('Please complete connect / follow / sign steps first.')}
            placement="top"
          >
            <div class="flex w-full justify-center">
              <MyButton
                on:click={enterArena}
                size="large"
                type="primary"
                disabled={!canEnterArena}
                class="w-full md:w-[360px] min-h-[50px] justify-center rounded-full"
              >
                <span class="flex items-center gap-2 text-base md:text-lg">
                  <iconify-icon icon="ph:game-controller-fill" class="text-2xl" />
                  {$i18n.t('Enter AI Arena')}
                </span>
              </MyButton>
            </div>
          </Tooltip>

          <p class="text-xs md:text-sm text-gray-500 dark:text-gray-400 text-center">
            {$i18n.t('Complete all steps above to unlock arena access.')}
          </p>
        </div>
      </div>
    </div>
  </main>
</div>
