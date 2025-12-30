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

  export let taskStatus: TaskStatus = 'idle';

  // 由父组件校验后传进来，用于逐字段显示
  export let errors: FormErrors = {};

  const dispatch = createEventDispatcher<{ generate: void }>();

  const MAX_TOTAL_DURATION = 25;
  const MAX_SEED = 2147483647;

  // 是否处于 loading：提交/生成中
  $: isLoading = taskStatus === 'submitting' || taskStatus === 'processing';

  function totalDuration() {
    return transitions.reduce((sum, t) => sum + (Number(t.duration) || 0), 0);
  }

  // 表单提交：交给父组件去做校验 + 提交 + 轮询
  function onSubmit() {
    if (isLoading) return;
    dispatch('generate');
  }
  $: console.log(resolution);
</script>

<section class="rounded-2xl border border-gray-200 bg-transparent p-3 dark:border-gray-850">
  <div class="mb-3 flex items-center justify-between">
    <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">生成参数</h2>
    <div class="text-xs text-gray-600 dark:text-gray-400">总时长：{totalDuration()}s / {MAX_TOTAL_DURATION}s</div>
  </div>

  <!-- 表单容器：字段下方可放校验信息；支持回车提交 -->
  <form class="space-y-3" on:submit|preventDefault={onSubmit}>
    <!-- 表单级错误（例如 transitions 数量不匹配、总时长超限等） -->
    {#if errors.__form}
      <div
        class="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700
               dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200"
      >
        {errors.__form}
      </div>
    {/if}

    <div>
      <textarea
        bind:value={globalPrompt}
        rows={2}
        placeholder="全局描述：内容、运动、风格（例如：TV screen flickering..., warm cinematic lighting）"
        class={`w-full resize-y rounded-xl border bg-transparent px-3 py-2 text-sm
               text-gray-900 placeholder:text-gray-500 focus:outline-none
               dark:text-gray-100 dark:placeholder:text-gray-500
               ${
                 errors.globalPrompt
                   ? 'border-red-400 focus:border-red-500 dark:border-red-600'
                   : 'border-gray-300 focus:border-primary-500 dark:border-gray-700'
               }`}
      />
      {#if errors.globalPrompt}
        <div class="mt-1 text-[11px] text-red-600 dark:text-red-300">{errors.globalPrompt}</div>
      {/if}
    </div>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">分辨率（resolution）</label>
        <select
          bind:value={resolution}
          class={`w-full rounded-xl border bg-transparent px-3 py-2 text-sm
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
          class={`w-full rounded-xl border bg-transparent px-3 py-2 text-sm
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
    </div>
  </form>
</section>
