// Points payment hook — DLCP transfer on DBC Chain
import { pointpaycheck } from '$lib/apis/pay';
import { toast } from 'svelte-sonner';
import { v4 as uuidv4 } from 'uuid';
import { getContext } from 'svelte';
import { get } from 'svelte/store';
import { ethers } from 'ethers';
import { dlcpBalance } from '$lib/stores';
import { getStoredAddress, getDLCPBalance } from '$lib/utils/wallet/dlcp/wallet';

const DBC_RPC_URL = 'https://rpc1.dbcwallet.io';
const DLCP_CONTRACT = '0x9b09b4B7a748079DAd5c280dCf66428e48E38Cd6';
const DLCP_RECEIVE_ADDRESS = '0xeAc67D1B54730FF65D322aA21F2C3c8A8202Be0C';
const STORAGE_KEY = 'hpv_points_keystore';

// 1 USDT = 1000 points, DLCP has 18 decimals
function usdtToPoints(usdtAmount: number): bigint {
  const points = usdtAmount * 1000;
  return ethers.parseEther(String(points));
}

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
];

export function usePointsPayment() {
  const i18n = getContext<any>('i18n');
  const t = (key: string) => get(i18n).t(key);

  const getToken = () => localStorage.getItem('token') || localStorage.getItem('access_token') || '';
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const pay = async (args: {
    amount?: number;
    model: string;
    resolution?: string;
    duration?: number;
  }): Promise<{ success: boolean; txHash?: string; error?: string }> => {
    const { amount = 0, model, resolution = '720p', duration = 5 } = args;

    try {
      const address = getStoredAddress();
      if (!address) {
        throw new Error(t('Please create or import a points wallet first'));
      }

      const keystoreJson = localStorage.getItem(STORAGE_KEY);
      if (!keystoreJson) {
        throw new Error(t('Wallet keystore not found'));
      }

      const messageid = uuidv4();
      const pointsAmount = (amount * 1000).toString(); // Convert USDT to points for display

      // Phase 1: Create payment record
      toast.dismiss();
      toast.loading(t('Creating order...'));

      const body = {
        hash: '',
        address,
        messageid,
        model,
        size: resolution,
        duration,
        amount: pointsAmount,
      };

      const check1 = await pointpaycheck(getToken(), body);
      if (check1?.ok) {
        toast.dismiss();
        toast.success(t('No payment required, starting generation'));
        return { success: true };
      }

      // Phase 2: Check DLCP balance
      toast.dismiss();
      toast.loading(t('Checking points balance...'));

      const provider = new ethers.JsonRpcProvider(DBC_RPC_URL);
      const contract = new ethers.Contract(DLCP_CONTRACT, ERC20_ABI, provider);
      const balance = await contract.balanceOf(address);
      const pointsWei = usdtToPoints(amount);

      if (balance < pointsWei) {
        const balPts = Math.floor(parseFloat(ethers.formatEther(balance)));
        const needPts = Math.ceil(amount * 1000);
        throw new Error(`${t('Insufficient points')} (${t('Have')}: ${balPts}, ${t('Need')}: ${needPts})`);
      }

      // Phase 3: Decrypt wallet and send DLCP transfer
      toast.dismiss();
      toast.loading(t('Enter your wallet password to confirm payment'));

      // Get password from user
      const password = prompt(t('Enter your points wallet password to confirm payment:'));
      if (!password) {
        throw new Error(t('Payment canceled'));
      }

      toast.dismiss();
      toast.loading(t('Signing transaction...'));

      let wallet: ethers.Wallet;
      try {
        wallet = (await ethers.Wallet.fromEncryptedJson(keystoreJson, password)) as ethers.Wallet;
      } catch (e) {
        throw new Error(t('Incorrect password'));
      }

      const signer = wallet.connect(provider);
      const tokenContract = new ethers.Contract(DLCP_CONTRACT, ERC20_ABI, signer);

      toast.dismiss();
      toast.loading(t('Sending points payment...'));

      const tx = await tokenContract.transfer(DLCP_RECEIVE_ADDRESS, pointsWei);
      const receipt = await tx.wait();

      if (!receipt || receipt.status !== 1) {
        throw new Error(t('Transaction failed'));
      }

      // Phase 4: Verify payment with backend
      toast.dismiss();
      toast.loading(t('Verifying payment...'));

      const maxRetries = 10;
      let verified = false;

      for (let i = 0; i < maxRetries; i++) {
        try {
          const check2 = await pointpaycheck(getToken(), { ...body, hash: receipt.hash });
          if (check2?.ok) {
            verified = true;
            break;
          }
        } catch (e) {
          console.log(`Polling verify ${i + 1}/${maxRetries}`);
        }
        await wait(2000);
      }

      // Refresh balance
      try {
        const newBal = await getDLCPBalance(address);
        dlcpBalance.set(newBal);
      } catch (e) {}

      if (!verified) {
        toast.dismiss();
        toast.warning(t('Payment sent, syncing system, please refresh later'));
        return { success: true, txHash: receipt.hash };
      }

      toast.dismiss();
      toast.success(t('Points payment successful!'));
      return { success: true, txHash: receipt.hash };
    } catch (e: any) {
      console.error('Points Payment Error:', e);
      toast.dismiss();

      let msg = e.message || t('Payment failed');
      if (msg.includes('canceled') || msg.includes('取消')) {
        toast.info(t('Payment canceled'));
      } else {
        toast.error(msg);
      }

      return { success: false, error: msg };
    }
  };

  return { pay };
}
