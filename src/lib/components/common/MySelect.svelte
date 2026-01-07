<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { fade, slide } from 'svelte/transition';

  // 接收的参数
  // 修改：扩展 options 的类型定义，增加 hasAudio 字段
  export let value = '';
  export let options: {
    value: string;
    label: string;
    icon?: string;
    hasAudio?: boolean; // 新增：true 代表支持生成声音，false 或 undefined 代表不支持
  }[] = [];
  export let placeholder = 'Select an option';

  let isOpen = false;
  let containerRef: HTMLElement;

  const dispatch = createEventDispatcher();

  // 计算当前选中的对象
  $: selectedOption = options.find((o) => o.value === value);

  function toggle() {
    isOpen = !isOpen;
  }

  function select(option: any) {
    value = option.value;
    isOpen = false;
    dispatch('change', option);
  }

  function handleClickOutside(event: MouseEvent) {
    if (containerRef && !containerRef.contains(event.target as Node)) {
      isOpen = false;
    }
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });
</script>

<div class="relative inline-block text-left w-full" bind:this={containerRef}>
  <button
    type="button"
    on:click={toggle}
    class="flex items-center justify-between w-full px-4 py-2.5
           bg-bg-light dark:bg-bg-dark
           hover:bg-gray-100 dark:hover:bg-gray-800
           active:bg-gray-200 dark:active:bg-gray-850
           border border-border-light dark:border-border-dark
           rounded-full transition-all duration-200 ease-in-out
           text-text-light dark:text-text-dark
           text-sm font-medium shadow-sm group"
  >
    <div class="flex items-center gap-2 truncate flex-1">
      {#if selectedOption?.icon}
        <img src={selectedOption.icon} alt="icon" class="w-5 h-5 object-contain rounded-full" />
      {/if}

      <span class={!selectedOption ? 'text-text-lightSecondary dark:text-text-darkSecondary' : 'truncate'}>
        {selectedOption?.label || placeholder}
      </span>

      {#if selectedOption}
        <div
          class="flex items-center justify-center ml-1 px-1.5 py-0.5 rounded text-xs gap-0.5
                 {selectedOption.hasAudio
            ? 'bg-success-500/10 text-success-600 dark:text-success-300'
            : 'bg-gray-200/70 text-text-lightSecondary dark:bg-gray-700/30 dark:text-text-darkSecondary'}"
          title={selectedOption.hasAudio ? 'Supports Audio Generation' : 'Silent / No Audio'}
        >
          <iconify-icon icon={selectedOption.hasAudio ? 'lucide:volume-2' : 'lucide:volume-x'} class="text-sm" />
        </div>
      {/if}
    </div>

    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      class="w-5 h-5 ml-2 transition-transform duration-200
             text-gray-500 dark:text-gray-400
             {isOpen ? 'rotate-180' : ''}"
    >
      <path
        fill-rule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clip-rule="evenodd"
      />
    </svg>
  </button>

  {#if isOpen}
    <div
      transition:slide={{ duration: 150 }}
      class="absolute left-0 right-0 z-50 mt-2 origin-top-right
             bg-bg-light dark:bg-bg-dark
             border border-border-light dark:border-border-dark
             rounded-xl shadow-xl
             max-h-60 overflow-y-auto overflow-x-hidden p-1"
    >
      <div class="py-1 space-y-1" role="none">
        {#each options as option}
          <button
            on:click={() => select(option)}
            class="group flex items-center justify-between w-full px-4 py-2.5 text-sm text-left
                   rounded-lg transition-colors
                   {value === option.value
              ? 'bg-primary-500/10 text-primary-600 dark:text-primary-300'
              : 'text-text-lightSecondary dark:text-text-darkSecondary hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-text-light dark:hover:text-text-dark'}"
          >
            <div class="flex items-center gap-3 truncate">
              {#if option.icon}
                <img src={option.icon} alt="" class="w-5 h-5 object-contain" />
              {/if}

              <span class="truncate font-medium text-text-light dark:text-text-dark">
                {option.label}
              </span>

              <div class="flex items-center" title={option.hasAudio ? 'Supports Audio' : 'No Audio'}>
                <iconify-icon
                  icon={option.hasAudio ? 'lucide:volume-2' : 'lucide:volume-x'}
                  class="text-base {option.hasAudio
                    ? value === option.value
                      ? 'text-success-600 dark:text-success-300'
                      : 'text-gray-500 dark:text-gray-500 group-hover:text-success-600 dark:group-hover:text-success-300'
                    : 'text-gray-400 dark:text-gray-600 opacity-60'}"
                />
              </div>
            </div>

            {#if value === option.value}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="w-4 h-4 ml-2 text-primary-600 dark:text-primary-300"
              >
                <path
                  fill-rule="evenodd"
                  d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                  clip-rule="evenodd"
                />
              </svg>
            {/if}
          </button>
        {/each}

        {#if options.length === 0}
          <div class="px-4 py-2 text-sm text-text-lightSecondary dark:text-text-darkSecondary">No options found</div>
        {/if}
      </div>
    </div>
  {/if}
</div>
