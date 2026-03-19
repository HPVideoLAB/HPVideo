// src/lib/stores/wallet.ts
import { derived, get } from 'svelte/store';
import { readable } from 'svelte/store';
import { watchAccount, getAccount } from '@wagmi/core';
import { config as wconfig } from '$lib/utils/wallet/bnb/index';
import { paymentMode } from '$lib/stores/index';

// BSC wallet address (wagmi)
const bscWalletAddress = readable<string>('', (set) => {
  const account = getAccount(wconfig);
  if (account?.address) set(account.address);

  const unwatch = watchAccount(wconfig, {
    onChange: (data) => {
      set(data.address || '');
    },
  });

  return () => {
    unwatch();
  };
});

// Unified wallet address: returns BSC or DBC address based on payment mode
export const walletAddress = derived(
  [bscWalletAddress, paymentMode],
  ([$bsc, $mode]) => {
    if ($mode === 'points') {
      return localStorage.getItem('hpv_points_address') || '';
    }
    return $bsc;
  }
);
