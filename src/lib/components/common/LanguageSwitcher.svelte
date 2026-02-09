<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import { DropdownMenu } from 'bits-ui';
  import { getLanguages } from '$lib/i18n';
  import { updateUserLanguage } from '$lib/apis/users';

  const i18n: any = getContext('i18n');

  let languages: any[] = [];
  let mounted = false;

  // 初始化加载语言列表
  onMount(async () => {
    try {
      languages = await getLanguages();
      mounted = true;
    } catch (error) {
      console.error('Failed to load languages', error);
    }
  });

  // 切换语言逻辑
  const changeLanguage = async (code: string) => {
    if ($i18n.language === code) return;

    // 1. 更新 i18n 状态
    $i18n.changeLanguage(code);

    // 2. 持久化到后端 (如果已登录)
    if (localStorage.token) {
      await updateUserLanguage(localStorage.token, code);
    }
  };
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger
    class="flex items-center justify-center size-9 rounded-lg text-text-lightSecondary dark:text-text-darkSecondary hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary transition-all outline-none"
    aria-label="Change Language"
  >
    <iconify-icon icon="ph:translate-bold" class="text-xl" />
  </DropdownMenu.Trigger>

  <DropdownMenu.Content
    class="z-[9999999999] min-w-[160px]  rounded-xl bg-white dark:bg-gray-850 border border-border-light dark:border-border-dark shadow-xl p-1.5 animate-in fade-in zoom-in-95 duration-200"
    side="bottom"
    align="end"
    sideOffset={8}
  >
    {#if !mounted}
      <div class="px-2 py-3 text-xs text-center text-gray-500 opacity-70">
        <iconify-icon icon="ph:spinner-gap" class="animate-spin text-lg mb-1" />
      </div>
    {:else}
      {#each languages as lang}
        <DropdownMenu.Item
          class="flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg cursor-pointer outline-none 
                    data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-700/50 
                    text-text-light dark:text-text-dark transition-colors"
          on:click={() => changeLanguage(lang.code)}
        >
          <span class="truncate font-medium">{lang.title}</span>

          {#if $i18n.language === lang.code}
            <span class=" flex items-center text-base">
              <iconify-icon icon="ph:check-bold" />
            </span>
          {/if}
        </DropdownMenu.Item>
      {/each}
    {/if}
  </DropdownMenu.Content>
</DropdownMenu.Root>
