// src/hooks/usePayment.ts
import { getAccount } from '@wagmi/core';
// 👇 确保引入了 getBNBBalance
import { config as wconfig, modal, getUSDTBalance, getBNBBalance, tranUsdt } from '$lib/utils/wallet/bnb/index';
import { bnbpaycheck } from '$lib/apis/pay';
import { toast } from 'svelte-sonner';
import { v4 as uuidv4 } from 'uuid';

export function usePayment() {
  const getToken = () => localStorage.getItem('token') || localStorage.getItem('access_token') || '';

  // 辅助函数：等待
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // 核心支付函数
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
        throw new Error('请先连接钱包');
      }

      const address = account.address;
      const strAmount = amount.toString();
      const messageid = uuidv4();

      // 2. 预检 (Pre-check) - 看看是否已经付过，或者免单
      toast.dismiss();
      toast.loading('创建订单中...');

      const body = {
        hash: '',
        address,
        messageid,
        model: model, // 建议透传真实 model
        size: resolution,
        duration: duration,
        amount: strAmount,
      };

      const check1 = await bnbpaycheck(getToken(), body);
      if (check1?.ok) {
        toast.dismiss();
        toast.success('无需支付，开始生成');
        return { success: true };
      }

      // 3. 检查余额 (USDT 和 BNB)
      toast.dismiss();
      toast.loading('检查钱包余额...');

      // 🔥 [关键修复]：先检查 Gas 费 (BNB)
      const bnbBalance = await getBNBBalance(address);
      if (bnbBalance < 0.002) {
        // 预留 0.002 BNB 作为 Gas
        throw new Error('BNB 余额不足，无法支付 Gas 费');
      }

      // 再检查 USDT
      const usdtBalance = await getUSDTBalance(address);
      if (!(Number(strAmount) > 0)) throw new Error('支付金额不合法');
      if (Number(usdtBalance) < Number(strAmount)) throw new Error(`USDT 余额不足 (当前: ${usdtBalance})`);

      // 4. 发起交易
      toast.dismiss();
      toast.loading('请在钱包中确认支付...');

      let txResponse;
      try {
        txResponse = await tranUsdt(strAmount, messageid);
      } catch (err: any) {
        // 捕获 tranUsdt 内部抛出的错误（如用户取消）
        if (err?.code === 4001 || err?.message?.includes('rejected')) {
          throw new Error('用户取消了支付');
        }
        throw err;
      }

      // 如果 tranUsdt 返回 null 但没抛错（兼容旧逻辑）
      if (!txResponse?.hash) {
        throw new Error('支付未完成：用户取消或网络异常');
      }

      // 5. 交易后轮询校验 (Post-check Polling)
      // 🔥 [关键修复]：不要只查一次，网络有延迟，轮询 5 次
      toast.dismiss();
      toast.loading('正在确认链上交易(请勿关闭)...');

      const maxRetries = 10; // 最多轮询 10 次 (约 20-30秒)
      let verified = false;
      let errorMsg = '';

      for (let i = 0; i < maxRetries; i++) {
        try {
          const check2 = await bnbpaycheck(getToken(), { ...body, hash: txResponse.hash });
          if (check2?.ok) {
            verified = true;
            break; // 成功，跳出循环
          }
        } catch (e) {
          console.log(`Polling verify failed ${i + 1}/${maxRetries}`);
        }
        // 等待 2 秒再重试
        await wait(2000);
      }

      if (!verified) {
        // 虽然链上发了，但后端没同步到。
        // 这里可以根据业务决定是报错，还是提示用户"稍后刷新"
        // 为了稳妥，这里算作"支付存疑"，但通常前端可以放行或者提示人工
        console.warn('Payment sent but backend verify timeout', txResponse.hash);
        // throw new Error('链上支付已发出，但后端同步超时，请稍后在历史记录查看');

        // 策略B：如果后端没确认，但只要 Hash 存在，可以先提示成功，让用户手动刷新
        toast.dismiss();
        toast.warning('支付已上链，系统正在同步中，请稍后刷新');
        return { success: true, txHash: txResponse.hash };
      }

      toast.dismiss();
      toast.success('支付成功！');
      return { success: true, txHash: txResponse.hash };
    } catch (e: any) {
      console.error('Payment Hook Error:', e);
      toast.dismiss();

      // 优化错误提示文案
      let msg = e.message || '支付失败';
      if (msg.includes('rejected') || msg.includes('取消')) {
        toast.info('已取消支付');
      } else {
        toast.error(msg);
      }

      return { success: false, error: msg };
    }
  };

  return { pay };
}
