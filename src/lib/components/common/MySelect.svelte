<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { fade, slide } from 'svelte/transition';

  // 接收的参数
  export let value = ''; // 当前选中的 value (双向绑定)
  export let options: { value: string; label: string; icon?: string }[] = []; // 选项列表
  export let placeholder = 'Select an option';

  let isOpen = false;
  let containerRef: HTMLElement;

  const dispatch = createEventDispatcher();

  // 计算当前选中的对象，用于显示
  $: selectedOption = options.find((o) => o.value === value);

  // 切换下拉框状态
  function toggle() {
    isOpen = !isOpen;
  }

  // 选择选项
  function select(option: any) {
    value = option.value;
    isOpen = false;
    dispatch('change', option);
  }

  // 点击外部关闭下拉框
  function handleClickOutside(event: MouseEvent) {
    if (containerRef && !containerRef.contains(event.target as Node)) {
      isOpen = false;
    }
  }

  // 挂载时添加全局点击事件监听
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
           bg-[#2A2A2A] hover:bg-[#333333] active:bg-[#222222]
           border border-gray-700/50
           rounded-full transition-all duration-200 ease-in-out
           text-white text-sm font-medium shadow-sm group"
  >
    <div class="flex items-center gap-2 truncate">
      {#if selectedOption?.icon}
        <img src={selectedOption.icon} alt="icon" class="w-5 h-5 object-contain rounded-full" />
      {:else if !selectedOption}{/if}

      <span class={!selectedOption ? 'text-gray-400' : ''}>
        {selectedOption?.label || placeholder}
      </span>
    </div>

    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      class="w-5 h-5 text-gray-400 ml-2 transition-transform duration-200 {isOpen ? 'rotate-180' : ''}"
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
             bg-[#2A2A2A] border border-gray-700 rounded-xl shadow-xl
             max-h-60 overflow-y-auto overflow-x-hidden p-1"
    >
      <div class="py-1 space-y-2" role="none">
        {#each options as option}
          <button
            on:click={() => select(option)}
            class="flex items-center w-full px-4 py-2.5 text-sm text-left
                   rounded-lg transition-colors
                   {value === option.value
              ? 'bg-purple-600/20 text-purple-400'
              : 'text-gray-300 hover:bg-[#383838] hover:text-white'}"
          >
            {#if option.icon}
              <img src={option.icon} alt="" class="w-5 h-5 mr-3 object-contain" />
            {/if}
            <span class="truncate font-medium">{option.label}</span>

            {#if value === option.value}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 ml-auto">
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
          <div class="px-4 py-2 text-sm text-gray-500">No options found</div>
        {/if}
      </div>
    </div>
  {/if}
</div>
