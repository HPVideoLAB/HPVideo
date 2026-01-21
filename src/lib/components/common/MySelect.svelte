<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { slide } from 'svelte/transition';

  export let value = '';
  // 🔥 扩展类型定义：增加 desc
  export let options: {
    value: string;
    label: string;
    desc?: string; // 模型简要描述
    icon?: string; // 模型图标 (URL)
    hasAudio?: boolean; // 是否支持音频
  }[] = [];
  export let placeholder = 'Select an option';

  let isOpen = false;
  let containerRef: HTMLElement;

  const dispatch = createEventDispatcher();

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

<div class="relative z-[9999] inline-block text-left w-full" bind:this={containerRef}>
  <button
    type="button"
    on:click={toggle}
    class="flex items-center justify-between w-full px-4 py-1.5
         bg-bg-light dark:bg-bg-dark
         hover:bg-gray-100 dark:hover:bg-gray-800
         active:bg-gray-200 dark:active:bg-gray-850
         border border-border-light dark:border-border-dark
         rounded-full transition-all duration-200 ease-in-out
         text-text-light dark:text-text-dark
         text-sm font-medium shadow-sm group"
  >
    <div class="flex items-center gap-3 truncate flex-1">
      {#if selectedOption?.icon}
        <img
          src={selectedOption.icon}
          alt="icon"
          class="w-8 h-8 object-contain rounded-lg bg-gray-50 dark:bg-gray-800 p-0.5 border border-gray-100 dark:border-gray-700"
        />
      {/if}

      <div class="flex flex-col items-start truncate">
        <div class="flex items-center gap-2">
          <span class="text-sm font-bold {!selectedOption ? 'text-text-lightSecondary' : ''}">
            {selectedOption?.label || placeholder}
          </span>

          {#if selectedOption}
            <iconify-icon
              icon={selectedOption.hasAudio ? 'lucide:volume-2' : 'lucide:volume-x'}
              class="text-xs {selectedOption.hasAudio ? 'text-success-500' : 'text-gray-400'}"
            />
          {/if}
        </div>
      </div>
    </div>

    <iconify-icon
      icon="lucide:chevron-down"
      class="text-xl text-gray-400 transition-transform duration-200 {isOpen ? 'rotate-180 text-primary-500' : ''}"
    />
  </button>

  {#if isOpen}
    <div
      transition:slide={{ duration: 150, axis: 'y' }}
      class="absolute left-0 right-0 z-50 mt-2 origin-top-right
             bg-bg-light dark:bg-bg-dark
             border border-border-light dark:border-border-dark
             rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-black/60
             max-h-[400px] overflow-y-auto overflow-x-hidden p-1.5 scroll-fade"
    >
      <div class="space-y-2">
        {#each options as option}
          <button
            on:click={() => select(option)}
            class="group flex items-start w-full px-3 py-3 text-left rounded-xl transition-all
                   {value === option.value
              ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-500/30'
              : 'border border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'}"
          >
            <div class="flex-shrink-0 mt-0.5">
              {#if option.icon}
                <img
                  src={option.icon}
                  alt=""
                  class="w-9 h-9 object-contain rounded-lg bg-white dark:bg-gray-800 p-0.5 border border-gray-100 dark:border-gray-700"
                />
              {/if}
            </div>

            <div class="ml-3 flex-1 min-w-0 flex flex-col justify-center">
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-text-light dark:text-text-dark truncate">
                  {option.label}
                </span>

                {#if option.hasAudio}
                  <span
                    class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-success-50 text-success-600 dark:bg-success-900/30 dark:text-success-400 border border-success-100 dark:border-success-900/50"
                  >
                    Audio
                  </span>
                {/if}
              </div>

              {#if option.desc}
                <p
                  class="mt-0.5 text-[10px] leading-4 text-text-lightSecondary dark:text-text-darkSecondary line-clamp-2 opacity-80"
                >
                  {option.desc}
                </p>
              {/if}
            </div>

            {#if value === option.value}
              <div class="flex-shrink-0 ml-3 mt-2">
                <iconify-icon icon="lucide:check-circle-2" class="text-lg text-primary-500" />
              </div>
            {/if}
          </button>
        {/each}

        {#if options.length === 0}
          <div class="px-4 py-4 text-center text-sm text-text-lightSecondary">No options available</div>
        {/if}
      </div>
    </div>
  {/if}
</div>
