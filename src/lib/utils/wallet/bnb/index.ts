import { defaultWagmiConfig } from '@web3modal/wagmi';
import { bsc } from 'viem/chains';
import { createWeb3Modal } from '@web3modal/wagmi';
import { getAccount } from '@wagmi/core';
import { ethers } from 'ethers';
import { http } from 'viem'; // 👈 必须引入这个

// 1. Define constants
export const projectId = '59443aa943b8865491317c04a19a8be3';

// 2. Create wagmiConfig
const metadata = {
  name: 'HPVideo',
  description: 'BNB Chain USDT Payment',
  url: 'https://hpvideo.io',
  icons: ['https://avatars.githubusercontent.com/u/37784886'],
};

const chains: any = [bsc];

export const config = defaultWagmiConfig({
  projectId,
  chains,
  metadata,
  // 👇👇👇 核心修复：强制使用 BSC 官方高速 RPC，解决 404 和连接慢的问题
  transports: {
    [bsc.id]: http('https://bsc-dataseed.binance.org/'),
  },
});

export let modal = createWeb3Modal({
  themeMode: 'dark',
  wagmiConfig: config,
  projectId,
  // 👇 关闭分析和买币功能，减少后台请求
  enableAnalytics: false,
  enableOnramp: false,
});

const USDT_CONTRACT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';
// USDT_TRAN_ADDRESS
const USDT_TRAN_ADDRESS = '0x3011aef25585d026BfA3d3c3Fb4323f4b0eF3Eaa';

// usdt contract
export const USDT_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: 'success', type: 'bool' }],
    type: 'function',
  },
];

// 🚀 新增：获取 BNB 余额 (用于前端检查 Gas 费)
export async function getBNBBalance(address: string) {
  if (!address) return 0;
  try {
    const account = getAccount(config);
    const provider: any = await account?.connector?.getProvider();
    if (!provider) return 0;

    let eprovider = new ethers.BrowserProvider(provider);
    const balance = await eprovider.getBalance(address);
    // BNB 也是 18 位精度
    const readableBalance = ethers.formatUnits(balance, 18);
    return parseFloat(readableBalance);
  } catch (error) {
    console.error('Get BNB Balance Error：', error);
    return 0;
  }
}

// Get USDT balance
export async function getUSDTBalance(address: string) {
  if (!address) return 0;
  try {
    const account = getAccount(config);
    const provider: any = await account?.connector?.getProvider();
    if (!provider) return 0; // 判空保护

    let eprovider = new ethers.BrowserProvider(provider);
    // const network = await eprovider.getNetwork(); // 这行没用，注释掉提速
    const usdtContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, eprovider);
    const balance = await usdtContract.balanceOf(address);
    const readableBalance = ethers.formatUnits(balance, 18);
    return parseFloat(readableBalance);
  } catch (error) {
    console.error('Get USDT Balance Error：', error);
    return 0;
  }
}

// tran usdt
export async function tranUsdt(amount: string, messageid: string) {
  try {
    const account = getAccount(config);
    const provider: any = await account?.connector?.getProvider();
    let eprovider = new ethers.BrowserProvider(provider);
    await eprovider.send('eth_requestAccounts', []);
    let signer = await eprovider.getSigner();
    const usdtContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, signer);

    // 确保 amount 转换为 string 避免精度问题
    const amountWei = ethers.parseUnits(amount.toString(), 18);
    const txResponse = await usdtContract.transfer(USDT_TRAN_ADDRESS, amountWei);
    return txResponse;
  } catch (error) {
    console.error('tran error：', error);
    // 抛出错误让前端知道是用户拒绝还是其他错误，而不是返回 null
    throw error;
  }
}

export function clearConnector() {
  // 增加可选链保护
  config?.state?.connections?.forEach((item) => {
    config.state.connections.delete(item.connector.uid);
  });
  localStorage.removeItem('token');
}
