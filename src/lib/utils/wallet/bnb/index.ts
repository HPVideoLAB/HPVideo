import { defaultWagmiConfig } from "@web3modal/wagmi";
import { bsc } from 'viem/chains'
import { createWeb3Modal } from "@web3modal/wagmi";
import { getAccount } from "@wagmi/core";
import { ethers } from "ethers";

// 1. Define constants
export const projectId = "59443aa943b8865491317c04a19a8be3";

// 2. Create wagmiConfig
const metadata = {
  name: "HPVideo",
  description: "BNB Chain USDT Payment",
  url: "http://www.hpvideo.ai",
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
};

const chains: any = [ bsc ];

export const config = defaultWagmiConfig({
  projectId,
  chains,
  metadata
});

export let modal = createWeb3Modal({
  themeMode: "dark",
  wagmiConfig: config,
  projectId,
  enableAnalytics: true,
  enableOnramp: true,
});

export const USDT_CONTRACT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';
export const USDT_TRAN_ADDRESS='0x8b0b8c7f984dd3f2b580149ade3cdab504d3af1f';

// usdt contract
export const USDT_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function'
  },
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: 'success', type: 'bool' }],
    type: 'function'
  }
];

// Get USDT balance
export async function getUSDTBalance(address: string) {
  if (!address) return 0;
  try {
    const account = getAccount(config);
    const provider: any = await account?.connector?.getProvider();
    let eprovider = new ethers.BrowserProvider(provider);
    const network = await eprovider.getNetwork();
    const usdtContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, eprovider);
    const balance = await usdtContract.balanceOf(address);
    const readableBalance = ethers.formatUnits(balance, 18);
    return parseFloat(readableBalance);
  } catch (error) {
    console.error("Get USDT Balance Error：", error);
    return 0;
  }
}

// tran usdt
export async function tranUsdt(amount: string) {
  try {
    const account = getAccount(config);
    const provider: any = await account?.connector?.getProvider();
    let eprovider = new ethers.BrowserProvider(provider);
    await eprovider.send('eth_requestAccounts', []);
    let signer = await eprovider.getSigner();
    const usdtContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, signer);
    const decimal = 6;
    const amountWei = ethers.parseUnits(amount, decimal);
    const txResponse = await usdtContract.transfer(USDT_TRAN_ADDRESS, amountWei);
    return txResponse;
  } catch (error) {
    console.error("tran error：", error);
    return null;
  }
}