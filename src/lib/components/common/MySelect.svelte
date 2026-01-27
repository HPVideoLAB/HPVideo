<script lang="ts">
  import { Select, type Selected } from 'bits-ui';
  import { fly } from 'svelte/transition';
  import { createEventDispatcher, getContext } from 'svelte';

  export let showTriggerMedia = true; // 默认不影响你其他地方
  export let triggerMediaSize = 24; // 可选：统一高度更稳（默认 24 就不会撑高）

  export let value = '';
  export let showTriggerDesc = true; // 默认保持你现在的行为
  export let options: {
    value: string;
    label: string;
    desc?: string;
    icon?: string;
    hasAudio?: boolean;
    gender?: 'male' | 'female' | 'robot';
  }[] = [];

  export let placeholder = 'Select';

  const dispatch = createEventDispatcher();
  const i18n: any = getContext('i18n');

  // 内部状态：bits-ui 需要的对象格式
  let selected: Selected<string> | undefined;

  // 1. (父 -> 子) 监听外部 value 变化
  $: if (value !== undefined) {
    const found = options.find((o) => o.value === value);
    // 防止死循环：只有不一致时才更新
    if (found && selected?.value !== found.value) {
      selected = { value: found.value, label: found.label };
    }
  }

  // 2. (子 -> 父) 处理选中变化
  function handleSelectedChange(newSelected: Selected<string> | undefined) {
    if (!newSelected) return;

    selected = newSelected;

    // ✅ label 可能是 undefined，所以用 options 兜底一次
    const nextValue = newSelected.value;
    if (value !== nextValue) {
      value = nextValue;

      const fullOption = options.find((o) => o.value === value);
      if (fullOption) dispatch('change', fullOption);
    }
  }

  // 辅助变量：用于显示 Trigger 内容
  $: currentOption = options.find((o) => o.value === value);
</script>

<div class="w-full relative z-[50]">
  <Select.Root {selected} onSelectedChange={handleSelectedChange}>
    <Select.Trigger
      class="group flex w-full items-center justify-between rounded-2xl border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark px-3 py-2.5 shadow-sm transition-all duration-200 
             hover:border-primary-400 dark:hover:border-primary-600 hover:shadow-md 
             focus:outline-none focus:ring-2 focus:ring-primary-500/20 
             data-[state=open]:border-primary-500 data-[state=open]:ring-2 data-[state=open]:ring-primary-500/10"
      aria-label={placeholder}
    >
      <div class="flex items-center gap-3.5 truncate flex-1 text-left">
        {#if showTriggerMedia && (currentOption?.icon || currentOption?.gender)}
          <div
            class="relative shrink-0 rounded-lg border border-black/5 dark:border-white/5 flex items-center justify-center overflow-hidden
                 bg-gray-50 dark:bg-white/5"
            style={`width:${triggerMediaSize}px;height:${triggerMediaSize}px;`}
          >
            {#if currentOption?.icon}
              <img src={currentOption.icon} alt="icon" class="w-full h-full object-cover" />
            {:else if currentOption?.gender}
              <iconify-icon
                icon={currentOption.gender === 'female'
                  ? 'mdi:face-woman'
                  : currentOption.gender === 'male'
                  ? 'mdi:face-man'
                  : 'mdi:robot'}
                class={`text-base ${
                  currentOption.gender === 'female'
                    ? 'text-pink-500'
                    : currentOption.gender === 'male'
                    ? 'text-blue-500'
                    : 'text-purple-500'
                }`}
              />
            {/if}
          </div>
        {/if}

        <div class="flex flex-col items-start truncate flex-1 min-w-0">
          <div class="flex items-center gap-2 w-full">
            <span class="text-sm font-bold text-text-light dark:text-text-dark truncate">
              {currentOption?.label || placeholder}
            </span>

            {#if currentOption?.hasAudio}
              <div
                class="flex items-center justify-center w-5 h-5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20"
                title="Audio Supported"
              >
                <iconify-icon icon="lucide:volume-2" class="text-[10px] text-emerald-600 dark:text-emerald-400" />
              </div>
            {/if}
          </div>

          {#if showTriggerDesc}
            <span class="text-[10px] text-gray-400 dark:text-gray-500 truncate w-full text-left leading-tight mt-0.5">
              {currentOption?.desc || placeholder}
            </span>
          {/if}
        </div>
      </div>

      <iconify-icon
        icon="lucide:chevron-down"
        class="text-lg text-gray-400 transition-transform duration-300 group-data-[state=open]:rotate-180 group-data-[state=open]:text-primary-500"
      />
    </Select.Trigger>

    <Select.Content
      class="z-[9999] min-w-[var(--bits-select-anchor-width)] rounded-2xl border border-border-light dark:border-border-dark bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-xl p-1.5 shadow-2xl outline-none"
      transition={fly}
      transitionConfig={{ duration: 200, y: -5 }}
      sideOffset={4}
      collisionPadding={8}
    >
      <div class="max-h-[320px] overflow-y-auto scroll-fade space-y-1">
        {#each options as option}
          <Select.Item
            value={option.value}
            label={option.label}
            class="group relative flex w-full cursor-pointer select-none items-center gap-3 rounded-xl px-2.5 py-2.5 outline-none transition-all duration-200
                   data-[highlighted]:bg-gray-50 dark:data-[highlighted]:bg-white/5
                   data-[state=checked]:bg-primary-50 dark:data-[state=checked]:bg-primary-900/20"
          >
            <div
              class="absolute left-0 top-3 bottom-3 w-1 bg-primary-500 rounded-r-full opacity-0 data-[state=checked]:opacity-100 transition-opacity"
            />

            {#if option.icon || option.gender}
              <div
                class="shrink-0 w-10 h-10 rounded-lg bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-center p-0.5 shadow-sm
                     group-data-[state=checked]:ring-2 group-data-[state=checked]:ring-primary-500/20"
              >
                {#if option.icon}
                  <img src={option.icon} alt="" class="w-full h-full object-contain rounded-md" />
                {:else if option.gender}
                  <div
                    class={`w-full h-full flex items-center justify-center rounded-md text-lg
                    ${
                      option.gender === 'female'
                        ? 'text-pink-500 bg-pink-50 dark:bg-pink-900/10'
                        : option.gender === 'male'
                        ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/10'
                        : 'text-purple-500 bg-purple-50 dark:bg-purple-900/10'
                    }`}
                  >
                    <iconify-icon
                      icon={option.gender === 'female'
                        ? 'mdi:face-woman'
                        : option.gender === 'male'
                        ? 'mdi:face-man'
                        : 'mdi:robot'}
                    />
                  </div>
                {/if}
              </div>
            {/if}

            <div class="flex-1 min-w-0 flex flex-col justify-center py-0.5">
              <div class="flex items-center justify-between gap-2 mb-0.5">
                <div
                  class="text-xs font-bold truncate text-text-light dark:text-text-dark group-data-[state=checked]:text-primary-600 dark:group-data-[state=checked]:text-primary-400"
                >
                  {option.label}
                </div>

                {#if option.hasAudio}
                  <span
                    class="whitespace-nowrap flex items-center gap-1 px-1.5 py-[2px] rounded-xl text-[9px] font-bold tracking-wider uppercase border
                        border-primary-200 text-primary-500 dark:bg-white/10 dark:border-white/10 dark:text-primary-500
                       group-data-[state=checked]:bg-primary-100 group-data-[state=checked]:border-primary-200 group-data-[state=checked]:text-primary-700
                       dark:group-data-[state=checked]:bg-primary-500/20 dark:group-data-[state=checked]:border-primary-500/30 dark:group-data-[state=checked]:text-primary-300"
                  >
                    <iconify-icon icon="lucide:volume-2" class="text-[10px]" />
                    Audio
                  </span>
                {/if}
              </div>

              {#if option.desc}
                <p
                  class="text-[10px] leading-relaxed line-clamp-2 text-gray-500 dark:text-gray-500
            group-data-[state=checked]:text-primary-600/70 dark:group-data-[state=checked]:text-primary-400/70"
                >
                  {option.desc}
                </p>
              {/if}
            </div>

            <Select.ItemIndicator class="flex-shrink-0 ml-auto self-center">
              <iconify-icon icon="lucide:check-circle-2" class="text-lg text-primary-500 drop-shadow-sm" />
            </Select.ItemIndicator>
          </Select.Item>
        {/each}
      </div>
    </Select.Content>
  </Select.Root>
</div>

<style>
  .scroll-fade::-webkit-scrollbar {
    width: 4px;
  }
  .scroll-fade::-webkit-scrollbar-track {
    background: transparent;
  }
  .scroll-fade::-webkit-scrollbar-thumb {
    background-color: rgba(156, 163, 175, 0.3);
    border-radius: 20px;
  }
  .dark .scroll-fade::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.15);
  }
</style>
