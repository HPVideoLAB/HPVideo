<script lang="ts">
  import { getContext } from 'svelte';
  import { dialogStore, closeDialog } from '$lib/stores/dialog';
  import MyButton from '$lib/components/common/MyButton.svelte';

  import { clickOutsideAction } from 'svelte-legos';

  const i18n: any = getContext('i18n');

  // ✅ Esc 关闭
  function onKeydown(e: KeyboardEvent) {
    if (!$dialogStore?.open) return;
    if (e.key === 'Escape') closeDialog();
  }

  // ✅ 自定义 actions 点击
  async function handleAction(action: any) {
    try {
      await action?.onClick?.();
    } finally {
      if (action?.closeOnClick !== false) closeDialog();
    }
  }

  // ✅ Confirm / Cancel
  async function handleConfirm() {
    const confirm = $dialogStore?.confirm;
    try {
      await confirm?.onConfirm?.();
      confirm?._resolve?.(true);
    } finally {
      closeDialog();
    }
  }

  async function handleCancel() {
    const confirm = $dialogStore?.confirm;
    try {
      await confirm?.onCancel?.();
      confirm?._resolve?.(false);
    } finally {
      closeDialog();
    }
  }

  // ✅ clickOutside action 回调
  function onOutside() {
    if ($dialogStore?.closeOnBackdrop === false) return;
    closeDialog();
  }
</script>

<svelte:window on:keydown={onKeydown} />

{#if $dialogStore?.open}
  <!-- Dialog -->
  <div class="fixed inset-0 z-[99999999] flex items-center justify-center px-4 py-8">
    <!-- ✅ clickOutside：点外面触发关闭（不依赖 backdrop） -->

    <div
      use:clickOutsideAction={onOutside}
      class="w-full {$dialogStore.widthClass || 'max-w-[760px]'}
             rounded-2xl
             border border-border-light dark:border-border-dark
             bg-bg-light/85 dark:bg-bg-dark/75
             backdrop-blur-xl
             shadow-[0_30px_80px_rgba(0,0,0,0.45)]
             overflow-hidden
             relative"
      on:click|stopPropagation
    >
      <!-- Header -->
      <div
        class="px-5 md:px-6 py-4 border-b border-border-light dark:border-border-dark flex items-start justify-between gap-4"
      >
        <div class="min-w-0">
          <h3
            class="
            text-lg md:text-xl font-bold
            bg-gradient-to-r
            from-text-light to-primary-500
            dark:from-text-dark dark:to-primary-400
            bg-clip-text text-transparent
          "
          >
            {$dialogStore.titleKey ? $i18n.t($dialogStore.titleKey) : ''}
          </h3>
        </div>

        {#if $dialogStore.showClose !== false}
          <MyButton aria-label={$i18n.t('Close')} on:click={closeDialog} round>
            <iconify-icon icon="ph:x-bold" class="text-lg" />
          </MyButton>
        {/if}
      </div>

      <!-- Body -->
      <div class="px-5 md:px-6 py-5 max-h-[70vh] overflow-auto">
        {#if $dialogStore.bodyComponent}
          <!-- ✅ 自定义 Svelte 组件内容 -->
          <svelte:component this={$dialogStore.bodyComponent} {...$dialogStore.bodyProps || {}} />
        {:else if $dialogStore.bodyHtml}
          <!-- ✅ HTML 内容（确保来源可信） -->
          <div class="prose dark:prose-invert max-w-none">
            {@html $dialogStore.bodyHtml}
          </div>
        {:else if $dialogStore.bodyTextKey}
          <!-- ✅ 纯文本内容 -->
          <p class="text-sm md:text-base text-gray-600 dark:text-gray-300 whitespace-pre-line">
            {$i18n.t($dialogStore.bodyTextKey)}
          </p>
        {/if}
      </div>

      <!-- Footer -->
      {#if $dialogStore.confirm?.enabled}
        <!-- ✅ Confirm/Cancel：默认按钮 -->
        <div
          class="px-5 md:px-6 py-4 border-t border-border-light dark:border-border-dark flex items-center justify-end gap-2"
        >
          <MyButton class="rounded-full" on:click={handleCancel}>
            {$i18n.t($dialogStore.confirm.cancelLabelKey || 'Cancel')}
          </MyButton>

          <MyButton type={$dialogStore.confirm.confirmType || 'primary'} class="rounded-full" on:click={handleConfirm}>
            {$i18n.t($dialogStore.confirm.confirmLabelKey || 'Confirm')}
          </MyButton>
        </div>
      {:else if $dialogStore.actions?.length}
        <!-- ✅ 兼容旧 actions -->
        <div
          class="px-5 md:px-6 py-4 border-t border-border-light dark:border-border-dark flex items-center justify-end gap-2"
        >
          {#each $dialogStore.actions as action (action.labelKey)}
            <MyButton type={action.type || 'default'} class="rounded-full" on:click={() => handleAction(action)}>
              {$i18n.t(action.labelKey)}
            </MyButton>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}
