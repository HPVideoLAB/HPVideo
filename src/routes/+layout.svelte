<script>
  import '../polyfills'; // 必须在其他代码之前引入
  import { onMount, setContext } from 'svelte';
  import { config, theme, WEBUI_NAME, mobile, threesideAccount, urlprompt, initPageFlag } from '$lib/stores';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { Toaster } from 'svelte-sonner';

  import { defaultBackendConfig } from '$lib/apis';
  import { config as wconfig, clearConnector } from '$lib/utils/wallet/bnb/index';
  import { getAccount, disconnect } from '@wagmi/core';

  import '../tailwind.css';
  import '../app.css';

  // 打开调试模式
  // import VConsole from 'vconsole';
  // const vConsole = new VConsole();

  import 'tippy.js/dist/tippy.css';

  import { WEBUI_BASE_URL } from '$lib/constants';
  import i18n, { initI18n } from '$lib/i18n';

  setContext('i18n', i18n);
  let loaded = false;
  const BREAKPOINT = 768;

  // 挂载serviceWorker
  async function registServiceWorker() {
    if ('serviceWorker' in navigator) {
      // 注册 Service Worker，指定 type 为 'module' 以支持 ES6 模块语法
      navigator.serviceWorker
        .register('../static/sw.js', { type: 'module' })
        .then((registration) => {
          console.log('Service Worker registered success with scope:', registration.scope);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }

  async function initData() {
    let backendConfig = null;
    try {
      backendConfig = await defaultBackendConfig();
    } catch (error) {
      console.error('Error loading backend config:', error);
    }
    // Initialize i18n even if we didn't get a backend config,
    // so `/error` can show something that's not `undefined`.
    initI18n(backendConfig?.default_locale);

    if (backendConfig) {
      // Save Backend Status to Store
      await config.set(backendConfig);

      await WEBUI_NAME.set(backendConfig.name);
    } else {
      // Redirect to /error when Backend Not Detected
      await goto(`/creator/error`);
    }

    // -----------------
    // 🔥 修复：跟随系统主题
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'light') {
      // 用户明确选择浅色
      theme.set('light');
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else if (savedTheme === 'dark' || savedTheme?.includes('oled')) {
      // 用户明确选择深色
      theme.set(savedTheme);
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    } else {
      // 跟随系统主题（包括 savedTheme === 'system' 或 savedTheme 不存在）
      const systemTheme = prefersDark ? 'dark' : 'light';
      theme.set(systemTheme);
      document.documentElement.classList.remove(prefersDark ? 'light' : 'dark');
      document.documentElement.classList.add(systemTheme);
      if (!savedTheme) {
        localStorage.setItem('theme', 'system');
      }
    }

    mobile.set(window.innerWidth < BREAKPOINT);
    const onResize = () => {
      if (window.innerWidth < BREAKPOINT) {
        mobile.set(true);
      } else {
        mobile.set(false);
      }
    };

    window.addEventListener('resize', onResize);

    // 🔥 移除：不在这里删除 splash-screen，改到 loaded = true 之后
    // document.getElementById('splash-screen')?.remove();

    // 创建并插入Google Analytics的script标签（异步，不阻塞）
    const script = document.createElement('script');
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-ELT9ER83T2';
    script.async = true;
    document.head.appendChild(script);

    // 初始化Google Analytics
    script.onload = () => {
      window.dataLayer = window.dataLayer || [];
      function gtag() {
        dataLayer.push(arguments);
      }
      gtag('js', new Date());
      gtag('config', 'G-ELT9ER83T2');
    };

    return () => {
      window.removeEventListener('resize', onResize);
    };
  }

  // 获取请求携带参数
  async function initUrlParam() {
    const queryParams = new URLSearchParams($page.url.search);
    const promptVal = queryParams.get('urlprompt');
    if (promptVal) {
      await urlprompt.set(promptVal);
    }
  }

  // 🔥 移除 splash-screen 的函数
  function removeSplashScreen() {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      // 添加淡出动画
      splash.style.transition = 'opacity 0.3s ease-out';
      splash.style.opacity = '0';
      setTimeout(() => splash.remove(), 300);
    }
  }

  // 🔥 监听 initPageFlag，当 app 布局初始化完成后才移除 splash-screen
  $: if ($initPageFlag) {
    removeSplashScreen();
  }

  onMount(async () => {
    // await registServiceWorker();
    try {
      // 🔥 并行执行不依赖的初始化任务
      const [_, __] = await Promise.all([initData(), initUrlParam()]);

      // 🔥 钱包检查添加超时保护（最多等待 3 秒）
      await Promise.race([checkWallectConnect(), new Promise((resolve) => setTimeout(resolve, 3000))]);

      loaded = true;
      // 🔥 注意：不在这里设置 initPageFlag，由 (app)/+layout.svelte 在 printSignIn 完成后设置
    } catch (error) {
      console.error('[Layout Init Error]', error);
      // 🔥 即使出错也要显示页面，避免永久黑屏
      loaded = true;
      // 🔥 出错时设置 initPageFlag 并移除 splash-screen，避免永久黑屏
      initPageFlag.set(true);
    }
  });

  // connect wallet function
  const checkWallectConnect = async () => {
    let account = getAccount(wconfig);
    if (account?.address) {
      await threesideAccount.set(account);
    } else {
      clearConnector();
      localStorage.removeItem('token');
      disconnect(wconfig);
    }
  };
</script>

<svelte:head>
  <title>{$WEBUI_NAME}</title>
  <link crossorigin="anonymous" rel="icon" href="/favicon.png" />
</svelte:head>

{#if loaded}
  <slot />
{/if}

<Toaster richColors position="top-center" class="flex" />
