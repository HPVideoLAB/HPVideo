<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { VIDEO_STYLES } from '../../../../constants/videoStyles';
  import type { VideoStyle } from '../../../../constants/videoStyles';

  // Props
  export let globalPrompt = '';
  export let negativePrompt = '';
  export let strength = 0.9;
  export let seed = -1;
  export let loras: { path: string; scale: number }[] = [];

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

<section class="flex flex-col gap-3 rounded-3xl border border-white/5 p-3 shadow-2xl">
  <form class="flex flex-col gap-3" on:submit|preventDefault={() => !isLoading && dispatch('generate')}>
    <div class="space-y-3">
      <div class="space-y-1.5">
        <div class="relative">
          <textarea
            bind:value={globalPrompt}
            rows={1}
            placeholder="描述视频内容..."
            class={`w-full resize-none rounded-2xl border bg-gray-900/60 px-4 py-3 text-sm text-gray-100 placeholder:text-gray-600 outline-none transition-all
                    ${
                      errors.globalPrompt
                        ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/20'
                        : 'border-white/10 hover:border-white/20 focus:border-primary-500 bg-gray-900 focus:ring-1 focus:ring-primary-500/30'
                    }`}
          />
          <div class="absolute bottom-2 right-3 text-[10px] text-gray-600 pointer-events-none font-mono">PROMPT</div>
        </div>
      </div>

      <div class="space-y-1.5">
        <input
          type="text"
          bind:value={negativePrompt}
          placeholder="负向提示词 (Negative Prompt)..."
          class="w-full rounded-xl border border-white/5 bg-gray-900/40 px-4 py-2.5 text-xs text-gray-300 placeholder:text-gray-600 outline-none transition-all hover:border-white/10 focus:border-gray-600 bg-gray-900"
        />
      </div>
    </div>

    <div class="rounded-2xl border border-white/5 bg-gray-900/30 p-3">
      <div class="">
        <div class="flex justify-between items-end mb-2">
          <label class="text-xs font-medium text-gray-400">重绘幅度 (Strength)</label>
          <div class="text-xs font-bold text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-md font-mono">
            {strength}
          </div>
        </div>
        <div class="relative flex items-center h-5">
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            bind:value={strength}
            class="w-full absolute z-20 opacity-0 cursor-pointer h-full"
          />
          <div class="w-full h-1.5 bg-gray-700/50 rounded-full overflow-hidden absolute z-10">
            <div
              class="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all duration-100"
              style="width: {strength * 100}%"
            />
          </div>
          <div
            class="h-4 w-4 bg-white rounded-full shadow-md absolute z-10 pointer-events-none transition-all duration-100 border-2 border-primary-500"
            style="left: calc({strength * 100}% - 8px)"
          />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-x-3">
        <div class="col-span-3 space-y-1">
          <div class="flex justify-between items-center px-1">
            {#if currentStyle.triggerWord}
              <button
                type="button"
                class="text-[9px] text-blue-400 hover:text-blue-300 transition flex items-center gap-1 opacity-80 hover:opacity-100"
                on:click={() => addTrigger(currentStyle.triggerWord)}
              >
                <span class="truncate max-w-[80px]">+ 推荐词</span>
              </button>
            {/if}
          </div>
        </div>

        <div class=" space-y-1">
          <label class="text-xs font-medium text-gray-400 px-1">风格滤镜</label>
          <div class="relative group">
            <select
              bind:value={selectedStyleId}
              on:change={handleStyleChange}
              class="w-full appearance-none rounded-xl border border-gray-800 bg-[#1a1a1a] pl-3 pr-8 py-2.5 text-xs text-gray-200 outline-none transition-all hover:border-gray-700 focus:border-primary-500 focus:bg-[#222]"
            >
              {#each VIDEO_STYLES as style}
                <option value={style.id}>{style.label}</option>
              {/each}
            </select>
            <div class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg
              >
            </div>
          </div>
        </div>

        <div class=" space-y-1">
          <label class="text-xs font-medium text-gray-400 px-1">随机种子</label>
          <div class="relative group">
            <input
              type="number"
              bind:value={seed}
              placeholder="-1"
              class="w-full rounded-xl border border-gray-800 bg-[#1a1a1a] pl-8 pr-2 py-2.5 text-xs text-gray-200 font-mono outline-none transition-all hover:border-gray-700 focus:border-primary-500 focus:bg-[#222]"
            />
            <div
              class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-[10px] pointer-events-none group-focus-within:text-primary-500 transition-colors"
            >
              🎲
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="">
      <button
        type="button"
        class="flex w-full items-center justify-between py-2 text-xs font-medium text-gray-500 hover:text-gray-300 transition-colors"
        on:click={() => (showAdvanced = !showAdvanced)}
      >
        <span>高级参数 (Advanced)</span>
        <span class={`transform transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''} opacity-50`}
          >▼</span
        >
      </button>

      {#if showAdvanced}
        <div class="grid grid-cols-2 gap-3 pb-1 animate-in slide-in-from-top-2 fade-in duration-300">
          <div class="space-y-1">
            <label class="text-[9px] text-gray-500 uppercase tracking-wider font-bold">Duration</label>
            <div class="relative">
              <select
                bind:value={duration}
                class="w-full appearance-none rounded-lg border border-white/5 bg-gray-800/50 px-3 py-2 text-xs text-gray-300 outline-none focus:border-primary-500/50"
              >
                {#each [5, 6, 7, 8, 9, 10] as d}<option value={d}>{d}s</option>{/each}
              </select>
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-[9px] text-gray-500 uppercase tracking-wider font-bold">Steps</label>
            <input
              type="number"
              bind:value={num_inference_steps}
              class="w-full rounded-lg border border-white/5 bg-gray-800/50 px-3 py-2 text-xs text-gray-300 outline-none focus:border-primary-500/50"
            />
          </div>

          <div class="space-y-1">
            <label class="text-[9px] text-gray-500 uppercase tracking-wider font-bold">CFG Scale</label>
            <input
              type="number"
              step="0.5"
              bind:value={guidance_scale}
              class="w-full rounded-lg border border-white/5 bg-gray-800/50 px-3 py-2 text-xs text-gray-300 outline-none focus:border-primary-500/50"
            />
          </div>

          <div class="space-y-1">
            <label class="text-[9px] text-gray-500 uppercase tracking-wider font-bold">Flow Shift</label>
            <input
              type="number"
              step="0.5"
              bind:value={flow_shift}
              class="w-full rounded-lg border border-white/5 bg-gray-800/50 px-3 py-2 text-xs text-gray-300 outline-none focus:border-primary-500/50"
            />
          </div>
        </div>
      {/if}
    </div>

    <button
      type="submit"
      disabled={isLoading}
      class="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-primary-600 to-violet-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary-900/30 transition-all hover:scale-[1.02] hover:shadow-primary-900/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span class="relative z-10 flex items-center justify-center gap-2">
        {#if isLoading}
          <svg
            class="animate-spin h-4 w-4 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            ><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            /></svg
          >
          生成中...
        {:else}
          ✨ 生成视频 (Generate)
        {/if}
      </span>
      <div
        class="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-0"
      />
    </button>
  </form>
</section>
