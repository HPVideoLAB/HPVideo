/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{html,js,svelte,ts}'],
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
