<!-- SamParams.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let globalPrompt = '';
  export let applyMask = true;
  export let taskStatus = 'idle';
  export let errors: any = {};
  export let costUsd: number | null = null; // 例如 0.12；null 表示不显示

  const dispatch = createEventDispatcher<{ generate: void }>();
  $: isLoading = taskStatus === 'submitting' || taskStatus === 'processing';
</script>

<section class="flex flex-col gap-3 rounded-2xl border border-gray-800 bg-transparent p-4 h-full">
  <form class="flex flex-col gap-3" on:submit|preventDefault={() => !isLoading && dispatch('generate')}>
    <div class="flex flex-col gap-3 md:flex-row">
      <!-- 提示词 -->
      <div class="space-y-1.5 flex-1">
        <div class="relative group">
          <input
            type="text"
            bind:value={globalPrompt}
            placeholder="输入英文单词，如: person, car, dog..."
            class={`w-full rounded-xl border bg-bg-light dark:bg-bg-dark px-4 py-3 text-sm text-gray-100 placeholder:text-gray-500 outline-none transition-all
          ${
            errors.globalPrompt
              ? 'border-red-500/50 focus:border-red-500'
              : 'border-gray-800 hover:border-gray-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20'
          }`}
          />
          {#if errors.globalPrompt}
            <div class="mt-1 text-[11px] text-red-600 dark:text-red-300">{errors.globalPrompt}</div>
          {/if}
        </div>
      </div>
      <!-- 开关 -->
      <div class="flex items-center justify-between rounded-xl gap-2">
        <label class="relative inline-flex cursor-pointer items-center">
          <input type="checkbox" bind:checked={applyMask} class="peer sr-only" />
          <div
            class="peer h-6 w-11 rounded-full bg-gray-800 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-gray-400 after:transition-all after:content-[''] peer-checked:bg-primary-600 peer-checked:after:translate-x-full peer-checked:after:bg-white peer-focus:outline-none border border-gray-700 peer-checked:border-primary-500"
          />
        </label>
        <div class="text-xs">应用蒙版</div>
      </div>
    </div>

    <button
      type="submit"
      disabled={isLoading}
      class="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-primary-600 to-violet-600 px-4 py-3
             text-sm font-bold text-white shadow-lg shadow-primary-900/30 transition-all
             hover:scale-[1.02] hover:shadow-primary-900/50 active:scale-[0.98]
             disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span class="relative z-10 flex w-full items-center justify-center">
        <!-- 主文案（居中） -->
        <span class="flex items-center gap-2">
          {#if isLoading}
            <iconify-icon icon="eos-icons:loading" class="text-lg" />
            生成中...
          {:else}
            <iconify-icon icon="mdi:sparkles" class="text-xl text-warning-400" />
            生成视频 <!-- 费用（右侧 pill，不挤主文案） -->
            {#if !isLoading && costUsd !== null}
              <span class="">
                (${costUsd.toFixed(5)}/次)
              </span>
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
