<script lang="ts">
  import { createEventDispatcher, getContext } from 'svelte';
  import MySelect from '$lib/components/common/MySelect.svelte';
  import MyButton from '$lib/components/common/MyButton.svelte';

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
  export let costUsd: number | null = null;

  export let taskStatus: TaskStatus = 'idle';
  export let errors: FormErrors = {};

  const dispatch = createEventDispatcher<{ generate: void }>();
  const i18n: any = getContext('i18n');
  const MAX_TOTAL_DURATION = 25;
  const MAX_SEED = 2147483647;

  $: isLoading = taskStatus === 'submitting' || taskStatus === 'processing';

  function onSubmit() {
    if (isLoading) return;
    dispatch('generate');
  }

  // MySelect 选项
  const resolutionOptions = [
    { value: '720p', label: '720p' },
    { value: '1080p', label: '1080p' },
  ];
</script>

<section
  class="flex flex-col h-full gap-3 rounded-2xl border border-border-light bg-bg-light p-3 shadow-sm dark:border-border-dark dark:bg-bg-dark"
>
  <form class="flex flex-col gap-3 h-full" on:submit|preventDefault={onSubmit}>
    <div class="flex flex-col gap-3">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between px-1">
            <span class="text-[10px] font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400">
              {$i18n.t('Resolution')}
            </span>
          </div>
          <MySelect
            bind:value={resolution}
            options={resolutionOptions}
            showTriggerDesc={false}
            showTriggerMedia={false}
            placeholder={$i18n.t('Select resolution')}
            on:change={(e) => (resolution = e.detail.value)}
          />
          {#if errors.resolution}
            <div class="px-1 text-[11px] text-red-600 dark:text-red-300">{errors.resolution}</div>
          {/if}
        </div>

        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between px-1">
            <span class="text-[10px] font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400 text-nowrap">
              {$i18n.t('Seed (-1 random; 0~')}{MAX_SEED})
            </span>
          </div>
          <input
            type="number"
            min="-1"
            max={MAX_SEED}
            step="1"
            bind:value={seed}
            class={`w-full rounded-2xl border px-3 py-2.5 text-sm font-medium
              bg-bg-light dark:bg-bg-dark
              text-text-light dark:text-text-dark
              placeholder:text-text-lightSecondary dark:placeholder:text-text-darkSecondary
              focus:outline-none transition-all shadow-sm
              hover:border-primary-400 dark:hover:border-primary-600 hover:shadow-md
              ${
                errors.seed
                  ? 'border-error-500/60 focus:border-error-500 dark:border-error-700'
                  : 'border-border-light dark:border-border-dark focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
              }`}
          />
          {#if errors.seed}
            <div class="px-1 text-[11px] text-red-600 dark:text-red-300">{errors.seed}</div>
          {/if}
        </div>
      </div>

      {#if transitions.length > 0}
        <div class="pt-1">
          <div class="mb-2 flex items-center justify-between px-1">
            <div class="text-xs font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400">
              {$i18n.t('Transitions')}
            </div>
            <div class="text-[10px] text-gray-400 dark:text-gray-500">
              {transitions.length} / {$i18n.t('Max')}
            </div>
          </div>

          <div class="space-y-2">
            {#each transitions as t, i}
              <div
                class="rounded-2xl border border-border-light bg-gray-50 p-3 dark:border-border-dark dark:bg-gray-950/50"
              >
                <div class="mb-2 flex items-center justify-between">
                  <div class="text-xs font-medium text-gray-700 dark:text-gray-300">{$i18n.t('Segment')} {i + 1}</div>
                </div>

                <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <label class="mb-1 block text-[10px] text-gray-500 dark:text-gray-400">
                      {$i18n.t('Duration (s)')}
                    </label>
                    <input
                      type="number"
                      bind:value={t.duration}
                      class="w-full rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-black/20 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-[10px] text-gray-500 dark:text-gray-400">
                      {$i18n.t('Prompt')}
                    </label>
                    <input
                      type="text"
                      bind:value={t.prompt}
                      class="w-full rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-black/20 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
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
          placeholder={$i18n.t('Enter prompts...')}
          class="w-full resize-none bg-transparent px-4 py-3 text-sm text-text-light dark:text-text-dark outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
        />

        <div class="flex items-center justify-end px-2 pb-1.5 mt-[-4px]">
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
