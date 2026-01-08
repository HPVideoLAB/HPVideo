import { signMessage } from '@wagmi/core';
import { defaultWagmiConfig } from '@web3modal/wagmi';
import { base } from 'viem/chains';
import { createWeb3Modal } from '@web3modal/wagmi';
import { http } from 'viem'; // 👈 必须引入这个，千万别漏了

// 1. Define constants
export const projectId = '59443aa943b8865491317c04a19a8be3';

// 2. Create wagmiConfig
const metadata = {
  name: 'HPVideo',
  description: 'HPVideo Base Payment',
  url: 'https://hpvideo.io',
  icons: ['https://avatars.githubusercontent.com/u/37784886'],
};

const chains: any = [base];

export const config = defaultWagmiConfig({
  projectId,
  chains,
  metadata,
  // 👇👇👇 关键修复：强制使用 Base 官方高速节点，解决卡顿和404 👇👇👇
  transports: {
    [base.id]: http('https://mainnet.base.org'),
  },
});

export const walletconnectSignMessage = async (message: string) => {
  try {
    const signature = await signMessage(config, { message });
    return signature;
  } catch (error) {
    console.error('Sign message error:', error);
    // 建议这里返回 null，而不是把原消息返回去，方便前端判断失败
    return null;
  }
};

export let modal = createWeb3Modal({
  themeMode: 'dark',
  wagmiConfig: config,
  projectId,
  // 👇 关掉这些提升速度
  enableAnalytics: false,
  enableOnramp: false,
});

// 下面这些 EIP-712 配置保持不变
export const domain = {
  name: 'USD Coin',
  version: '2',
  chainId: 8453,
  verifyingContract: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' as `0x${string}`,
};

export const types = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
};
