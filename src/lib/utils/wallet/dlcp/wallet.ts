// DBC Chain local wallet management (create/import/decrypt)
import { ethers } from 'ethers';

const DBC_RPC_URL = 'https://rpc1.dbcwallet.io';
const DLCP_CONTRACT = '0x9b09b4B7a748079DAd5c280dCf66428e48E38Cd6';
const STORAGE_KEY = 'hpv_points_keystore';
const ADDR_KEY = 'hpv_points_address';

const ERC20_ABI = [
  { constant: true, inputs: [{ name: '_owner', type: 'address' }], name: 'balanceOf', outputs: [{ name: 'balance', type: 'uint256' }], type: 'function' },
  { constant: true, inputs: [], name: 'decimals', outputs: [{ name: '', type: 'uint8' }], type: 'function' },
];

function getProvider() {
  return new ethers.JsonRpcProvider(DBC_RPC_URL);
}

/** Create a new wallet with password, returns address */
export async function createPointsWallet(password: string): Promise<{ address: string }> {
  if (!password?.trim()) throw new Error('Password required');
  const wallet = ethers.Wallet.createRandom();
  const keystoreJson = await wallet.encrypt(password);
  const address = wallet.address.toLowerCase();
  localStorage.setItem(STORAGE_KEY, keystoreJson);
  localStorage.setItem(ADDR_KEY, address);
  return { address };
}

/** Import wallet by private key + password */
export async function importPointsWallet(privateKey: string, password: string): Promise<{ address: string }> {
  if (!password?.trim()) throw new Error('Password required');
  let pk = privateKey.trim();
  if (!pk.startsWith('0x')) pk = '0x' + pk;
  const wallet = new ethers.Wallet(pk);
  const keystoreJson = await wallet.encrypt(password);
  const address = wallet.address.toLowerCase();
  localStorage.setItem(STORAGE_KEY, keystoreJson);
  localStorage.setItem(ADDR_KEY, address);
  return { address };
}

/** Get stored wallet address */
export function getStoredAddress(): string | null {
  return localStorage.getItem(ADDR_KEY);
}

/** Check if points wallet exists */
export function hasPointsWallet(): boolean {
  return !!localStorage.getItem(STORAGE_KEY) && !!localStorage.getItem(ADDR_KEY);
}

/** Disconnect / clear points wallet */
export function clearPointsWallet() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(ADDR_KEY);
}

/** Get DLCP balance */
export async function getDLCPBalance(address: string): Promise<string> {
  if (!address) return '0';
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(DLCP_CONTRACT, ERC20_ABI, provider);
    const balance = await contract.balanceOf(address);
    const decimals = await contract.decimals();
    const readable = ethers.formatUnits(balance, decimals);
    return Math.floor(parseFloat(readable)).toString();
  } catch (error) {
    console.error('Get DLCP Balance Error:', error);
    return '0';
  }
}

/** Convert points to USDT equivalent (1000 pts = $1) */
export function pointsToUSDT(points: string | number): string {
  const p = typeof points === 'string' ? parseFloat(points) : points;
  return (p / 1000).toFixed(2);
}

// DeepLink buy points page URL
export const BUY_POINTS_URL = 'https://web.deeplinkgame.com/wallet';
