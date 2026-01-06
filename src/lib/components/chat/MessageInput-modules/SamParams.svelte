<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let globalPrompt = '';
  export let applyMask = true;
  export let taskStatus = 'idle';
  export let errors: any = {};

  const dispatch = createEventDispatcher<{ generate: void }>();
  $: isLoading = taskStatus === 'submitting' || taskStatus === 'processing';
</script>

<section class="flex flex-col gap-3 rounded-2xl border border-gray-800 bg-transparent p-4 h-full">
  <form class="flex flex-col gap-3" on:submit|preventDefault={() => !isLoading && dispatch('generate')}>
    <div class="space-y-1.5">
      <label class="text-xs font-medium text-gray-400 ml-1">目标物体 (Object)</label>
      <div class="relative group">
        <input
          type="text"
          bind:value={globalPrompt}
          placeholder="输入英文单词，如: person, car, dog..."
          class={`w-full rounded-xl border bg-[#1a1a1a] px-4 py-3 text-sm text-gray-100 placeholder:text-gray-500 outline-none transition-all
          ${
            errors.globalPrompt
              ? 'border-red-500/50 focus:border-red-500'
              : 'border-gray-800 hover:border-gray-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20'
          }`}
        />
      </div>
    </div>

    <div class="flex items-center justify-between rounded-xl border border-gray-800 bg-[#1a1a1a] px-4 py-3">
      <div class="flex flex-col gap-0.5">
        <span class="text-sm font-medium text-gray-200">应用蒙版 (Transparent)</span>
        <span class="text-[10px] text-gray-500">开启后输出透明通道视频</span>
      </div>

      <label class="relative inline-flex cursor-pointer items-center">
        <input type="checkbox" bind:checked={applyMask} class="peer sr-only" />
        <div
          class="peer h-6 w-11 rounded-full bg-gray-800 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-gray-400 after:transition-all after:content-[''] peer-checked:bg-primary-600 peer-checked:after:translate-x-full peer-checked:after:bg-white peer-focus:outline-none border border-gray-700 peer-checked:border-primary-500"
        />
      </label>
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
