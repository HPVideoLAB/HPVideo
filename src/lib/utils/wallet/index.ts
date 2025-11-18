import { signMessage } from "@wagmi/core";
import { defaultWagmiConfig } from "@web3modal/wagmi";
import { base } from 'viem/chains'
import { createWeb3Modal } from "@web3modal/wagmi";

// 1. Define constants
export const projectId = "59443aa943b8865491317c04a19a8be3";

// 2. Create wagmiConfig
const metadata = {
  name: "HPVideo",
  description: "Web3Modal Example",
  url: "https://web3modal.com",
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
};

const chains: any = [ base ];

export const config = defaultWagmiConfig({
  projectId,
  chains,
  metadata
});

export const walletconnectSignMessage = async (message: string) => {
  try {
    // const message = "This is a demo message.";
    const signature = await signMessage(config, { message });
    return signature;
  } catch (error) {
    return message;
  }
};

export let modal = createWeb3Modal({
  themeMode: "dark",
  wagmiConfig: config,
  projectId,
  enableAnalytics: true,
  enableOnramp: true,
});

export const domain = {
  name: "USD Coin",
  version: "2",
  chainId: 8453, // 对应你的链 ID
  verifyingContract: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913" as `0x${string}`,
};

export const types = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" }
  ]
};