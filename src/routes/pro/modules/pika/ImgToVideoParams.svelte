<!-- ImgToVideoParams.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  type Resolution = '720p' | '1080p';
  type Transition = { duration: number; prompt?: string };
  type TaskStatus = 'idle' | 'submitting' | 'processing' | 'completed' | 'failed';

  type FormErrors = {
    globalPrompt?: string;
    seed?: string;
    resolution?: string;
    transitions?: Array<{ duration?: string; prompt?: string }>;
    __form?: string;
  };

  export let globalPrompt = '';
  export let resolution: Resolution = '720p';
  export let seed = -1;
  export let transitions: Transition[] = [];
  export let costUsd: number | null = null; // 例如 0.12；null 表示不显示

  export let taskStatus: TaskStatus = 'idle';

  // 由父组件校验后传进来，用于逐字段显示
  export let errors: FormErrors = {};

  const dispatch = createEventDispatcher<{ generate: void }>();

  const MAX_TOTAL_DURATION = 25;
  const MAX_SEED = 2147483647;

  // 是否处于 loading：提交/生成中
  $: isLoading = taskStatus === 'submitting' || taskStatus === 'processing';

  // 表单提交：交给父组件去做校验 + 提交 + 轮询
  function onSubmit() {
    if (isLoading) return;
    dispatch('generate');
  }
  $: console.log(resolution);
</script>

<section class="rounded-2xl border border-gray-200 bg-transparent p-3 dark:border-gray-850">
  <!-- 表单容器：字段下方可放校验信息；支持回车提交 -->
  <form class="space-y-3" on:submit|preventDefault={onSubmit}>
    <textarea
      bind:value={globalPrompt}
      rows={1}
      placeholder="请输入提示词..."
      class={`w-full resize-none rounded-2xl border px-4 py-3 text-sm
            bg-bg-light dark:bg-bg-dark
            text-gray-900 dark:text-gray-100
            placeholder:text-gray-500 dark:placeholder:text-gray-600
            outline-none transition-all
            ${
              errors.globalPrompt
                ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/20'
                : 'border-white/10 hover:border-white/20 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30'
            }`}
    />

    {#if errors.globalPrompt}
      <div class="mt-1 text-[11px] text-red-600 dark:text-red-300">{errors.globalPrompt}</div>
    {/if}

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">分辨率（resolution）</label>
        <select
          bind:value={resolution}
          class={`w-full rounded-xl border bg-transparent px-3 py-2 text-sm bg-bg-light dark:bg-bg-dark
                 text-gray-900 focus:outline-none dark:text-gray-100
                 ${
                   errors.resolution
                     ? 'border-red-400 focus:border-red-500 dark:border-red-600'
                     : 'border-gray-300 focus:border-primary-500 dark:border-gray-700'
                 }`}
        >
          <option value="720p">720p</option>
          <option value="1080p">1080p</option>
        </select>
        {#if errors.resolution}
          <div class="mt-1 text-[11px] text-red-600 dark:text-red-300">{errors.resolution}</div>
        {/if}
      </div>

      <div>
        <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
          Seed（-1 随机；0~{MAX_SEED}）
        </label>
        <input
          type="number"
          min="-1"
          max={MAX_SEED}
          step="1"
          bind:value={seed}
          class={`w-full rounded-xl border bg-transparent px-3 py-2 text-sm bg-bg-light dark:bg-bg-dark
                 text-gray-900 placeholder:text-gray-500 focus:outline-none
                 dark:text-gray-100
                 ${
                   errors.seed
                     ? 'border-red-400 focus:border-red-500 dark:border-red-600'
                     : 'border-gray-300 focus:border-primary-500 dark:border-gray-700'
                 }`}
        />
        {#if errors.seed}
          <div class="mt-1 text-[11px] text-red-600 dark:text-red-300">{errors.seed}</div>
        {/if}
      </div>
    </div>

    {#if transitions.length > 0}
      <div class="pt-1">
        <div class="mb-2 flex items-center justify-between">
          <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">转场（transitions，可选）</div>
          <div class="text-xs text-gray-600 dark:text-gray-400">数量：{transitions.length}（必须 = 图片数 - 1）</div>
        </div>

        <div class="space-y-2">
          {#each transitions as t, i}
            <div class="rounded-2xl border border-gray-200 p-3 dark:border-gray-850">
              <div class="mb-2 flex items-center justify-between">
                <div class="text-xs font-medium text-gray-700 dark:text-gray-300">段 {i + 1}</div>
              </div>

              <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <label class="mb-1 block text-[11px] text-gray-600 dark:text-gray-400">duration（秒，正整数）</label>
                  <input
                    type="number"
                    min="1"
                    max={MAX_TOTAL_DURATION}
                    step="1"
                    bind:value={t.duration}
                    class={`w-full rounded-xl border bg-transparent px-3 py-2 text-sm
                           text-gray-900 focus:outline-none dark:text-gray-100
                           ${
                             errors.transitions?.[i]?.duration
                               ? 'border-red-400 focus:border-red-500 dark:border-red-600'
                               : 'border-gray-300 focus:border-primary-500 dark:border-gray-700'
                           }`}
                  />
                  {#if errors.transitions?.[i]?.duration}
                    <div class="mt-1 text-[11px] text-red-600 dark:text-red-300">{errors.transitions[i].duration}</div>
                  {/if}
                </div>

                <div>
                  <label class="mb-1 block text-[11px] text-gray-600 dark:text-gray-400">prompt（可选，仅该段）</label>
                  <input
                    type="text"
                    bind:value={t.prompt}
                    placeholder="该段局部提示（可选）"
                    class={`w-full rounded-xl border bg-transparent px-3 py-2 text-sm
                           text-gray-900 placeholder:text-gray-500 focus:outline-none
                           dark:text-gray-100 dark:placeholder:text-gray-500
                           ${
                             errors.transitions?.[i]?.prompt
                               ? 'border-red-400 focus:border-red-500 dark:border-red-600'
                               : 'border-gray-300 focus:border-primary-500 dark:border-gray-700'
                           }`}
                  />
                  {#if errors.transitions?.[i]?.prompt}
                    <div class="mt-1 text-[11px] text-red-600 dark:text-red-300">{errors.transitions[i].prompt}</div>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <div class="pt-1">
      <!-- submit 按钮：loading 时禁用，并显示不同文案 -->

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
    </div>
  </form>
</section>
