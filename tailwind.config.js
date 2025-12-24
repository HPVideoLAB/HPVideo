/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
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
