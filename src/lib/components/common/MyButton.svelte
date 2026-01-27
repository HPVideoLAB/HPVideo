<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Spinner from './Sn.svelte'; // 确保路径正确
  import { twMerge } from 'tailwind-merge';
  import { clsx } from 'clsx';

  // 引入 Tippy
  import tippy, { type Props as TippyProps, type Instance as TippyInstance } from 'tippy.js';
  import 'tippy.js/dist/tippy.css';

  // --- Props ---
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

  // Tooltip
  export let tooltip: string | undefined = undefined;
  export let tooltipPlacement: TippyProps['placement'] = 'top';

  let className: string | undefined = undefined;
  export { className as class };

  const dispatch = createEventDispatcher();

  // --- 1. 基础样式 ---
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

  // --- 2. 响应式主题样式 (核心修复) ---
  // 使用 $: IIFE (立即执行函数)，确保每次 type 变化都会重新运行这段逻辑
  $: themeClasses = (() => {
    // A. 禁用态
    if (disabled) {
      return 'bg-gray-100 text-gray-400 border border-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500';
    }

    // B. 文本/描边/幽灵态
    if (text || ghost || dashed) {
      const borderStyle = dashed ? 'border-dashed' : 'border-solid';
      const borderClass = text ? 'border-none px-1' : `border ${borderStyle}`;

      const outlineColors = {
        default:
          'text-text-light dark:text-text-dark border-border-light dark:border-border-dark hover:text-primary-500 hover:border-primary-500',
        primary: 'text-primary-500 border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20',
        info: 'text-blue-500 border-blue-500 hover:bg-blue-50',
        success: 'text-success-500 border-success-500 hover:bg-success-50',
        warning: 'text-warning-500 border-warning-500 hover:bg-warning-50',
        error: 'text-error-500 border-error-500 hover:bg-error-50',
      };
      return `bg-transparent ${borderClass} ${outlineColors[type] || outlineColors.default}`;
    }

    // C. 实心填充态 (Switch Case 确保逻辑隔离)
    switch (type) {
      case 'primary':
        return 'bg-primary-500 text-white hover:bg-primary-600 focus-visible:ring-primary-500 shadow-md shadow-primary-500/20 border border-transparent';
      case 'info':
        return 'bg-blue-500 text-white hover:bg-blue-600 focus-visible:ring-blue-500 shadow-md shadow-blue-500/20 border border-transparent';
      case 'success':
        return 'bg-success-500 text-white hover:bg-success-600 focus-visible:ring-success-500 shadow-md shadow-success-500/20 border border-transparent';
      case 'warning':
        return 'bg-warning-500 text-white hover:bg-warning-600 focus-visible:ring-warning-500 shadow-md shadow-warning-500/20 border border-transparent';
      case 'error':
        return 'bg-error-500 text-white hover:bg-error-600 focus-visible:ring-error-500 shadow-md shadow-error-500/20 border border-transparent';
      case 'default':
      default:
        return `
          bg-bg-light dark:bg-bg-dark 
          border border-solid border-border-light dark:border-border-dark
          text-text-light dark:text-text-dark
          hover:text-primary-500 hover:border-primary-500 dark:hover:text-primary-400 dark:hover:border-primary-400
          focus-visible:ring-primary-500
        `;
    }
  })();

  // --- 3. 合并最终 Class ---
  // 这里 themeClasses 已经是响应式的了，所以 classes 也会自动更新
  $: classes = twMerge(clsx(baseClasses, sizeMap[size], shapeClass, themeClasses, block && 'w-full flex', className));

  function handleClick(event: MouseEvent) {
    if (!disabled && !loading) {
      dispatch('click', event);
    }
  }

  // --- 4. Tooltip Action (保持不变，因为这个已经修好了) ---
  function tooltipAction(node: HTMLElement, params: { content?: string; placement?: TippyProps['placement'] }) {
    let instance: TippyInstance | undefined;

    function update(p: { content?: string; placement?: TippyProps['placement'] }) {
      if (!p.content) {
        if (instance) {
          instance.destroy();
          instance = undefined;
        }
        return;
      }

      if (!instance) {
        instance = tippy(node, {
          content: p.content,
          placement: p.placement || 'top',
          allowHTML: true,
          appendTo: () => document.body,
        });
      } else {
        instance.setContent(p.content);
        instance.setProps({ placement: p.placement || 'top' });
      }
    }

    update(params);

    return {
      update,
      destroy() {
        if (instance) instance.destroy();
      },
    };
  }
</script>

{#if href}
  <a
    use:tooltipAction={{ content: tooltip, placement: tooltipPlacement }}
    {href}
    class={classes}
    role="button"
    aria-disabled={disabled}
    on:click={handleClick}
    {...$$restProps}
  >
    {#if loading} <Spinner {size} /> {/if}
    {#if $$slots.icon && !loading}
      <span class="mr-1.5 flex items-center"><slot name="icon" /></span>
    {/if}
    <slot />
  </a>
{:else}
  <button
    use:tooltipAction={{ content: tooltip, placement: tooltipPlacement }}
    type={htmlType}
    class={classes}
    {disabled}
    on:click={handleClick}
    {...$$restProps}
  >
    {#if loading} <div class="mr-2"><Spinner {size} /></div> {/if}
    {#if $$slots.icon && !loading}
      <span class="mr-1.5 flex items-center"><slot name="icon" /></span>
    {/if}
    <slot />
  </button>
{/if}
