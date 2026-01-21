<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import { user, theme, threesideAccount } from '$lib/stores';
  import { generateInitialsImage } from '$lib/utils';
  import { DropdownMenu } from 'bits-ui';
  import { getLanguages } from '$lib/i18n';
  import { toast } from 'svelte-sonner';
  import { updateUserLanguage } from '$lib/apis/users';
  import { modal } from '$lib/utils/wallet/bnb/index';
  import MyButton from '$lib/components/common/MyButton.svelte';

  const i18n = getContext('i18n');
  export let saveHandler: Function;

  // 数据绑定
  let name = '';
  let profileImageUrl = '';

  // 主题相关
  let themes = ['dark', 'light', 'rose-pine dark', 'rose-pine-dawn light', 'oled-dark'];
  let selectedTheme = 'light';
  let themeshow = false;

  // 语言相关
  let languages: any[] = [];
  let lang = $i18n.language;
  let languageshow = false;

  // 辅助函数：复制地址
  const copyAddress = () => {
    if ($threesideAccount?.address) {
      navigator.clipboard.writeText($threesideAccount.address);
      toast.success($i18n.t('Address copied'));
    }
  };

  // 辅助函数：地址截断显示 (0x12...3456)
  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // 主题切换逻辑 (保持原有逻辑不变)
  const themeChangeHandler = (_theme: string) => {
    theme.set(_theme);
    localStorage.setItem('theme', _theme);

    if (_theme.includes('oled')) {
      document.documentElement.style.setProperty('--color-gray-900', '#000000');
      document.documentElement.style.setProperty('--color-gray-950', '#000000');
      document.documentElement.classList.add('dark');
    }
    applyTheme(_theme);
    selectedTheme = localStorage.theme ?? 'light';
    themeshow = false;
  };

  const applyTheme = (_theme: string) => {
    let themeToApply = _theme === 'oled-dark' ? 'dark' : _theme;

    if (_theme === 'system') {
      themeToApply = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    if (themeToApply === 'dark' && !_theme.includes('oled')) {
      document.documentElement.style.setProperty('--color-gray-900', '#171717');
      document.documentElement.style.setProperty('--color-gray-950', '#0d0d0d');
    }

    themes
      .filter((e) => e !== themeToApply)
      .forEach((e) => {
        e.split(' ').forEach((cls) => {
          document.documentElement.classList.remove(cls);
        });
      });

    themeToApply.split(' ').forEach((cls) => {
      document.documentElement.classList.add(cls);
    });
  };

  onMount(async () => {
    name = $user.name;
    profileImageUrl = $user.profile_image_url;
    languages = await getLanguages();
    selectedTheme = $theme;
  });
</script>

<div
  class="w-72 bg-bg-light dark:bg-bg-dark rounded-xl overflow-hidden flex flex-col shadow-2xl border border-border-light dark:border-border-dark"
>
  <div class="p-4 bg-gray-50/80 dark:bg-gray-850/50 border-b border-border-light dark:border-border-dark">
    <div class="flex items-center gap-3">
      <div class="relative shrink-0">
        <img
          src={profileImageUrl == '' ? generateInitialsImage(name) : profileImageUrl}
          alt="profile"
          class="size-11 rounded-full object-cover ring-2 ring-white dark:ring-gray-800 shadow-sm"
        />
        <div
          class="absolute bottom-0 right-0 size-3 bg-success rounded-full border-2 border-white dark:border-gray-850"
        />
      </div>

      <div class="flex flex-col min-w-0 flex-1">
        <span class="font-bold text-sm text-text-light dark:text-text-dark truncate">
          {name || 'User'}
        </span>

        <button
          on:click={copyAddress}
          class="flex items-center gap-1.5 w-fit mt-0.5 group cursor-pointer"
          title={$i18n.t('Click to copy')}
        >
          <span
            class="font-mono text-xs text-text-lightSecondary dark:text-text-darkSecondary bg-gray-200/50 dark:bg-gray-700/50 px-1.5 py-0.5 rounded group-hover:text-primary transition-colors"
          >
            {formatAddress($threesideAccount?.address)}
          </span>
          <span
            class="text-text-lightSecondary dark:text-text-darkSecondary group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all text-sm"
          >
            <iconify-icon icon="ph:copy-simple" />
          </span>
        </button>
      </div>
    </div>
  </div>

  <div class="p-2 space-y-1">
    <div
      class="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors group select-none"
    >
      <div class="flex items-center gap-2.5 text-sm text-text-light dark:text-text-dark font-medium">
        <span
          class="text-lg text-text-lightSecondary dark:text-text-darkSecondary group-hover:text-primary transition-colors flex items-center"
        >
          <iconify-icon icon="ph:palette" />
        </span>
        {$i18n.t('Theme')}
      </div>

      <DropdownMenu.Root bind:open={themeshow}>
        <DropdownMenu.Trigger class="outline-none">
          <MyButton type="default" round size="small">
            <span class="capitalize">
              {#if selectedTheme == 'system'}
                System
              {:else if selectedTheme == 'oled-dark'}
                OLED
              {:else}
                {selectedTheme.split(' ')[0]}
              {/if}
            </span>
            <iconify-icon icon="ph:caret-down" class="opacity-50" />
          </MyButton>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content
          class="z-[10000] min-w-[140px] rounded-xl bg-white dark:bg-gray-850 border border-border-light dark:border-border-dark shadow-xl p-1 animate-in fade-in zoom-in-95 duration-200"
          side="right"
          align="start"
          sideOffset={8}
        >
          <div class="flex flex-col">
            {#each ['system', 'light', 'dark', 'oled-dark'] as t}
              <button
                class="flex justify-between items-center w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 text-text-light dark:text-text-dark transition-colors"
                on:click={() => themeChangeHandler(t)}
              >
                <span class="capitalize">{t.replace('-', ' ')}</span>
                {#if selectedTheme === t}
                  <span class="text-primary flex items-center"><iconify-icon icon="ph:check-bold" /></span>
                {/if}
              </button>
            {/each}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>

    <div
      class="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors group select-none"
    >
      <div class="flex items-center gap-2.5 text-sm text-text-light dark:text-text-dark font-medium">
        <span
          class="text-lg text-text-lightSecondary dark:text-text-darkSecondary group-hover:text-primary transition-colors flex items-center"
        >
          <iconify-icon icon="ph:globe" />
        </span>
        {$i18n.t('Language')}
      </div>

      <DropdownMenu.Root bind:open={languageshow}>
        <DropdownMenu.Trigger class="outline-none">
          <MyButton type="default" round size="small">
            <span class="truncate max-w-[80px]">
              {languages.find((l) => l.code == lang)?.title || lang}
            </span>
            <iconify-icon icon="ph:caret-down" class="opacity-50" />
          </MyButton>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content
          class="z-[10000] min-w-[140px] rounded-xl bg-white dark:bg-gray-850 border border-border-light dark:border-border-dark shadow-xl p-1 animate-in fade-in zoom-in-95 duration-200"
          side="right"
          align="start"
          sideOffset={8}
        >
          <div class="flex flex-col max-h-60 overflow-y-auto">
            {#each languages as language}
              <button
                class="flex justify-between items-center w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 text-text-light dark:text-text-dark transition-colors"
                on:click={() => {
                  lang = language['code'];
                  $i18n.changeLanguage(lang);
                  updateUserLanguage(localStorage.token, lang);
                  languageshow = false;
                }}
              >
                <span>{language['title']}</span>
                {#if lang === language['code']}
                  <span class="text-primary flex items-center"><iconify-icon icon="ph:check-bold" /></span>
                {/if}
              </button>
            {/each}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  </div>

  <div class="h-px bg-border-light dark:bg-border-dark mx-4 my-0.5" />

  <div class="p-2">
    <button
      class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-error hover:bg-error-50 dark:hover:bg-error-900/20 transition-all group"
      on:click={() => modal.open()}
    >
      <span class="text-lg flex items-center group-hover:scale-110 transition-transform">
        <iconify-icon icon="ph:sign-out" />
      </span>
      {$i18n.t('Disconnect Wallet')}
    </button>
  </div>
</div>
