<script lang="ts">
  import { Popover } from 'bits-ui';

  export let side: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
  export let align: 'start' | 'center' | 'end' = 'end';
  export let sideOffset = 8;

  export let contentClass =
    'z-[9999] w-[360px] max-w-[calc(100vw-24px)] rounded-2xl border border-border-light bg-bg-light p-3 shadow-lg dark:border-border-dark dark:bg-bg-dark';
</script>

<Popover.Root>
  <!-- ✅ Trigger 不用 asChild，避免事件丢失 -->
  <Popover.Trigger>
    <slot name="trigger" />
  </Popover.Trigger>

  <!-- ✅ 关键：Portal 到 body，避免被 textarea 父级 overflow 裁掉 -->
  {#if Popover.Portal}
    <Popover.Portal>
      <Popover.Content class={contentClass} {side} {align} {sideOffset}>
        <slot />
      </Popover.Content>
    </Popover.Portal>
  {:else}
    <!-- fallback：没有 Portal 也能跑，但可能会被裁剪 -->
    <Popover.Content class={contentClass} {side} {align} {sideOffset}>
      <slot />
    </Popover.Content>
  {/if}
</Popover.Root>
