// DBC Chain local wallet management (create/import/decrypt)
import { ethers } from 'ethers';

const DBC_RPC_URL = 'https://rpc1.dbcwallet.io';
const DLCP_CONTRACT = '0x9b09b4B7a748079DAd5c280dCf66428e48E38Cd6';
const STORAGE_KEY = 'hpv_points_keystore';
const ADDR_KEY = 'hpv_points_address';
// Auto-generated keystore password for passwordless onboarding. When
// the user opts for one-click create (no password), we generate a
// strong random password and stash it locally so the rest of the app
// can decrypt without prompting. Trade-off: clearing localStorage =
// losing the wallet, same risk model as Privy embedded wallets.
const PASS_KEY = 'hpv_points_pass';

function strongRandomHex(byteLen = 32): string {
  const bytes = new Uint8Array(byteLen);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const ERC20_ABI = [
  { constant: true, inputs: [{ name: '_owner', type: 'address' }], name: 'balanceOf', outputs: [{ name: 'balance', type: 'uint256' }], type: 'function' },
  { constant: true, inputs: [], name: 'decimals', outputs: [{ name: '', type: 'uint8' }], type: 'function' },
];

function getProvider() {
  return new ethers.JsonRpcProvider(DBC_RPC_URL);
}

/**
 * Create a new wallet. Password is optional — if not provided we
 * auto-generate a strong random one and stash it in localStorage so
 * the user gets a true one-click experience. The plaintext private
 * key is also returned (once) so the modal can offer a backup-now
 * reveal step.
 */
export async function createPointsWallet(
  password?: string,
): Promise<{ address: string; privateKey: string; passwordless: boolean }> {
  const passwordless = !password?.trim();
  const pwd = passwordless ? strongRandomHex(32) : password!;
  const wallet = ethers.Wallet.createRandom();
  const keystoreJson = await wallet.encrypt(pwd);
  const address = wallet.address.toLowerCase();
  const privateKey = wallet.privateKey;
  localStorage.setItem(STORAGE_KEY, keystoreJson);
  localStorage.setItem(ADDR_KEY, address);
  if (passwordless) {
    localStorage.setItem(PASS_KEY, pwd);
  } else {
    // If the user explicitly chose a password, drop any prior auto-pwd.
    localStorage.removeItem(PASS_KEY);
  }
  return { address, privateKey, passwordless };
}

/**
 * Import wallet by private key. Password is optional — when omitted
 * we auto-generate one (same behavior as createPointsWallet).
 */
export async function importPointsWallet(
  privateKey: string,
  password?: string,
): Promise<{ address: string; passwordless: boolean }> {
  let pk = privateKey.trim();
  if (!pk.startsWith('0x')) pk = '0x' + pk;
  const wallet = new ethers.Wallet(pk);
  const passwordless = !password?.trim();
  const pwd = passwordless ? strongRandomHex(32) : password!;
  const keystoreJson = await wallet.encrypt(pwd);
  const address = wallet.address.toLowerCase();
  localStorage.setItem(STORAGE_KEY, keystoreJson);
  localStorage.setItem(ADDR_KEY, address);
  if (passwordless) {
    localStorage.setItem(PASS_KEY, pwd);
  } else {
    localStorage.removeItem(PASS_KEY);
  }
  return { address, passwordless };
}

/**
 * Returns the stored auto-password (if any). Callers that need to
 * decrypt the keystore without prompting use this.
 */
export function getStoredPassword(): string | null {
  return localStorage.getItem(PASS_KEY);
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
  localStorage.removeItem(PASS_KEY);
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

const DEEPLINK_API = 'https://nodeapi.deeplink.cloud';

/** Get wallet ID from DeepLink server (needed for buy points URL) */
export async function getWalletId(walletAddress: string): Promise<string | null> {
  try {
    const response = await fetch(`${DEEPLINK_API}/api/point/getWalletID`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: walletAddress }),
    });
    const data = await response.json();
    if (data.success) {
      return data.data;
    }
    return null;
  } catch (error) {
    console.error('Get Wallet ID Error:', error);
    return null;
  }
}

/** Get buy points URL with wallet ID */
export async function getBuyPointsURL(walletAddress: string): Promise<string> {
  const id = await getWalletId(walletAddress);
  if (id) {
    return `https://deeplinkgame.com/pricing.html?id=${id}`;
  }
  // Fallback
  return 'https://deeplinkgame.com/pricing.html';
}
