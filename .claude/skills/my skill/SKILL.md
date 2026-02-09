---
name: my skill
description: '这个项目的skill'
version: 1.2.0
---

1.所有的信息都要国际化，我们的用户都是国际化的，所以响应信息里面不能有中文，必须要国际化，但是写代码多用中文注释这是可以的，而且我鼓励你多用中文注释。 "Please enter a video prompt": "Please enter a video prompt"国际化用英文值作为键这样如果我们其他语言没国际化 json 数据也直接就是英文。

2.遇到复杂问题多分析，别着急写代码，确认了问题原因再写代码。

3.代码要规范功能要稳定可靠。

4.回答我的问题用中文回答我。

5.目前主要功能在 http://localhost:5173/creator/pro/在这个页面，所以你排查问题也主要在这个页面，前端用的是 svelte4 ，后端用的是 nest,C:\Users\28639\Desktop\DBC\HPVideo\backend\degpt-nest\degpt-nest 在这个目录下，后端问题主要排查这里就行了。

6.图标统一都用 svelte-iconfy 这个库，图标组件用<iconify-icon icon="ph:lightbulb-fill" />这样的

7.如果需要用到工具函数优先从 svelte-legos 库里面找函数看有没有，这样代码简洁，因为我们已经集成了这个库

8.写代码的时候，结构尽量先从"bits-ui": "^0.19.7"里面找基础组件，这样代码简洁

9.多使用 tootip 组件，这样用户鼠标放上去就明白什么意思了， import Tooltip from '$lib/components/common/Tooltip.svelte';这么导入，<script lang="ts">
import { onDestroy } from 'svelte';
import tippy from 'tippy.js';

export let placement = 'top';
export let content = `I'm a tooltip!`;
export let touch = true;

let tooltipElement;
let tooltipInstance;

$: if (tooltipElement && content) {
if (tooltipInstance) {
tooltipInstance.setContent(content);
} else {
tooltipInstance = tippy(tooltipElement, {
content: content,
placement: placement,
allowHTML: true,
touch: touch,
});
}
}

onDestroy(() => {
if (tooltipInstance) {
tooltipInstance.destroy();
}
});
</script>

<div bind:this={tooltipElement} aria-label={content} class="flex">
  <slot />
</div>
这是代码

10.按钮多使用 import MyButton from '$lib/components/common/MyButton.svelte';我自定义的按钮组件<script lang="ts">
import { createEventDispatcher, getContext } from 'svelte';
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
const i18n: any = getContext('i18n');

// --- 1. 基础样式 ---
const baseClasses = `  inline-flex items-center justify-center whitespace-nowrap
    font-medium transition-all duration-200 select-none
    outline-none 
    [-webkit-tap-highlight-color:transparent]
    focus-visible:ring-2 focus-visible:ring-offset-2
    focus-visible:ring-offset-bg-light dark:focus-visible:ring-offset-bg-dark
    disabled:opacity-50 disabled:cursor-not-allowed
    active:scale-[0.98] disabled:active:scale-100`;

const sizeMap = {
tiny: 'h-6 px-2 text-xs',
small: 'h-8 px-3 text-sm',
medium: 'h-9 px-4 text-sm',
large: 'h-11 px-6 text-base',
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
use:tooltipAction={{ content: $i18n.t(tooltip), placement: tooltipPlacement }}
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
    use:tooltipAction={{ content: $i18n.t(tooltip), placement: tooltipPlacement }}
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
这是代码

11.tialwindcss 配置/** @type {import('tailwindcss').Config} \*/
export default {
darkMode: 'class',
content: ['./src/**/\*.{html,js,svelte,ts}'],
theme: {
extend: {
colors: {
text: {
light: '#171717', // 对应 gray-900
lightSecondary: '#676767', // 对应 gray-600

          dark: '#f9f9f9', // 对应 gray-50
          darkSecondary: '#b4b4b4', // 对应 gray-400
        },
        bg: {
          light: '#FFFFFF',
          dark: '#171717',
        },
        border: {
          light: '#e3e3e3', // 亮色模式用浅灰线 (gray-200)
          dark: '#333333', // 暗色模式用深灰线 (gray-800)
        },
        gray: {
          50: '#f9f9f9',
          100: '#ececec',
          200: '#e3e3e3',
          300: '#cdcdcd',
          400: '#b4b4b4',
          500: '#9b9b9b',
          600: '#676767',
          700: '#4e4e4e',
          800: '#333',
          850: '#262626',
          900: 'var(--color-gray-900, #171717)',
          950: 'var(--color-gray-950, #0d0d0d)',
        },

        // 基于 #C213F2 的紫色主色调
        primary: {
          DEFAULT: '#c213f2', // 你可以根据需要更改默认颜色
          light: '#c213f2',
          dark: '#c213f2',
          50: '#fbf6ff', // 非常浅的紫色
          100: '#f5e8ff', // 浅紫色
          200: '#ecd4ff', // 柔和的紫色
          300: '#ddb2ff', // 中等浅紫色
          400: '#c980ff', // 亮紫色
          500: '#c213f2', // 你的主色调 (#C213F2)
          600: '#a80fd4', // 深一点的紫色（悬停色）
          700: '#8a0cb0', // 更深的紫色
          800: '#6f0990', // 深紫色
          900: '#55076f', // 非常深的紫色
          950: '#350446', // 最深的紫色
        },
        // ✅ 成功状态：偏深绿色，避免和主色冲突
        success: {
          DEFAULT: '#1DA674',
          light: '#1DA674',
          dark: '#117552',
          50: '#E7F8F1',
          100: '#C7F0DF',
          200: '#A1E6C9',
          300: '#71D3B0',
          400: '#44C59B',
          500: '#1DA674',
          600: '#158D62',
          700: '#117552',
          800: '#0E5C42',
          900: '#0B4935',
        },

        // ✅ 警告状态：亮黄橙色，亲和易读
        warning: {
          DEFAULT: '#F59E0B',
          light: '#F59E0B',
          dark: '#B45309',
          50: '#FFFAEB',
          100: '#FFF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },

        // ✅ 错误状态：经典错误红，无需调整
        error: {
          DEFAULT: '#EF4444',
          light: '#EF4444',
          dark: '#B91C1C',
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
        },
      },

      typography: {
        DEFAULT: {
          css: {
            pre: false,
            code: false,
            'pre code': false,
            'code::before': false,
            'code::after': false,
            // 修改默认的 prose 样式中 hr 标签的 margin
            hr: {
              marginTop: '0.1em',
              marginBottom: '0.1em',
            },
          },
        },
      },
    },

},
plugins: [require('@tailwindcss/typography')],
};
