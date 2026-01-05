// src/hooks/usePayment.ts
import { getAccount } from '@wagmi/core';
import { config as wconfig, modal, getUSDTBalance, tranUsdt } from '$lib/utils/wallet/bnb/index'; // 路径根据实际情况调整
import { bnbpaycheck } from '$lib/apis/pay'; // 路径根据实际情况调整
import { toast } from 'svelte-sonner';
import { v4 as uuidv4 } from 'uuid';

export function usePayment() {
  const getToken = () => localStorage.getItem('token') || localStorage.getItem('access_token') || '';

  // 核心支付函数
  const pay = async (args: {
    amount?: number; // 默认 0.0001
    model: string; // 模型名称
    resolution?: string; // 分辨率
    duration?: number; // 时长
  }): Promise<{ success: boolean; txHash?: string; error?: string }> => {
    const { amount = 0.0001, model, resolution = '720p', duration = 5 } = args;

    try {
      // 1. 检查钱包连接
      const account = getAccount(wconfig);
      if (!account?.address) {
        // 尝试自动切换主题并打开 Modal
        try {
          const theme = localStorage.getItem('theme') || 'dark';
          modal.setThemeMode(theme === 'light' ? 'light' : 'dark');
        } catch {}
        modal.open();
        // 触发连接按钮点击（为了兼容旧逻辑，如果有更好方式可替换）
        document.getElementById('connect-wallet-btn')?.click();
        throw new Error('请先连接钱包');
      }

      const address = account.address;
      const strAmount = amount.toString();
      const messageid = uuidv4();

      // 2. 预检 (Pre-check)
      toast.loading('正在创建支付订单...');

      const body = {
        hash: '',
        address,
        messageid,
        model: 'img-to-video', // 这里后端可能统称 img-to-video，或者你可以传具体 model
        size: resolution,
        duration: duration,
        amount: strAmount,
      };

      const check1 = await bnbpaycheck(getToken(), body);
      // 如果后端说不用付钱（比如有免费额度），直接返回成功
      if (check1?.ok) {
        toast.dismiss();
        toast.success('无需支付，开始生成');
        return { success: true };
      }

      // 3. 检查余额
      toast.dismiss();
      toast.loading('检查钱包余额...');
      const balance = await getUSDTBalance(address);

      if (!(Number(strAmount) > 0)) throw new Error('支付金额不合法');
      if (Number(balance) < Number(strAmount)) throw new Error('USDT 余额不足');

      // 4. 发起交易
      toast.dismiss();
      toast.loading('请在钱包中确认交易...');
      const txResponse = await tranUsdt(strAmount, messageid);

      if (!txResponse?.hash) throw new Error('交易未发出或用户取消');

      // 5. 交易后校验 (Post-check)
      toast.dismiss();
      toast.loading('正在确认链上交易...');
      const check2 = await bnbpaycheck(getToken(), { ...body, hash: txResponse.hash });

      if (!check2?.ok) throw new Error('支付校验失败，请联系客服');

      toast.dismiss();
      toast.success('支付成功！');
      return { success: true, txHash: txResponse.hash };
    } catch (e: any) {
      toast.dismiss();
      toast.error(e.message || '支付失败');
      return { success: false, error: e.message };
    }
  };

  return { pay };
}
