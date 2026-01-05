<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Spinner from './Sn.svelte';
  import { twMerge } from 'tailwind-merge';
  import { clsx } from 'clsx';

  // --- Props Definition ---
  export let type: 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error' = 'default';
  export let size: 'tiny' | 'small' | 'medium' | 'large' = 'medium';
  export let dashed: boolean = false;
  export let text: boolean = false;
  export let ghost: boolean = false;
  export let block: boolean = false;
  export let round: boolean = false;
  export let circle: boolean = false;
  export let disabled: boolean = false;
  export let loading: boolean = false;
  export let href: string | undefined = undefined;
  export let htmlType: 'button' | 'submit' | 'reset' = 'button';

  // ✨✨✨ 关键修改 1：正确接收外部 class ✨✨✨
  // Svelte 允许导出别名。外部写 <Button class="ml-2">，内部用 className 接收
  let className: string | undefined = undefined;
  export { className as class };

  const dispatch = createEventDispatcher();

  // --- Style Logic ---

  const baseClasses = `
    inline-flex items-center justify-center whitespace-nowrap
    font-medium transition-all duration-200 select-none
    outline-none 
    [-webkit-tap-highlight-color:transparent]
    focus-visible:ring-2 focus-visible:ring-offset-2
    focus-visible:ring-offset-bg-light dark:focus-visible:ring-offset-bg-dark
    disabled:opacity-50 disabled:cursor-not-allowed
    active:scale-[0.98] disabled:active:scale-100
  `;

  const sizeMap = {
    tiny: 'h-6  px-2    text-xs',
    small: 'h-8  px-3    text-sm',
    medium: 'h-9  px-4    text-sm',
    large: 'h-11 px-6    text-base',
  };

  $: shapeClass = circle ? 'rounded-full px-0 aspect-square' : round ? 'rounded-full' : 'rounded-lg';

  const getThemeClasses = () => {
    if (disabled)
      return 'bg-gray-100 text-gray-400 border border-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500';

    if (text) {
      const textColors = {
        default: 'text-text-light dark:text-text-dark hover:bg-gray-100 dark:hover:bg-gray-800',
        primary: 'text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20',
        info: 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20',
        success: 'text-success-500 hover:bg-success-50 dark:hover:bg-success-900/20',
        warning: 'text-warning-500 hover:bg-warning-50 dark:hover:bg-warning-900/20',
        error: 'text-error-500 hover:bg-error-50 dark:hover:bg-error-900/20',
      };
      return `bg-transparent border-none px-1 ${textColors[type]}`;
    }

    const isOutline = ghost || dashed || type === 'default';
    if (isOutline) {
      const borderStyle = dashed ? 'border-dashed' : 'border-solid';
      if (type === 'default') {
        return `
          bg-bg-light dark:bg-bg-dark 
          border ${borderStyle} border-border-light dark:border-border-dark
          text-text-light dark:text-text-dark
          hover:text-primary-500 hover:border-primary-500 dark:hover:text-primary-400 dark:hover:border-primary-400
          focus-visible:ring-primary-500
        `;
      }
      const colorMap = {
        primary: 'text-primary-500 border-primary-500 focus-visible:ring-primary-500',
        info: 'text-blue-500 border-blue-500 focus-visible:ring-blue-500',
        success: 'text-success-500 border-success-500 focus-visible:ring-success-500',
        warning: 'text-warning-500 border-warning-500 focus-visible:ring-warning-500',
        error: 'text-error-500 border-error-500 focus-visible:ring-error-500',
      };
      return `bg-transparent border ${borderStyle} ${colorMap[type]} hover:opacity-80`;
    }

    const solidColors = {
      primary:
        'bg-primary-500 text-white hover:bg-primary-600 focus-visible:ring-primary-500 shadow-md shadow-primary-500/20 border-transparent',
      info: 'bg-blue-500 text-white hover:bg-blue-600 focus-visible:ring-blue-500 shadow-md shadow-blue-500/20 border-transparent',
      success:
        'bg-success-500 text-white hover:bg-success-600 focus-visible:ring-success-500 shadow-md shadow-success-500/20 border-transparent',
      warning:
        'bg-warning-500 text-white hover:bg-warning-600 focus-visible:ring-warning-500 shadow-md shadow-warning-500/20 border-transparent',
      error:
        'bg-error-500 text-white hover:bg-error-600 focus-visible:ring-error-500 shadow-md shadow-error-500/20 border-transparent',
    };
    return `${solidColors[type]} border`;
  };

  // ✨✨✨ 关键修改 2：使用 twMerge 智能合并 ✨✨✨
  // 这会确保你传入的 ml-2 生效，甚至如果你传入 bg-red-500，它也会强制覆盖掉默认的 bg
  $: classes = twMerge(
    clsx(
      baseClasses,
      sizeMap[size],
      shapeClass,
      getThemeClasses(),
      block && 'w-full flex',
      className // 外部传入的 class 放在最后
    )
  );

  function handleClick(event: MouseEvent) {
    if (!disabled && !loading) {
      dispatch('click', event);
    }
  }
</script>

{#if href}
  <a {href} class={classes} role="button" aria-disabled={disabled} on:click={handleClick} {...$$restProps}>
    {#if loading} <Spinner {size} /> {/if}
    {#if $$slots.icon && !loading} <span class="mr-1.5 flex items-center"><slot name="icon" /></span> {/if}
    <slot />
  </a>
{:else}
  <button type={htmlType} class={classes} {disabled} on:click={handleClick} {...$$restProps}>
    {#if loading} <div class="mr-2"><Spinner {size} /></div> {/if}
    {#if $$slots.icon && !loading} <span class="mr-1.5 flex items-center"><slot name="icon" /></span> {/if}
    <slot />
  </button>
{/if}
