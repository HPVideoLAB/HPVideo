<script lang="ts">
  import { createEventDispatcher, getContext } from 'svelte';
  import { dlcpBalance } from '$lib/stores';
  import {
    createPointsWallet,
    importPointsWallet,
    getStoredAddress,
    getDLCPBalance,
    pointsToUSDT,
    clearPointsWallet,
    getBuyPointsURL,
  } from '$lib/utils/wallet/dlcp/wallet';
  import { toast } from 'svelte-sonner';

  const dispatch = createEventDispatcher();
  const i18n: any = getContext('i18n');

  export let show = false;

  // States: 'entry' | 'create' | 'import' | 'connected'
  let step = 'entry';
  let password = '';
  let privateKey = '';
  let loading = false;
  let balanceLoading = false;
  let connectedAddress = '';
  let showBuyPanel = false;

  // Check if already has wallet
  $: if (show) {
    const addr = getStoredAddress();
    if (addr) {
      connectedAddress = addr;
      step = 'connected';
      refreshBalance();
    } else {
      step = 'entry';
    }
  }

  async function handleCreate() {
    if (!password.trim()) return;
    loading = true;
    try {
      const { address } = await createPointsWallet(password);
      connectedAddress = address;
      step = 'connected';
      toast.success($i18n.t('Wallet created successfully'));
      await refreshBalance();
      dispatch('connected', address);
    } catch (e: any) {
      toast.error(e.message || 'Failed to create wallet');
    }
    loading = false;
  }

  async function handleImport() {
    if (!privateKey.trim() || !password.trim()) return;
    loading = true;
    try {
      const { address } = await importPointsWallet(privateKey, password);
      connectedAddress = address;
      step = 'connected';
      toast.success($i18n.t('Wallet imported successfully'));
      await refreshBalance();
      dispatch('connected', address);
    } catch (e: any) {
      toast.error(e.message || 'Failed to import wallet');
    }
    loading = false;
    privateKey = '';
  }

  async function refreshBalance() {
    if (!connectedAddress) return;
    balanceLoading = true;
    try {
      const bal = await getDLCPBalance(connectedAddress);
      dlcpBalance.set(bal);
    } catch (e) {
      console.error(e);
    }
    balanceLoading = false;
  }

  function handleDisconnect() {
    clearPointsWallet();
    connectedAddress = '';
    dlcpBalance.set('0');
    step = 'entry';
    password = '';
    dispatch('disconnected');
  }

  let buyLoading = false;
  async function handleBuyPoints() {
    buyLoading = true;
    try {
      const url = await getBuyPointsURL(connectedAddress);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast.error('Failed to get payment link');
    }
    buyLoading = false;
  }

  function close() {
    show = false;
    password = '';
    privateKey = '';
  }
</script>

{#if show}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm" on:click|self={close}>
    <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-[420px] max-w-[92vw] overflow-hidden border border-gray-200 dark:border-gray-700">

      {#if step === 'entry'}
        <!-- Entry: Choose create or import -->
        <div class="px-6 py-5">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <iconify-icon icon="mdi:star-circle" class="text-2xl text-amber-500"></iconify-icon>
            </div>
            <div>
              <h3 class="text-lg font-bold text-gray-900 dark:text-white">{$i18n.t('Points Wallet')}</h3>
              <p class="text-xs text-gray-500">{$i18n.t('Create or import a wallet to use DLCP points')}</p>
            </div>
          </div>

          <div class="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl p-3 mb-5 text-sm text-amber-700 dark:text-amber-400">
            <p class="font-medium mb-1">{$i18n.t('How it works')}:</p>
            <p class="text-xs opacity-80">{$i18n.t('Your points wallet is on DBC Chain. Buy DLCP points to pay for AI video generation. 1000 points = $1 USD.')}</p>
          </div>

          <div class="flex flex-col gap-3">
            <button
              class="w-full py-3 rounded-xl font-semibold text-white primaryButton transition hover:opacity-90"
              on:click={() => { step = 'create'; }}
            >
              <iconify-icon icon="mdi:plus-circle-outline" class="mr-1.5 align-middle text-lg"></iconify-icon>
              {$i18n.t('Create New Wallet')}
            </button>
            <button
              class="w-full py-3 rounded-xl font-semibold border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 transition hover:border-primary-500"
              on:click={() => { step = 'import'; }}
            >
              <iconify-icon icon="mdi:key-variant" class="mr-1.5 align-middle text-lg"></iconify-icon>
              {$i18n.t('Import by Private Key')}
            </button>
          </div>
        </div>

      {:else if step === 'create'}
        <!-- Create wallet -->
        <div class="px-6 py-5">
          <button class="text-sm text-gray-400 hover:text-gray-600 mb-3 flex items-center gap-1" on:click={() => { step = 'entry'; password = ''; }}>
            <iconify-icon icon="mdi:arrow-left" class="text-base"></iconify-icon> {$i18n.t('Back')}
          </button>
          <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-1">{$i18n.t('Create Points Wallet')}</h3>
          <p class="text-xs text-amber-600 dark:text-amber-400 mb-4">{$i18n.t('Set a password to encrypt your wallet. Keep it safe!')}</p>

          <label class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{$i18n.t('Password')}</label>
          <input
            type="password"
            bind:value={password}
            placeholder={$i18n.t('Enter a secure password')}
            class="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-primary-500 mb-4"
            on:keydown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          />

          <button
            class="w-full py-3 rounded-xl font-semibold text-white primaryButton transition hover:opacity-90 disabled:opacity-50"
            disabled={!password.trim() || loading}
            on:click={handleCreate}
          >
            {#if loading}
              <iconify-icon icon="mdi:loading" class="animate-spin mr-1.5 align-middle"></iconify-icon>
              {$i18n.t('Creating...')}
            {:else}
              {$i18n.t('Create Wallet')}
            {/if}
          </button>
        </div>

      {:else if step === 'import'}
        <!-- Import wallet -->
        <div class="px-6 py-5">
          <button class="text-sm text-gray-400 hover:text-gray-600 mb-3 flex items-center gap-1" on:click={() => { step = 'entry'; password = ''; privateKey = ''; }}>
            <iconify-icon icon="mdi:arrow-left" class="text-base"></iconify-icon> {$i18n.t('Back')}
          </button>
          <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-1">{$i18n.t('Import Points Wallet')}</h3>
          <p class="text-xs text-amber-600 dark:text-amber-400 mb-4">{$i18n.t('Import your existing DeepLink wallet by private key')}</p>

          <label class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{$i18n.t('Private Key')}</label>
          <input
            type="password"
            bind:value={privateKey}
            placeholder={$i18n.t('Enter your private key')}
            class="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-primary-500 mb-3"
          />

          <label class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{$i18n.t('Password')}</label>
          <input
            type="password"
            bind:value={password}
            placeholder={$i18n.t('Set a password for encryption')}
            class="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-primary-500 mb-4"
            on:keydown={(e) => { if (e.key === 'Enter') handleImport(); }}
          />

          <button
            class="w-full py-3 rounded-xl font-semibold text-white primaryButton transition hover:opacity-90 disabled:opacity-50"
            disabled={!privateKey.trim() || !password.trim() || loading}
            on:click={handleImport}
          >
            {#if loading}
              <iconify-icon icon="mdi:loading" class="animate-spin mr-1.5 align-middle"></iconify-icon>
              {$i18n.t('Importing...')}
            {:else}
              {$i18n.t('Import Wallet')}
            {/if}
          </button>
        </div>

      {:else if step === 'connected'}
        <!-- Connected: Show balance -->
        <div class="px-6 py-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold text-gray-900 dark:text-white">{$i18n.t('Points Wallet')}</h3>
            <button class="text-xs text-gray-400 hover:text-red-500 transition" on:click={close}>
              <iconify-icon icon="mdi:close" class="text-lg"></iconify-icon>
            </button>
          </div>

          <!-- Address -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-3 flex items-center gap-2">
            <iconify-icon icon="mdi:wallet" class="text-primary-500 text-lg"></iconify-icon>
            <span class="text-sm font-mono text-gray-600 dark:text-gray-300 truncate">{connectedAddress}</span>
          </div>

          <!-- Balance -->
          <div class="bg-gradient-to-r from-amber-500/10 to-purple-500/10 border border-amber-500/20 rounded-xl p-4 mb-3">
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-center gap-2">
                <iconify-icon icon="mdi:star-circle" class="text-amber-500 text-xl"></iconify-icon>
                <span class="text-sm font-medium text-gray-700 dark:text-gray-200">DLCP {$i18n.t('Points')}</span>
              </div>
              <button class="text-gray-400 hover:text-primary-500 transition" on:click={refreshBalance}>
                <iconify-icon icon="mdi:refresh" class="text-base {balanceLoading ? 'animate-spin' : ''}"></iconify-icon>
              </button>
            </div>
            <div class="flex items-end justify-between">
              <div>
                <span class="text-3xl font-bold text-gray-900 dark:text-white font-mono">
                  {balanceLoading ? '...' : parseInt($dlcpBalance).toLocaleString()}
                </span>
                <span class="text-sm text-gray-400 ml-1">pts</span>
              </div>
              <div class="text-sm text-gray-400">
                ≈ ${pointsToUSDT($dlcpBalance)}
              </div>
            </div>
          </div>

          <!-- Buy Points Button -->
          <button
            class="w-full py-3 rounded-xl font-semibold text-white primaryButton transition hover:opacity-90 mb-2 disabled:opacity-50"
            on:click={handleBuyPoints}
            disabled={buyLoading}
          >
            {#if buyLoading}
              <iconify-icon icon="mdi:loading" class="animate-spin mr-1.5 align-middle text-lg"></iconify-icon>
              {$i18n.t('Loading...')}
            {:else}
              <iconify-icon icon="mdi:cart-plus" class="mr-1.5 align-middle text-lg"></iconify-icon>
              {$i18n.t('Buy Points')}
            {/if}
          </button>
          <p class="text-xs text-center text-gray-400 mb-3">{$i18n.t('Opens DeepLink payment page (PayPal / Crypto)')}</p>

          <!-- Disconnect -->
          <button
            class="w-full py-2 rounded-xl text-sm text-red-500 border border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/10 transition"
            on:click={handleDisconnect}
          >
            <iconify-icon icon="mdi:logout" class="mr-1 align-middle"></iconify-icon>
            {$i18n.t('Disconnect Wallet')}
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}
