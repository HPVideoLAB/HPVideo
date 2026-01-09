// src/lib/utils/wallet/check.ts
import { getAccount } from '@wagmi/core';
// ⚠️ 极其重要：必须引入和你在 App.svelte 或 layout.svelte 里初始化 Web3Modal 时用到的同一个 config 对象！
import { config, modal } from '$lib/utils/wallet/bnb/index';

/**
 * 🛡️ 钱包连接检查卫士
 * @returns {Promise<string | null>} 返回地址或null
 */
export const ensureWalletConnected = async (): Promise<string | null> => {
  // 获取当前账户完整状态
  const account: any = getAccount(config);

  // console.log('🔍 [Wallet Check] 当前 Wagmi 状态:', {
  //   address: account.address,
  //   status: account.status,
  //   isConnected: account.isConnected,
  // });

  // 🛡️ 严格检查：
  // 1. address 必须存在
  // 2. status 不能是 disconnected (有些时候 Wagmi 会缓存 address 但状态是 disconnected)
  if (!account.address || account.status === 'disconnected') {
    console.warn('❌ [Wallet Check] 判定为未连接，尝试唤起弹窗');

    // 唤起弹窗 (使用 await 确保弹窗指令发出)
    try {
      await modal.open();
    } catch (e) {
      console.error('唤起 Web3Modal 失败:', e);
    }

    return null;
  }

  // ✅ 验证通过，返回地址
  return account.address;
};
