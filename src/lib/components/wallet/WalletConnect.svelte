<script lang="ts">
  import { onMount, getContext, onDestroy } from 'svelte'; // 🔥 引入 onDestroy
  import { user, theme, threesideAccount, paymentMode } from '$lib/stores';
  import MyButton from '$lib/components/common/MyButton.svelte';
  import { chats } from '$lib/stores'; // 或从 apis 导入
  import { getChatList } from '$lib/apis/chats';
  // 👇 1. 引入和 Navbar 一模一样的 Web3 依赖
  import { watchAccount, getAccount } from '@wagmi/core';
  import { config as wconfig, clearConnector, modal } from '$lib/utils/wallet/bnb/index';
  import { printSignIn, walletSignIn } from '$lib/apis/auths/index';
  import { Base64 } from 'js-base64';
  import { ethers } from 'ethers';

  // 复用设置组件
  import Setting from '$lib/components/layout/Navbar/Setting.svelte';

  // 支付模式选择和积分余额
  import PaymentModeSelector from '$lib/components/wallet/PaymentModeSelector.svelte';
  import PointsBalance from '$lib/components/wallet/PointsBalance.svelte';

  let showModeSelector = false;

  const i18n: any = getContext('i18n');

  // 🔥 定义加载状态变量
  let isLoading = false;

  // 用于清理监听器
  let unwatchAccount: () => void;
  let unsubscribeModal: () => void;

  // 👇 2. 完全复用 watchAccount 逻辑
  // 在 watchAccount 的 onChange 回调里加强处理
  unwatchAccount = watchAccount(wconfig, {
    async onChange() {
      const account = getAccount(wconfig); // 每次都重新获取最新 account
      const currentStatus = account.status;

      // loading 控制（保持原样）
      if (currentStatus === 'reconnecting' || currentStatus === 'connecting') {
        isLoading = true;
        return;
      }

      if (currentStatus === 'disconnected') {
        console.log('[watchAccount] 检测到 disconnected', {
          threesideAccountBefore: $threesideAccount?.address || '无',
          time: new Date().toISOString(),
        });

        isLoading = false;

        if ($threesideAccount?.address) {
          console.log('[watchAccount] 强制清空 threesideAccount');
          clearConnector();
          threesideAccount.set({});

          await signIn();
          console.log('[watchAccount] 清空后 threesideAccount:', $threesideAccount);
        }
        return;
      }

      // connected 情况
      if (currentStatus === 'connected' && account.address) {
        // 如果已经是同一个地址，就别重复登录
        if ($threesideAccount?.address === account.address) {
          isLoading = false;
          return;
        }

        isLoading = true;
        try {
          await walletLogin(account.address);
          $threesideAccount = account; // 登录成功才 set
        } catch (err) {
          console.error('Login failed on connect', err);
          // 可选：这里也可以清空
          $threesideAccount = {};
        } finally {
          isLoading = false;
        }
      }
    },
  });

  // 🔥 初始化与监听
  onMount(() => {
    // 1. 初始状态检查
    const account = getAccount(wconfig);
    if (account.status === 'reconnecting' || (account.status === 'connected' && !$threesideAccount?.address)) {
      isLoading = true;
    }

    // 2. 🔥🔥🔥 核心修复：监听 Web3Modal 弹窗状态
    // 如果用户打开了弹窗，然后点击了右上角关闭或者点击遮罩层关闭，
    // 此时 open 变为 false，且状态依然是 disconnected，说明用户取消了连接。
    unsubscribeModal = modal.subscribeState((state) => {
      if (!state.open) {
        // 弹窗关闭了
        const currentAccount = getAccount(wconfig);
        // 如果此时钱包依然是断开状态，说明用户取消了操作 -> 关闭 Loading
        if (currentAccount.status === 'disconnected') {
          isLoading = false;
        }
      }
    });
  });

  // 组件销毁时清理所有监听
  onDestroy(() => {
    if (unwatchAccount) unwatchAccount();
    if (unsubscribeModal) unsubscribeModal();
  });

  // 打开钱包选择弹窗
  const connect = () => {
    // 首次连接时显示模式选择
    if (!localStorage.getItem('paymentMode')) {
      showModeSelector = true;
    } else {
      doConnect();
    }
  };

  const doConnect = () => {
    isLoading = true;
    checkModalTheme();
    modal.open();
  };

  const onModeSelected = () => {
    doConnect();
  };

  const checkModalTheme = () => {
    modal.setThemeMode($theme === 'light' ? 'light' : 'dark');
  };

  // 👇 3. 【核心安全逻辑】(完全未动)
  function generateRandomMessage(length: number) {
    const randomBytes = new Uint8Array(length);
    crypto.getRandomValues(randomBytes);
    return ethers.hexlify(randomBytes);
  }

  // 👇 4. 【核心安全逻辑】(完全未动)
  const walletLogin = async (address: string) => {
    const randomMessage = generateRandomMessage(32);
    let combinedText = '';

    for (let i = 0; i < randomMessage.length; i++) {
      let charCode = randomMessage.charCodeAt(i);
      let vectorCharCode = address.charCodeAt(i % address.length);
      combinedText += String.fromCharCode((charCode + vectorCharCode) % 256);
    }

    const signature = Base64.encode(combinedText);

    const walletSignInResult = await walletSignIn({
      address,
      nonce: randomMessage,
      address_type: 'threeSide',
      device_id: localStorage.visitor_id || '',
      signature,
      id: localStorage.visitor_id || '',
    });

    if (walletSignInResult?.token) {
      localStorage.removeItem('token');
      localStorage.token = walletSignInResult.token;
      user.set(walletSignInResult);

      // 加上这几行
      await chats.set([]);
      chats.set(await getChatList(localStorage.token));
    }
  };

  // 游客登录逻辑 (完全未动)
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

<!-- Payment Mode Selector -->
<PaymentModeSelector bind:show={showModeSelector} on:select={onModeSelected} />

<div class="flex items-center">
  {#if $threesideAccount?.address}
    <div class="flex flex-col items-end gap-1">
      <div
        class="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-1 pl-3 flex items-center pr-2 transition-all"
      >
        <!-- Payment mode indicator -->
        {#if $paymentMode === 'points'}
          <iconify-icon icon="mdi:star-circle" class="text-amber-500 mr-1.5 text-base" title="Points Mode" />
        {:else}
          <iconify-icon icon="lucide:wallet" class="text-gray-500 dark:text-gray-400 mr-1.5 text-base" title="Token Mode" />
        {/if}

        <div class="text-sm font-medium text-gray-700 dark:text-gray-200 font-mono mr-1">
          {$threesideAccount.address.slice(0, 6)}...{$threesideAccount.address.slice(-4)}
        </div>

        <!-- Mode switch button -->
        <button
          class="text-xs px-1.5 py-0.5 rounded-md transition
            {$paymentMode === 'points'
              ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
              : 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20'}"
          title={$i18n.t('Switch payment mode')}
          on:click={() => { showModeSelector = true; }}
        >
          {$paymentMode === 'points' ? 'PTS' : 'USDT'}
        </button>

        <Setting />
      </div>

      <!-- Points balance (only in points mode) -->
      <PointsBalance />
    </div>
  {:else if isLoading}
    <MyButton type="primary" round size="small" loading disabled>Connecting...</MyButton>
  {:else}
    <MyButton id="connect-wallet-btn" size="small" round type="primary" on:click={() => connect()}>
      <iconify-icon slot="icon" icon="lucide:wallet" class="text-lg" />
      {$i18n.t('Connect Wallet')}
    </MyButton>
  {/if}
</div>
