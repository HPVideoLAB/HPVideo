// src/hooks/usePayment.ts
import { getAccount } from '@wagmi/core';
import { config as wconfig, modal, getUSDTBalance, getBNBBalance, tranUsdt } from '$lib/utils/wallet/bnb/index';
import { bnbpaycheck } from '$lib/apis/pay';
import { toast } from 'svelte-sonner';
import { v4 as uuidv4 } from 'uuid';

export function usePayment(i18n) {
  const t = i18n.t;
  const getToken = () => localStorage.getItem('token') || localStorage.getItem('access_token') || '';
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const pay = async (args: {
    amount?: number;
    model: string;
    resolution?: string;
    duration?: number;
  }): Promise<{ success: boolean; txHash?: string; error?: string }> => {
    const { amount = 0.0001, model, resolution = '720p', duration = 5 } = args;

    try {
      // 1. 检查钱包连接
      const account = getAccount(wconfig);
      if (!account?.address) {
        try {
          const theme = localStorage.getItem('theme') || 'dark';
          modal.setThemeMode(theme === 'light' ? 'light' : 'dark');
        } catch {}
        modal.open();
        // 👇 使用 t()
        throw new Error(t('Please connect wallet first'));
      }

      const address = account.address;
      const strAmount = amount.toString();
      const messageid = uuidv4();

      // 2. 预检
      toast.dismiss();
      toast.loading(t('Creating order...')); // 👇 使用 t()

      const body = {
        hash: '',
        address,
        messageid,
        model: model,
        size: resolution,
        duration: duration,
        amount: strAmount,
      };

      const check1 = await bnbpaycheck(getToken(), body);
      if (check1?.ok) {
        toast.dismiss();
        toast.success(t('No payment required, starting generation')); // 👇 使用 t()
        return { success: true };
      }

      // 3. 检查余额
      toast.dismiss();
      toast.loading(t('Checking wallet balance...')); // 👇 使用 t()

      const bnbBalance = await getBNBBalance(address);
      if (bnbBalance < 0.002) {
        throw new Error(t('Insufficient BNB balance for Gas')); // 👇 使用 t()
      }

      const usdtBalance = await getUSDTBalance(address);
      if (!(Number(strAmount) > 0)) throw new Error(t('Invalid payment amount')); // 👇 使用 t()
      if (Number(usdtBalance) < Number(strAmount))
        throw new Error(`${t('Insufficient USDT balance')} (${t('Current')}: ${usdtBalance})`); // 👇 使用 t()

      // 4. 发起交易
      toast.dismiss();
      toast.loading(t('Please confirm payment in wallet...')); // 👇 使用 t()

      let txResponse;
      try {
        txResponse = await tranUsdt(strAmount, messageid);
      } catch (err: any) {
        if (err?.code === 4001 || err?.message?.includes('rejected')) {
          throw new Error(t('User canceled payment')); // 👇 使用 t()
        }
        throw err;
      }

      if (!txResponse?.hash) {
        throw new Error(t('Payment incomplete: canceled or network error')); // 👇 使用 t()
      }

      // 5. 交易后轮询
      toast.dismiss();
      toast.loading(t('Verifying transaction on-chain (do not close)...')); // 👇 使用 t()

      const maxRetries = 10;
      let verified = false;

      for (let i = 0; i < maxRetries; i++) {
        try {
          const check2 = await bnbpaycheck(getToken(), { ...body, hash: txResponse.hash });
          if (check2?.ok) {
            verified = true;
            break;
          }
        } catch (e) {
          console.log(`Polling verify failed ${i + 1}/${maxRetries}`);
        }
        await wait(2000);
      }

      if (!verified) {
        console.warn('Payment sent but backend verify timeout', txResponse.hash);
        toast.dismiss();
        toast.warning(t('Payment broadcasted, syncing system, please refresh later')); // 👇 使用 t()
        return { success: true, txHash: txResponse.hash };
      }

      toast.dismiss();
      toast.success(t('Payment successful!')); // 👇 使用 t()
      return { success: true, txHash: txResponse.hash };
    } catch (e: any) {
      console.error('Payment Hook Error:', e);
      toast.dismiss();

      let msg = e.message || t('Payment failed'); // 👇 使用 t()
      if (msg.includes('rejected') || msg.includes('取消') || msg.includes('User canceled')) {
        toast.info(t('Payment canceled')); // 👇 使用 t()
      } else {
        toast.error(msg);
      }

      return { success: false, error: msg };
    }
  };

  return { pay };
}
