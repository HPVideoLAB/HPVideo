// src/lib/utils/wallet/check.ts
import { getAccount } from '@wagmi/core';
import { config, modal } from '$lib/utils/wallet/bnb/index';
import { get } from 'svelte/store';
import { paymentMode } from '$lib/stores';
import { getStoredAddress } from '$lib/utils/wallet/dlcp/wallet';

/**
 * Wallet connection check - supports both token (BSC) and points (DBC) modes
 * @returns {Promise<string | null>} address or null
 */
export const ensureWalletConnected = async (): Promise<string | null> => {
  const mode = get(paymentMode);

  if (mode === 'points') {
    // Points mode: check local DBC wallet
    const addr = getStoredAddress();
    if (addr) return addr;
    console.warn('[Wallet Check] Points wallet not found');
    return null;
  }

  // Token mode: check BSC wallet (wagmi)
  const account: any = getAccount(config);

  if (!account.address || account.status === 'disconnected') {
    console.warn('[Wallet Check] BSC wallet not connected');
    try {
      await modal.open();
    } catch (e) {
      console.error('Open Web3Modal failed:', e);
    }
    return null;
  }

  return account.address;
};
