// src/lib/stores/wallet.ts
import { writable, get } from 'svelte/store';
import { readable } from 'svelte/store';
import { watchAccount, getAccount } from '@wagmi/core';
import { config as wconfig } from '$lib/utils/wallet/bnb/index';

// Unified wallet address store
export const walletAddress = writable<string>('');

// Initialize: check BSC wallet or points wallet
function initWalletAddress() {
  const mode = typeof localStorage !== 'undefined' ? localStorage.getItem('paymentMode') : 'token';
  if (mode === 'points') {
    const addr = typeof localStorage !== 'undefined' ? localStorage.getItem('hpv_points_address') : '';
    walletAddress.set(addr || '');
  } else {
    const account = getAccount(wconfig);
    if (account?.address) walletAddress.set(account.address);
  }
}

// Watch BSC wallet changes
try {
  watchAccount(wconfig, {
    onChange: (data) => {
      const mode = typeof localStorage !== 'undefined' ? localStorage.getItem('paymentMode') : 'token';
      if (mode !== 'points') {
        walletAddress.set(data.address || '');
      }
    },
  });
} catch (e) {}

// Initialize on load
try { initWalletAddress(); } catch (e) {}

// Export a function to manually refresh (called after points wallet connect)
export function refreshWalletAddress() {
  initWalletAddress();
}
