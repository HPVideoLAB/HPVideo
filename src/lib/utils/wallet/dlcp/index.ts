// DLCP Points balance on DBC Chain
import { ethers } from 'ethers';

// DBC Chain RPC
const DBC_RPC_URL = 'https://rpc1.dbcwallet.io';

// DLCP Token contract on DBC Chain
const DLCP_CONTRACT = '0x9b09b4B7a748079DAd5c280dCf66428e48E38Cd6';

const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
];

// DeepLink PayPal points purchase API
const DEEPLINK_API = 'https://nodeapi.deeplink.cloud';

/**
 * Get DLCP points balance for a wallet address
 * Points are on DBC Chain, queried via RPC
 */
export async function getDLCPBalance(address: string): Promise<string> {
  if (!address) return '0';
  try {
    const provider = new ethers.JsonRpcProvider(DBC_RPC_URL);
    const contract = new ethers.Contract(DLCP_CONTRACT, ERC20_ABI, provider);
    const balance = await contract.balanceOf(address);
    const decimals = await contract.decimals();
    const readable = ethers.formatUnits(balance, decimals);
    // Return integer points (no decimals)
    return Math.floor(parseFloat(readable)).toString();
  } catch (error) {
    console.error('Get DLCP Balance Error:', error);
    return '0';
  }
}

/**
 * Convert DLCP points to USDT equivalent
 * 1000 points = 1 USDT
 */
export function pointsToUSDT(points: string | number): string {
  const p = typeof points === 'string' ? parseFloat(points) : points;
  return (p / 1000).toFixed(2);
}

/**
 * Get PayPal purchase link for buying points
 */
export async function getPointsBuyLink(walletId: string, productId: string): Promise<string | null> {
  try {
    const response = await fetch(`${DEEPLINK_API}/api/paypal/getBuyLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: walletId, product_id: productId }),
    });
    const data = await response.json();
    if (data.success) {
      return data.data;
    }
    return null;
  } catch (error) {
    console.error('Get Points Buy Link Error:', error);
    return null;
  }
}

// Points purchase tiers
export const POINTS_TIERS = [
  { amount: '$5', points: '5,000', value: 5000, productId: 'prod_4MBe51eU6cvLcuzGHFjLZE' },
  { amount: '$10', points: '10,000', value: 10000, productId: 'prod_7D75iFxkbDWUhuCaSegMrP' },
  { amount: '$15', points: '15,000', value: 15000, productId: 'prod_4cHi1F6MB9HkHNByOp8PyX' },
  { amount: '$20', points: '20,000', value: 20000, productId: 'prod_2Qm2ApNRCwbpVWI0FIEbBl' },
  { amount: '$25', points: '25,000', value: 25000, productId: 'prod_6HoR1gM7mP5oDNVPr4aGLX' },
  { amount: '$30', points: '30,000', value: 30000, productId: 'prod_1ivlJfN9KxYeBcEhleawRY' },
  { amount: '$50', points: '50,000', value: 50000, productId: 'prod_5c5SdLP9TXQwVp554TtPaA' },
  { amount: '$100', points: '100,000', value: 100000, productId: 'prod_73r40YulOVpHo23N7HmnA0' },
];
