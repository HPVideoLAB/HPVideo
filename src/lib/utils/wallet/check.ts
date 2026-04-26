// src/lib/utils/wallet/check.ts
import { getAccount } from '@wagmi/core';
import { config, modal } from '$lib/utils/wallet/bnb/index';
import { get } from 'svelte/store';
import { toast } from 'svelte-sonner';
import { paymentMode } from '$lib/stores';
import i18n from '$lib/i18n';
import { getStoredAddress } from '$lib/utils/wallet/dlcp/wallet';

const tr = (key: string) => get(i18n).t(key);

/**
 * Wallet connection check - supports both token (BSC) and points (DBC) modes.
 * Always surfaces a toast on failure so a click never feels silent.
 * @returns {Promise<string | null>} address or null
 */
export const ensureWalletConnected = async (): Promise<string | null> => {
  const mode = get(paymentMode);

  if (mode === 'points') {
    // Points mode: check local DBC wallet
    const addr = getStoredAddress();
    if (addr) return addr;
    toast.warning(tr('Please connect a wallet first'));
    return null;
  }

  // Token mode: check BSC wallet (wagmi)
  const account: any = getAccount(config);

  if (!account.address || account.status === 'disconnected') {
    toast.info(tr('Please connect a wallet first'));
    try {
      await modal.open();
    } catch (e) {
      console.error('Open Web3Modal failed:', e);
    }
    return null;
  }

  return account.address;
};
