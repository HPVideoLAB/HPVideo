<script>
  import '../polyfills'; // 必须在其他代码之前引入
  import { onMount, setContext } from 'svelte';
  import { config, theme, WEBUI_NAME, mobile, threesideAccount, urlprompt } from '$lib/stores';
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
    theme.set('dark');
    // 2. 强制写入本地存储，防止下次加载时读取到旧的 'light'
    localStorage.setItem('theme', 'dark');

    mobile.set(window.innerWidth < BREAKPOINT);
    const onResize = () => {
      if (window.innerWidth < BREAKPOINT) {
        mobile.set(true);
      } else {
        mobile.set(false);
      }
    };

    window.addEventListener('resize', onResize);

    document.getElementById('splash-screen')?.remove();

    // 创建并插入Google Analytics的script标签
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

  onMount(async () => {
    // await registServiceWorker();
    try {
      await initData();
      await initUrlParam();
      await checkWallectConnect();
      loaded = true;
    } catch (error) {
      console.log('==============', error);
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
