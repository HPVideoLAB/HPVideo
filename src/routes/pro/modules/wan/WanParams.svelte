<script lang="ts">
  import { VIDEO_STYLES } from '../../../../constants/videoStyles';
  import { createEventDispatcher, getContext } from 'svelte';
  // 1. 引入通用组件
  import MySelect from '$lib/components/common/MySelect.svelte';
  import MyButton from '$lib/components/common/MyButton.svelte';

  // Props
  export let globalPrompt = '';
  export let negativePrompt = '';
  export let strength = 0.9;
  export let seed = -1;
  export let loras: { path: string; scale: number }[] = [];
  export let costUsd: number | null = null;

  // Advanced Props
  export let duration = 5;
  export let num_inference_steps = 30;
  export let guidance_scale = 5;
  export let flow_shift = 3;

  // Status
  export let taskStatus = 'idle';
  export let errors: any = {};

  const i18n: any = getContext('i18n');
  const dispatch = createEventDispatcher<{ generate: void }>();
  $: isLoading = taskStatus === 'submitting' || taskStatus === 'processing';

  let showAdvanced = false;
  let selectedStyleId = 'none';

  // 2. 转换 Style 数据以适配 MySelect
  $: styleOptions = VIDEO_STYLES.map((s) => ({
    value: s.id,
    label: s.label,
    desc: undefined, // 如果 VIDEO_STYLES 有描述字段也可以加上
  }));

  function handleStyleChange() {
    const style = VIDEO_STYLES.find((s) => s.id === selectedStyleId) || VIDEO_STYLES[0];
    if (style.value) {
      loras = [{ path: style.value, scale: style.scale }];
    } else {
      loras = [];
    }
    strength = style.strength;
  }

  function addTrigger(word: string) {
    if (!word || globalPrompt.includes(word)) return;
    const sep = globalPrompt.trim() ? ', ' : '';
    globalPrompt += sep + word;
  }

  $: currentStyle = VIDEO_STYLES.find((s) => s.id === selectedStyleId) || VIDEO_STYLES[0];
</script>

<section
  class="flex flex-col h-full gap-3 rounded-2xl border border-border-light bg-bg-light p-3 shadow-sm dark:border-border-dark dark:bg-bg-dark"
>
  <form class="flex flex-col gap-3 h-full" on:submit|preventDefault={() => !isLoading && dispatch('generate')}>
    <div class="flex flex-col gap-3">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between px-1">
            <span class="text-[10px] font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400">
              {$i18n.t('Style Filter')}
            </span>
          </div>
          <MySelect
            bind:value={selectedStyleId}
            options={styleOptions}
            showTriggerDesc={false}
            showTriggerMedia={false}
            placeholder={$i18n.t('Select Style')}
            on:change={(e) => {
              selectedStyleId = e.detail.value;
              handleStyleChange();
            }}
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between px-1">
            <span class="text-[10px] font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400">
              {$i18n.t('Strength')}
            </span>
            <span
              class="text-[10px] font-mono font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-1.5 py-0.5 rounded"
            >
              {strength}
            </span>
          </div>

          <div
            class="relative flex items-center h-[42px] px-3 rounded-2xl border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark"
          >
            <div class="relative w-full h-4 flex items-center">
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                bind:value={strength}
                class="absolute inset-0 w-full h-full z-20 opacity-0 cursor-pointer m-0 p-0 appearance-none"
              />

              <div class="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden relative z-0">
                <div
                  class="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full"
                  style="width: {strength * 100}%"
                />
              </div>

              <div
                class="h-4 w-4 bg-white dark:bg-gray-200 rounded-full shadow-md absolute top-1/2 -translate-y-1/2 z-10 pointer-events-none border border-gray-200 dark:border-gray-600"
                style="left: {strength * 100}%; transform: translate(-50%, -50%);"
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <button
          type="button"
          class="flex w-full items-center justify-between px-1 py-1 text-xs font-medium
                 text-text-lightSecondary dark:text-text-darkSecondary
                 hover:text-primary-600 dark:hover:text-primary-400
                 transition-colors group"
          on:click={() => (showAdvanced = !showAdvanced)}
        >
          <span class="flex items-center gap-1">
            <iconify-icon icon="lucide:settings-2" class="text-sm" />
            {$i18n.t('Advanced Parameters')}
          </span>
          <iconify-icon
            icon="lucide:chevron-down"
            class={`transform transition-transform duration-200 ${
              showAdvanced ? 'rotate-180' : ''
            } opacity-60 group-hover:opacity-100`}
          />
        </button>

        {#if showAdvanced}
          <div
            class="mt-2 grid grid-cols-2 gap-3 p-3 rounded-2xl border border-border-light dark:border-border-dark bg-gray-50/50 dark:bg-gray-950/30 animate-in slide-in-from-top-2 fade-in duration-200"
          >
            <div class="col-span-2 sm:col-span-1 space-y-1">
              <label class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{$i18n.t('Seed')}</label>
              <div class="relative">
                <input
                  type="number"
                  bind:value={seed}
                  placeholder="-1"
                  class="w-full rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-black/20 px-3 py-2 pl-8 text-xs focus:border-primary-500 focus:outline-none transition-all"
                />
                <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] grayscale opacity-60">🎲</span>
              </div>
            </div>

            <div class="col-span-2 sm:col-span-1 space-y-1">
              <label class="text-[10px] text-gray-500 font-bold uppercase tracking-wider"
                >{$i18n.t('Negative Prompt')}</label
              >
              <input
                type="text"
                bind:value={negativePrompt}
                class="w-full rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-black/20 px-3 py-2 text-xs focus:border-primary-500 focus:outline-none transition-all"
              />
            </div>

            <div class="space-y-1">
              <label class="text-[10px] text-gray-500 font-bold uppercase tracking-wider"
                >{$i18n.t('Duration (s)')}</label
              >
              <select
                bind:value={duration}
                class="w-full rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-black/20 px-3 py-2 text-xs focus:border-primary-500 focus:outline-none appearance-none"
              >
                {#each [5, 6, 7, 8, 9, 10] as d}<option value={d}>{d}s</option>{/each}
              </select>
            </div>

            <div class="space-y-1">
              <label class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{$i18n.t('Steps')}</label>
              <input
                type="number"
                bind:value={num_inference_steps}
                class="w-full rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-black/20 px-3 py-2 text-xs focus:border-primary-500 focus:outline-none"
              />
            </div>

            <div class="space-y-1">
              <label class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{$i18n.t('CFG Scale')}</label>
              <input
                type="number"
                step="0.5"
                bind:value={guidance_scale}
                class="w-full rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-black/20 px-3 py-2 text-xs focus:border-primary-500 focus:outline-none"
              />
            </div>

            <div class="space-y-1">
              <label class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{$i18n.t('Flow Shift')}</label
              >
              <input
                type="number"
                step="0.5"
                bind:value={flow_shift}
                class="w-full rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-black/20 px-3 py-2 text-xs focus:border-primary-500 focus:outline-none"
              />
            </div>
          </div>
        {/if}
      </div>
    </div>

    <div class="flex-1 min-h-0 flex flex-col justify-end">
      <div
        class={`flex flex-col gap-2 pb-2 w-full rounded-2xl border transition-all duration-300
        bg-bg-light dark:bg-bg-dark 
        shadow-sm dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]
        ${
          errors.globalPrompt
            ? 'border-error-500 focus-within:ring-2 focus-within:ring-error-500/20'
            : 'border-border-light dark:border-border-dark focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
      >
        <textarea
          bind:value={globalPrompt}
          rows={3}
          placeholder={$i18n.t('Describe video content...')}
          class="w-full resize-none bg-transparent px-4 py-3 text-sm text-text-light dark:text-text-dark outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
        />

        <div class="flex items-center justify-between px-2 pb-1.5 mt-[-4px]">
          <div class="flex items-center gap-2 pl-2">
            {#if currentStyle.triggerWord}
              <button
                type="button"
                class="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-all
                       bg-blue-50 text-blue-600 hover:bg-blue-100
                       dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40"
                on:click={() => addTrigger(currentStyle.triggerWord)}
              >
                <iconify-icon icon="mdi:magic-staff" />
                <span class="truncate max-w-[120px]">{$i18n.t('+ Add Recommended')}</span>
              </button>
            {/if}
          </div>

          <MyButton
            round
            size="large"
            disabled={isLoading}
            type="primary"
            htmlType="submit"
            class="!px-4 shadow-[0_0_15px_rgba(194,19,242,0.4)] hover:shadow-[0_0_20px_rgba(194,19,242,0.6)] transition-all duration-300 active:scale-95"
          >
            <span class="flex items-center gap-1.5">
              {#if isLoading}
                <iconify-icon icon="eos-icons:loading" class="text-lg animate-spin" />
                {$i18n.t('Generating...')}
              {:else}
                <iconify-icon icon="mdi:sparkles" class="text-lg text-white" />

                {#if costUsd !== null}
                  <span class="w-[1px] h-3 bg-white/30 mx-0.5" />
                  <span class="text-sm font-bold font-mono">
                    {costUsd === 0 ? 'FREE' : `$${costUsd.toFixed(3)}`}
                  </span>
                {/if}
              {/if}
            </span>
          </MyButton>
        </div>

        {#if errors.globalPrompt}
          <div class="min-h-[20px] flex items-center px-2 border-t border-gray-100 dark:border-gray-800 pt-2 mx-2">
            <div
              class="text-[10px] text-error-500 font-medium flex items-center gap-1 animate-in fade-in slide-in-from-left-1"
            >
              <iconify-icon icon="mdi:alert-circle" />
              <span>{errors.globalPrompt}</span>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </form>
</section>
