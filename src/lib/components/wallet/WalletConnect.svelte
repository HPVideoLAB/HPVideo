<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import { user, theme, threesideAccount } from '$lib/stores';

  // 👇 1. 引入和 Navbar 一模一样的 Web3 依赖
  import { watchAccount, getAccount } from '@wagmi/core';
  import { config as wconfig, clearConnector, modal } from '$lib/utils/wallet/bnb/index';
  import { printSignIn, walletSignIn } from '$lib/apis/auths/index';
  import { Base64 } from 'js-base64';
  import { ethers } from 'ethers';

  // 复用设置组件，这样用户登录后能看到同样的下拉菜单
  import Setting from '$lib/components/layout/Navbar/Setting.svelte';

  const i18n: any = getContext('i18n');

  // 👇 2. 完全复用 watchAccount 逻辑
  // 这确保了 MetaMask 切换账号时，你的应用能实时响应
  watchAccount(wconfig, {
    async onChange() {
      try {
        if ($threesideAccount?.address) {
          clearConnector();
          $threesideAccount = {};
          await signIn();
        } else {
          let account = getAccount(wconfig);
          // 如果检测到钱包连接，自动执行签名登录
          if (account?.address) {
            await walletLogin(account?.address);
            $threesideAccount = account;
          }
        }
      } catch (error) {
        console.log('wallet login error:', error);
      }
    },
  });

  // 打开钱包选择弹窗 (Web3Modal)
  const connect = () => {
    checkModalTheme();
    modal.open();
  };

  const checkModalTheme = () => {
    // 简化了逻辑，但效果一致
    modal.setThemeMode($theme === 'light' ? 'light' : 'dark');
  };

  // 👇 3. 【核心安全逻辑】生成随机数
  // 必须保留，否则签名无效
  function generateRandomMessage(length: number) {
    const randomBytes = new Uint8Array(length);
    crypto.getRandomValues(randomBytes);
    return ethers.hexlify(randomBytes);
  }

  // 👇 4. 【核心安全逻辑】签名与登录
  // 这段逻辑完全复制自 Navbar，包含那个特殊的 XOR 循环
  const walletLogin = async (address: string) => {
    const randomMessage = generateRandomMessage(32);
    let combinedText = '';

    // 这里的循环逻辑必须和后端匹配
    for (let i = 0; i < randomMessage.length; i++) {
      let charCode = randomMessage.charCodeAt(i);
      let vectorCharCode = address.charCodeAt(i % address.length);
      combinedText += String.fromCharCode((charCode + vectorCharCode) % 256);
    }

    const signature = Base64.encode(combinedText);

    // 调用 API
    const walletSignInResult = await walletSignIn({
      address,
      nonce: randomMessage,
      address_type: 'threeSide',
      device_id: localStorage.visitor_id || '',
      signature,
      id: localStorage.visitor_id || '',
    });

    // 处理登录结果
    if (walletSignInResult?.token) {
      localStorage.removeItem('token');
      localStorage.token = walletSignInResult.token;
      user.set(walletSignInResult);

      // 注意：Pro 页面不需要加载聊天列表 (getChatList)，所以我去掉了那部分
      // 这会让 Pro 页面加载更快，且不影响登录状态
    }
  };

  // 游客登录逻辑 (退出钱包时使用)
  async function signIn() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('walletImported');
    localStorage.removeItem('walletKey');
    const res = await printSignIn('');
    localStorage.token = res.token;
    user.set(res);
  }
</script>

<div class="flex items-center">
  {#if $threesideAccount?.address}
    <div class="bg-gray-100 dark:bg-gray-800 rounded-full p-1 flex items-center pr-2">
      <div class="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-200 font-mono">
        {$threesideAccount.address.slice(0, 6)}...{$threesideAccount.address.slice(-4)}
      </div>

      <Setting />
    </div>
  {:else}
    <button
      id="connect-wallet-btn"
      class="bg-[#9903E6] hover:bg-[#8602ca] text-white px-5 py-2 rounded-xl text-sm font-bold transition shadow-lg shadow-purple-500/20 active:scale-95"
      on:click={connect}
    >
      {$i18n.t('Connect Wallet')}
    </button>
  {/if}
</div>
