<!-- WanParams.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { VIDEO_STYLES } from '../../../../constants/videoStyles';

  // Props
  export let globalPrompt = '';
  export let negativePrompt = '';
  export let strength = 0.9;
  export let seed = -1;
  export let loras: { path: string; scale: number }[] = [];
  export let costUsd: number | null = null; // 例如 0.12；null 表示不显示

  // Advanced Props
  export let duration = 5;
  export let num_inference_steps = 30;
  export let guidance_scale = 5;
  export let flow_shift = 3;

  // Status
  export let taskStatus = 'idle';
  export let errors: any = {};

  const dispatch = createEventDispatcher<{ generate: void }>();
  $: isLoading = taskStatus === 'submitting' || taskStatus === 'processing';

  let showAdvanced = false;
  let selectedStyleId = 'none';

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
  class="flex flex-col gap-1 rounded-2xl
         border border-border-light dark:border-border-dark
         bg-bg-light/60 dark:bg-bg-dark/40
         p-3 shadow-sm"
>
  <form class="flex flex-col gap-1" on:submit|preventDefault={() => !isLoading && dispatch('generate')}>
    <div class="flex flex-col md:flex-row items-center gap-2">
      <div class="relative w-full flex flex-col gap-1 flex-[5]">
        <textarea
          bind:value={globalPrompt}
          rows={1}
          placeholder="描述视频内容..."
          class={`w-full resize-none rounded-2xl border px-4 py-3 text-sm
                  bg-bg-light dark:bg-bg-dark
                  text-text-light dark:text-text-dark
                  placeholder:text-text-lightSecondary dark:placeholder:text-text-darkSecondary
                  outline-none transition-all
                  focus-visible:ring-2 focus-visible:ring-primary-500/25
                  focus-visible:ring-offset-2 focus-visible:ring-offset-bg-light dark:focus-visible:ring-offset-bg-dark
                  ${
                    errors.globalPrompt
                      ? 'border-error-500/60 focus:border-error-500 focus-visible:ring-error-500/25'
                      : 'border-border-light dark:border-border-dark focus:border-primary-500'
                  }`}
        />
        {#if errors.globalPrompt}
          <div class="mt-1 text-[11px] text-error-600 dark:text-error-300">{errors.globalPrompt}</div>
        {/if}
      </div>
    </div>

    <!-- Strength + Params Panel -->
    <div class="rounded-2xl border border-border-light dark:border-border-dark px-3 py-2">
      <div>
        <div class="flex justify-between items-end mb-2">
          <label class="text-xs font-medium text-text-lightSecondary dark:text-text-darkSecondary">
            重绘幅度 (Strength)
          </label>

          <div
            class="text-xs font-bold font-mono
                   text-primary-600 dark:text-primary-300
                   bg-primary-500/10 px-2 py-0.5 rounded-md"
          >
            {strength}
          </div>
        </div>

        <!-- Slider (视觉轨道) -->
        <div class="relative flex items-center h-5">
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            bind:value={strength}
            class="w-full absolute z-20 opacity-0 cursor-pointer h-full"
          />

          <div class="w-full h-1.5 bg-gray-200 dark:bg-gray-800/70 rounded-full overflow-hidden absolute z-10">
            <div
              class="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all duration-100"
              style="width: {strength * 100}%"
            />
          </div>

          <div
            class="h-4 w-4 bg-white dark:bg-gray-100 rounded-full shadow-md absolute z-10 pointer-events-none
                   transition-all duration-100 border-2 border-primary-500"
            style="left: calc({strength * 100}% - 8px)"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div class="col-span-3 space-y-1">
          <div class="flex justify-between items-center px-1">
            {#if currentStyle.triggerWord}
              <button
                type="button"
                class="text-[10px] font-medium text-blue-600 dark:text-blue-400
                       hover:text-blue-700 dark:hover:text-blue-300
                       transition flex items-center gap-1 opacity-80 hover:opacity-100"
                on:click={() => addTrigger(currentStyle.triggerWord)}
              >
                <span class="truncate max-w-[120px]">+ 推荐词</span>
              </button>
            {/if}
          </div>
        </div>

        <!-- Style select -->
        <div class="col-span-3 xl:col-span-1 space-y-1">
          <label class="text-xs font-medium text-text-lightSecondary dark:text-text-darkSecondary px-1">风格滤镜</label>

          <div class="relative group">
            <select
              bind:value={selectedStyleId}
              on:change={handleStyleChange}
              class="w-full appearance-none rounded-xl border px-3 pr-8 py-2.5 text-xs
                     bg-bg-light dark:bg-bg-dark
                     text-text-light dark:text-text-dark
                     border-border-light dark:border-border-dark
                     outline-none transition-all
                     hover:border-gray-300 dark:hover:border-gray-700
                     focus:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500/20
                     focus-visible:ring-offset-2 focus-visible:ring-offset-bg-light dark:focus-visible:ring-offset-bg-dark"
            >
              {#each VIDEO_STYLES as style}
                <option value={style.id}>{style.label}</option>
              {/each}
            </select>
          </div>
        </div>

        <!-- Seed -->
        <div class="col-span-3 xl:col-span-1 space-y-1">
          <label class="text-xs font-medium text-text-lightSecondary dark:text-text-darkSecondary px-1">随机种子</label>

          <div class="relative group">
            <input
              type="number"
              bind:value={seed}
              placeholder="-1"
              class="w-full rounded-xl border pl-8 pr-2 py-2.5 text-xs font-mono
                     bg-bg-light dark:bg-bg-dark
                     text-text-light dark:text-text-dark
                     placeholder:text-text-lightSecondary dark:placeholder:text-text-darkSecondary
                     border-border-light dark:border-border-dark
                     outline-none transition-all
                     hover:border-gray-300 dark:hover:border-gray-700
                     focus:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500/20
                     focus-visible:ring-offset-2 focus-visible:ring-offset-bg-light dark:focus-visible:ring-offset-bg-dark"
            />

            <div
              class="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-lightSecondary dark:text-text-darkSecondary text-[10px] pointer-events-none
                     group-focus-within:text-primary-600 dark:group-focus-within:text-primary-300 transition-colors"
            >
              🎲
            </div>
          </div>
        </div>

        <!-- Negative prompt -->
        <div class="col-span-3 xl:col-span-1 space-y-1">
          <label class="text-xs font-medium text-text-lightSecondary dark:text-text-darkSecondary px-1"
            >负向提示词</label
          >

          <div class="relative group">
            <input
              type="text"
              bind:value={negativePrompt}
              placeholder="负向提示词..."
              class="w-full xl:w-[180px] rounded-xl border px-4 py-2.5 text-xs
                     bg-bg-light dark:bg-bg-dark
                     text-text-light dark:text-text-dark
                     placeholder:text-text-lightSecondary dark:placeholder:text-text-darkSecondary
                     border-border-light dark:border-border-dark
                     outline-none transition-all
                     hover:border-gray-300 dark:hover:border-gray-700
                     focus:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500/20
                     focus-visible:ring-offset-2 focus-visible:ring-offset-bg-light dark:focus-visible:ring-offset-bg-dark"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Advanced -->
    <div>
      <button
        type="button"
        class="flex w-full py-2 items-center justify-between text-xs font-medium
               text-text-lightSecondary dark:text-text-darkSecondary
               hover:text-text-light dark:hover:text-text-dark
               transition-colors"
        on:click={() => (showAdvanced = !showAdvanced)}
      >
        <span>高级参数 (Advanced)</span>
        <span class={`transform transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''} opacity-60`}
          >▼</span
        >
      </button>

      {#if showAdvanced}
        <div
          class="grid grid-cols-2 gap-3 pb-1 animate-in slide-in-from-top-2 fade-in duration-300
                 rounded-2xl border border-border-light dark:border-border-dark
                  p-3"
        >
          <div class="space-y-1">
            <label
              class="text-[10px] text-text-lightSecondary dark:text-text-darkSecondary uppercase tracking-wider font-bold"
            >
              Duration
            </label>
            <div class="relative">
              <select
                bind:value={duration}
                class="w-full appearance-none rounded-lg border px-3 py-2 text-xs
                       bg-bg-light dark:bg-bg-dark
                       text-text-light dark:text-text-dark
                       border-border-light dark:border-border-dark
                       outline-none transition-all
                       focus:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500/15
                       focus-visible:ring-offset-2 focus-visible:ring-offset-bg-light dark:focus-visible:ring-offset-bg-dark"
              >
                {#each [5, 6, 7, 8, 9, 10] as d}<option value={d}>{d}s</option>{/each}
              </select>
            </div>
          </div>

          <div class="space-y-1">
            <label
              class="text-[10px] text-text-lightSecondary dark:text-text-darkSecondary uppercase tracking-wider font-bold"
            >
              Steps
            </label>
            <input
              type="number"
              bind:value={num_inference_steps}
              class="w-full rounded-lg border px-3 py-2 text-xs
                     bg-bg-light dark:bg-bg-dark
                     text-text-light dark:text-text-dark
                     border-border-light dark:border-border-dark
                     outline-none transition-all
                     focus:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500/15
                     focus-visible:ring-offset-2 focus-visible:ring-offset-bg-light dark:focus-visible:ring-offset-bg-dark"
            />
          </div>

          <div class="space-y-1">
            <label
              class="text-[10px] text-text-lightSecondary dark:text-text-darkSecondary uppercase tracking-wider font-bold"
            >
              CFG Scale
            </label>
            <input
              type="number"
              step="0.5"
              bind:value={guidance_scale}
              class="w-full rounded-lg border px-3 py-2 text-xs
                     bg-bg-light dark:bg-bg-dark
                     text-text-light dark:text-text-dark
                     border-border-light dark:border-border-dark
                     outline-none transition-all
                     focus:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500/15
                     focus-visible:ring-offset-2 focus-visible:ring-offset-bg-light dark:focus-visible:ring-offset-bg-dark"
            />
          </div>

          <div class="space-y-1">
            <label
              class="text-[10px] text-text-lightSecondary dark:text-text-darkSecondary uppercase tracking-wider font-bold"
            >
              Flow Shift
            </label>
            <input
              type="number"
              step="0.5"
              bind:value={flow_shift}
              class="w-full rounded-lg border px-3 py-2 text-xs
                     bg-bg-light dark:bg-bg-dark
                     text-text-light dark:text-text-dark
                     border-border-light dark:border-border-dark
                     outline-none transition-all
                     focus:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500/15
                     focus-visible:ring-offset-2 focus-visible:ring-offset-bg-light dark:focus-visible:ring-offset-bg-dark"
            />
          </div>
        </div>
      {/if}
    </div>

    <!-- Submit -->
    <button
      type="submit"
      disabled={isLoading}
      class="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-primary-600 to-violet-600 px-4 py-3
             text-sm font-bold text-white shadow-lg shadow-primary-900/25 transition-all
             hover:scale-[1.02] hover:shadow-primary-900/40 active:scale-[0.98]
             disabled:cursor-not-allowed disabled:opacity-50
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40
             focus-visible:ring-offset-2 focus-visible:ring-offset-bg-light dark:focus-visible:ring-offset-bg-dark"
    >
      <span class="relative z-10 flex w-full items-center justify-center">
        <span class="flex items-center gap-2">
          {#if isLoading}
            <iconify-icon icon="eos-icons:loading" class="text-lg" />
            生成中...
          {:else}
            <iconify-icon icon="mdi:sparkles" class="text-xl text-warning-400" />
            生成视频
            {#if !isLoading && costUsd !== null}
              <span class="font-semibold">(${costUsd.toFixed(3)}/次)</span>
            {/if}
          {/if}
        </span>
      </span>

      <div
        class="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]
               bg-gradient-to-r from-transparent via-white/20 to-transparent z-0"
      />
    </button>
  </form>
</section>
