// src/lib/stores/wallet.ts
import { readable } from 'svelte/store';
import { watchAccount, getAccount } from '@wagmi/core';
import { config as wconfig } from '$lib/utils/wallet/bnb/index';

// 这是一个 Store，因为它返回的是可订阅对象
export const walletAddress = readable<string>('', (set) => {
  // 1. 初始化 (Setup)
  const account = getAccount(wconfig);
  if (account?.address) set(account.address);

  // 2. 开始监听 (Start)
  const unwatch = watchAccount(wconfig, {
    onChange: (data) => {
      console.log('🔄 Wallet changed:', data.address);
      set(data.address || '');
    },
  });

  // 3. 停止监听 (Cleanup / Teardown)
  // 当没有任何组件在用 $walletAddress 时，这个函数会自动运行
  return () => {
    unwatch();
  };
});
