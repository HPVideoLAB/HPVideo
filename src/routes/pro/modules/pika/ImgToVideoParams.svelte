<!-- src\routes\pro\modules\pika\ImgToVideoParams.svelte-->
<script lang="ts">
  import { createEventDispatcher, getContext } from 'svelte';

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
  const i18n: any = getContext('i18n');
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

<section
  class="rounded-2xl border border-border-light bg-bg-light p-3 shadow-sm dark:border-border-dark dark:bg-bg-dark"
>
  <form class="space-y-3" on:submit|preventDefault={onSubmit}>
    <textarea
      bind:value={globalPrompt}
      rows={1}
      placeholder={$i18n.t('Enter prompts...')}
      class={`w-full resize-none rounded-2xl border px-4 py-3 text-sm
        bg-bg-light dark:bg-bg-dark
        text-text-light dark:text-text-dark
        placeholder:text-text-lightSecondary dark:placeholder:text-text-darkSecondary
        outline-none transition-all
        ${
          errors.globalPrompt
            ? 'border-error-500/60 focus:border-error-500 focus:ring-1 focus:ring-error-500/20'
            : 'border-border-light dark:border-border-dark focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30'
        }`}
    />

    {#if errors.globalPrompt}
      <div class="mt-1 text-[11px] text-red-600 dark:text-red-300">{errors.globalPrompt}</div>
    {/if}

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label class="mb-1 block text-[10px] xl:text-xs font-medium text-gray-700 dark:text-gray-300"
          >{$i18n.t('Resolution')}</label
        >
        <select
          bind:value={resolution}
          class={`w-full rounded-xl border px-3 py-2 text-sm
            bg-bg-light dark:bg-bg-dark
            text-text-light dark:text-text-dark
            focus:outline-none
            ${
              errors.resolution
                ? 'border-error-500/60 focus:border-error-500 dark:border-error-700'
                : 'border-border-light dark:border-border-dark focus:border-primary-500'
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
        <label class="mb-1 block text-nowrap text-[10px] xl:text-xs font-medium text-gray-700 dark:text-gray-300">
          {$i18n.t('Seed (-1 random; 0~')}{MAX_SEED})
        </label>
        <input
          type="number"
          min="-1"
          max={MAX_SEED}
          step="1"
          bind:value={seed}
          class={`w-full rounded-xl border px-3 py-2 text-sm
            bg-bg-light dark:bg-bg-dark
            text-text-light dark:text-text-dark
            placeholder:text-text-lightSecondary dark:placeholder:text-text-darkSecondary
            focus:outline-none
            ${
              errors.seed
                ? 'border-error-500/60 focus:border-error-500 dark:border-error-700'
                : 'border-border-light dark:border-border-dark focus:border-primary-500'
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
          <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">{$i18n.t('Transitions (optional)')}</div>
          <div class="text-xs text-gray-600 dark:text-gray-400">
            {$i18n.t('Count:')}
            {transitions.length}（{$i18n.t('Must equal image count - 1')}）
          </div>
        </div>

        <div class="space-y-2">
          {#each transitions as t, i}
            <div class="rounded-2xl border border-border-light bg-gray-50 p-3 dark:border-border-dark dark:bg-gray-950">
              <div class="mb-2 flex items-center justify-between">
                <div class="text-xs font-medium text-gray-700 dark:text-gray-300">{$i18n.t('Segment')} {i + 1}</div>
              </div>

              <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <label class="mb-1 block text-[11px] text-gray-600 dark:text-gray-400"
                    >{$i18n.t('Duration (seconds, integer)')}</label
                  >
                  <input
                    type="number"
                    min="1"
                    max={MAX_TOTAL_DURATION}
                    step="1"
                    bind:value={t.duration}
                    class={`w-full rounded-xl border px-3 py-2 text-sm
                      bg-bg-light dark:bg-bg-dark
                      text-text-light dark:text-text-dark
                      focus:outline-none
                      ${
                        errors.transitions?.[i]?.duration
                          ? 'border-error-500/60 focus:border-error-500 dark:border-error-700'
                          : 'border-border-light dark:border-border-dark focus:border-primary-500'
                      }`}
                  />
                  {#if errors.transitions?.[i]?.duration}
                    <div class="mt-1 text-[11px] text-red-600 dark:text-red-300">{errors.transitions[i].duration}</div>
                  {/if}
                </div>

                <div>
                  <label class="mb-1 block text-[11px] text-gray-600 dark:text-gray-400"
                    >{$i18n.t('Prompt (optional, specific segment)')}</label
                  >
                  <input
                    type="text"
                    bind:value={t.prompt}
                    placeholder={$i18n.t('Local prompt for this segment (optional)')}
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
      <button
        type="submit"
        disabled={isLoading}
        class="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-primary-600 to-violet-600 px-4 py-3
        text-sm font-bold text-white shadow-lg shadow-primary-900/30 dark:shadow-black/30 transition-all
        hover:scale-[1.02] hover:shadow-primary-900/50 dark:hover:shadow-black/40 active:scale-[0.98]
        disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span class="relative z-10 flex w-full items-center justify-center">
          <span class="flex items-center gap-2">
            {#if isLoading}
              <iconify-icon icon="eos-icons:loading" class="text-lg" />
              {$i18n.t('Generating...')}
            {:else}
              <iconify-icon icon="mdi:sparkles" class="text-xl text-warning-400" />
              {$i18n.t('Generate Video')}
              {#if !isLoading && costUsd !== null}
                <span class="">
                  (${costUsd.toFixed(3)}{$i18n.t('/time')})
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
