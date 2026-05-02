/**
 * Canvas DLCP charge — sign a single DBC-chain transfer for the whole
 * Run All, then verify with the backend so the run's paid bucket is
 * minted in Redis.
 *
 * Mirrors usePointsPayment but pays once for a multi-block run instead
 * of once per chat message.
 */
import { ethers } from 'ethers';
import { toast } from 'svelte-sonner';
import { getStoredAddress, getStoredPassword } from '$lib/utils/wallet/dlcp/wallet';
import { dlcpBalance } from '$lib/stores';
import { getDLCPBalance } from '$lib/utils/wallet/dlcp/wallet';
import { chargeRun } from './workspaceApi';

const DBC_RPC_URL = 'https://rpc1.dbcwallet.io';
const DLCP_CONTRACT = '0x9b09b4B7a748079DAd5c280dCf66428e48E38Cd6';
const DLCP_RECEIVE_ADDRESS = '0xeAc67D1B54730FF65D322aA21F2C3c8A8202Be0C';
const KEYSTORE_KEY = 'hpv_points_keystore';

const ERC20_ABI = [
	'function transfer(address to, uint256 amount) returns (bool)',
	'function balanceOf(address owner) view returns (uint256)'
];

/** Convert credits → DLCP wei. The convention (matching the existing
 *  chat-completion path / usePointsPayment.ts) is:
 *      1 USDT = 1000 DLCP whole tokens
 *      1 cr   = 1 DLCP whole token = $0.001
 *  So 1500 cr → 1500 DLCP → $1.50, and the on-chain transfer is
 *  parseEther("1500") = 1500 × 10^18 wei. */
function creditsToWei(credits: number): bigint {
	return ethers.parseEther(String(credits));
}

export type ChargeResult = {
	success: boolean;
	txHash?: string;
	error?: string;
};

export type ChargeArgs = {
	runId: string;
	totalCostCr: number;
	t: (key: string, vars?: Record<string, any>) => string;
};

/** Run the DLCP transfer + backend verification for one Run All. */
export async function chargeForRun({ runId, totalCostCr, t }: ChargeArgs): Promise<ChargeResult> {
	if (totalCostCr <= 0) {
		// Free run (e.g. all prompt + imageref blocks). Skip the wallet step.
		return { success: true };
	}

	try {
		const address = getStoredAddress();
		if (!address) {
			throw new Error(t('Please create or import a points wallet first'));
		}
		const keystoreJson = localStorage.getItem(KEYSTORE_KEY);
		if (!keystoreJson) {
			throw new Error(t('Wallet keystore not found'));
		}

		toast.dismiss();
		toast.loading(t('Checking points balance...'));

		const provider = new ethers.JsonRpcProvider(DBC_RPC_URL);
		const readonly = new ethers.Contract(DLCP_CONTRACT, ERC20_ABI, provider);
		const balance: bigint = await readonly.balanceOf(address);
		const pointsWei = creditsToWei(totalCostCr);
		if (balance < pointsWei) {
			const balPts = Math.floor(parseFloat(ethers.formatEther(balance)));
			throw new Error(
				`${t('Insufficient points')} (${t('Have')}: ${balPts}, ${t('Need')}: ${totalCostCr})`
			);
		}

		// Decrypt the keystore. Auto-password works for new one-click wallets;
		// older wallets may need a manual prompt.
		const stashed = getStoredPassword();
		let wallet: ethers.Wallet | null = null;
		if (stashed) {
			toast.loading(t('Signing transaction...'));
			try {
				wallet = (await ethers.Wallet.fromEncryptedJson(keystoreJson, stashed)) as ethers.Wallet;
			} catch {
				wallet = null;
			}
		}
		if (!wallet) {
			const pw = prompt(t('Enter your points wallet password to confirm payment:'));
			if (!pw) throw new Error(t('Payment canceled'));
			toast.loading(t('Signing transaction...'));
			try {
				wallet = (await ethers.Wallet.fromEncryptedJson(keystoreJson, pw)) as ethers.Wallet;
			} catch {
				throw new Error(t('Incorrect password'));
			}
		}
		const signer = wallet.connect(provider);
		const writeContract = new ethers.Contract(DLCP_CONTRACT, ERC20_ABI, signer);

		toast.dismiss();
		toast.loading(t('Sending DLP payment...'));

		const tx = await writeContract.transfer(DLCP_RECEIVE_ADDRESS, pointsWei);
		const receipt = await tx.wait();
		if (!receipt || receipt.status !== 1) {
			throw new Error(t('Transaction failed'));
		}

		// Verify with backend (mints Redis paid flag for runId).
		toast.dismiss();
		toast.loading(t('Verifying payment...'));
		// 1 cr = 1 DLCP whole token (matches the existing chat-completion
		// path: usdtToPoints(amount) × 10^18 wei → amount × 1000 DLCP).
		const dlcpAmount = String(totalCostCr);
		const verify = await chargeRun({
			run_id: runId,
			hash: receipt.hash,
			address,
			amount: dlcpAmount
		});
		if (!verify.ok) {
			toast.dismiss();
			toast.warning(t('Payment broadcast but verification slow, retrying once...'));
			// Single retry — DBC RPC sometimes lags 1-2 blocks behind.
			await new Promise((r) => setTimeout(r, 3000));
			const v2 = await chargeRun({
				run_id: runId,
				hash: receipt.hash,
				address,
				amount: dlcpAmount
			});
			if (!v2.ok) {
				throw new Error(v2.message || t('Backend payment verification failed'));
			}
		}

		try {
			const newBal = await getDLCPBalance(address);
			dlcpBalance.set(newBal);
		} catch {}

		toast.dismiss();
		toast.success(t('Payment confirmed. Starting generation...'));
		return { success: true, txHash: receipt.hash };
	} catch (e: any) {
		console.error('Canvas charge error:', e);
		toast.dismiss();
		const msg = e?.message || t('Payment failed');
		if (msg.includes('canceled') || msg.includes('取消')) {
			toast.info(t('Payment canceled'));
		} else {
			toast.error(msg);
		}
		return { success: false, error: msg };
	}
}
