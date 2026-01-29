<script lang="ts">
  import { createEventDispatcher, getContext } from 'svelte';
  // 引入统一的 Button 组件 (假设路径一致)
  import MyButton from '$lib/components/common/MyButton.svelte';

  export let globalPrompt = '';
  export let applyMask = true; // 这个对应 "AI导演" 的位置，改为 Mask 开关
  export let taskStatus = 'idle';
  export let errors: any = {};
  export let costUsd: number | null = null;

  const i18n: any = getContext('i18n');
  const dispatch = createEventDispatcher<{ generate: void }>();
  $: isLoading = taskStatus === 'submitting' || taskStatus === 'processing';
</script>

<section
  class="flex flex-col h-full gap-3 rounded-2xl border border-border-light bg-bg-light p-3 shadow-sm dark:border-border-dark dark:bg-bg-dark"
>
  <form class="flex flex-col h-full" on:submit|preventDefault={() => !isLoading && dispatch('generate')}>
    <div class="flex flex-col gap-1.5 h-full">
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
          placeholder={$i18n.t('Enter English words, e.g., person, car, dog...')}
          class="w-full resize-none bg-transparent px-4 py-3 text-sm text-text-light dark:text-text-dark outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
        />

        <div class="flex items-center justify-end px-2 gap-3 pb-1.5 mt-[-4px]">
          <div class="flex items-center gap-2">
            <MyButton
              circle
              size="small"
              type={applyMask ? 'primary' : 'default'}
              htmlType="button"
              tooltip={$i18n.t('Apply Mask')}
              on:click={() => {
                applyMask = !applyMask;
              }}
              class={!applyMask ? 'bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-gray-800' : ''}
            >
              <iconify-icon class="text-lg" icon={applyMask ? 'mdi:selection-drag' : 'mdi:selection-off'} />
            </MyButton>
          </div>

          <div class="flex items-center">
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
