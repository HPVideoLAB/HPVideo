<script lang="ts">
  import { createEventDispatcher, getContext } from 'svelte';

  export let globalPrompt = '';
  export let applyMask = true;
  export let taskStatus = 'idle';
  export let errors: any = {};
  export let costUsd: number | null = null; // 例如 0.12；null 表示不显示

  const i18n: any = getContext('i18n');
  const dispatch = createEventDispatcher<{ generate: void }>();
  $: isLoading = taskStatus === 'submitting' || taskStatus === 'processing';
</script>

<section
  class="flex flex-col gap-3 rounded-2xl
         border border-border-light dark:border-border-dark
         bg-bg-light/60 dark:bg-bg-dark/40
         p-4 h-full shadow-sm"
>
  <form class="flex flex-col gap-3" on:submit|preventDefault={() => !isLoading && dispatch('generate')}>
    <div class="flex flex-col gap-3 md:flex-row md:items-center">
      <div class="space-y-1.5 flex-1">
        <div class="relative">
          <input
            type="text"
            bind:value={globalPrompt}
            placeholder={$i18n.t('Enter English words, e.g., person, car, dog...')}
            class={`w-full rounded-xl border px-4 py-3 text-sm
                    bg-bg-light dark:bg-bg-dark
                    text-text-light dark:text-text-dark
                    placeholder:text-text-lightSecondary dark:placeholder:text-text-darkSecondary
                    outline-none transition-all
                    focus-visible:ring-2 focus-visible:ring-primary-500/25
                    focus-visible:ring-offset-2 focus-visible:ring-offset-bg-light dark:focus-visible:ring-offset-bg-dark
                    ${
                      errors.globalPrompt
                        ? 'border-error-500/60 focus-visible:ring-error-500/25 focus:border-error-500'
                        : 'border-border-light dark:border-border-dark focus:border-primary-500'
                    }`}
          />
          {#if errors.globalPrompt}
            <div class="mt-1 text-[11px] text-error-600 dark:text-error-300">{errors.globalPrompt}</div>
          {/if}
        </div>
      </div>

      <div class="flex items-center justify-between gap-3 rounded-xl md:mt-[2px]">
        <label class="relative inline-flex cursor-pointer items-center">
          <input type="checkbox" bind:checked={applyMask} class="peer sr-only" />

          <div
            class="relative h-6 w-11 rounded-full transition-colors
                   bg-gray-200 dark:bg-gray-800
                   border border-border-light dark:border-border-dark
                   peer-checked:bg-primary-600 peer-checked:border-primary-500
                   peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500/25
                   peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg-light dark:peer-focus-visible:ring-offset-bg-dark"
          >
            <div
              class="absolute left-[2px] top-[2px] h-5 w-5 rounded-full transition-transform
                     bg-white dark:bg-gray-200
                     shadow-sm
                     peer-checked:translate-x-5"
            />
          </div>
        </label>

        <div class="text-xs font-medium text-text-lightSecondary dark:text-text-darkSecondary select-none">
          {$i18n.t('Apply Mask')}
        </div>
      </div>
    </div>

    <button
      type="submit"
      disabled={isLoading}
      class="group relative w-full overflow-hidden rounded-xl
             bg-gradient-to-r from-primary-600 to-violet-600
             px-4 py-3 text-sm font-bold text-white
             shadow-lg shadow-primary-900/20 transition-all
             hover:scale-[1.02] hover:shadow-primary-900/35 active:scale-[0.98]
             disabled:cursor-not-allowed disabled:opacity-50
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40
             focus-visible:ring-offset-2 focus-visible:ring-offset-bg-light dark:focus-visible:ring-offset-bg-dark"
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
              <span class="font-semibold">(${costUsd.toFixed(3)}{$i18n.t('/time')})</span>
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
