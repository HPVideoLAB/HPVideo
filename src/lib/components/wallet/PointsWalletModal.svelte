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
    getWalletId,
  } from '$lib/utils/wallet/dlcp/wallet';
  import { toast } from 'svelte-sonner';
  import { refreshWalletAddress } from '$lib/stores/wallet';

  const dispatch = createEventDispatcher();
  const i18n: any = getContext('i18n');

  export let show = false;

  // States: 'entry' | 'create' | 'created' | 'import' | 'connected'
  let step = 'entry';
  let password = '';
  let privateKey = '';
  let loading = false;
  let balanceLoading = false;
  let connectedAddress = '';
  let showBuyPanel = false;
  let walletId = '';
  // After a fresh create, the plaintext private key is shown ONCE so the user
  // can back it up. Cleared as soon as they leave the 'created' step.
  let revealedPrivateKey = '';
  let pkVisible = false;
  let pkCopied = false;

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

  // One-click create: no password input, auto-generate everything,
  // then show a "back up your private key" reveal step.
  async function handleQuickCreate() {
    if (loading) return;
    loading = true;
    try {
      const { address, privateKey: pk } = await createPointsWallet();
      connectedAddress = address;
      revealedPrivateKey = pk;
      step = 'created';
      toast.success($i18n.t('Wallet created successfully'));
      refreshWalletAddress();
      await refreshBalance();
      dispatch('connected', address);
    } catch (e: any) {
      toast.error(e.message || 'Failed to create wallet');
    }
    loading = false;
  }

  async function handleImport() {
    if (!privateKey.trim()) return;
    loading = true;
    try {
      // Password is optional now — match Create's one-click ergonomics.
      const { address } = await importPointsWallet(privateKey, password.trim() || undefined);
      connectedAddress = address;
      step = 'connected';
      toast.success($i18n.t('Wallet imported successfully'));
      refreshWalletAddress();
      await refreshBalance();
      dispatch('connected', address);
    } catch (e: any) {
      toast.error(e.message || 'Failed to import wallet');
      privateKey = '';
    }
    loading = false;
    privateKey = '';
  }

  // Google flow placeholder. Wires the OAuth in a future commit; for now
  // this surfaces a "coming soon" toast so the option is visible without
  // dead-ending. When VITE_GOOGLE_CLIENT_ID lands, swap this for the
  // real Google Identity Services callback.
  function handleGoogle() {
    toast.info($i18n.t('Google login coming soon — please use Create Wallet for now'));
  }

  function copyPrivateKey() {
    if (!revealedPrivateKey) return;
    navigator.clipboard.writeText(revealedPrivateKey).then(() => {
      pkCopied = true;
      setTimeout(() => (pkCopied = false), 1800);
    });
  }

  function finishBackupStep() {
    revealedPrivateKey = '';
    pkVisible = false;
    pkCopied = false;
    step = 'connected';
  }

  async function refreshBalance() {
    if (!connectedAddress) return;
    balanceLoading = true;
    try {
      const [bal, id] = await Promise.all([
        getDLCPBalance(connectedAddress),
        walletId ? Promise.resolve(walletId) : getWalletId(connectedAddress),
      ]);
      dlcpBalance.set(bal);
      if (id) walletId = id;
    } catch (e) {
      console.error(e);
    }
    balanceLoading = false;
  }

  function handleDisconnect() {
    clearPointsWallet();
    connectedAddress = '';
    walletId = '';
    dlcpBalance.set('0');
    step = 'entry';
    password = '';
    refreshWalletAddress();
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
  <!-- Anchor near the top with vertical scroll on overflow — earlier
       'flex items-center' centering caused the modal to land partly above
       the viewport on shorter screens, hiding the primary CTA. -->
  <div class="fixed inset-0 z-[99999] overflow-y-auto bg-black/50 backdrop-blur-sm" style="margin:0;padding:0;" on:click|self={close}>
    <div class="min-h-full flex items-start justify-center p-4 md:p-8" on:click|self={close}>
    <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-[420px] max-w-[92vw] overflow-hidden border border-gray-200 dark:border-gray-700">

      {#if step === 'entry'}
        <!-- Entry: 3 onboarding paths (Create / Import / Google) -->
        <div class="px-6 py-5">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <iconify-icon icon="mdi:star-circle" class="text-2xl text-amber-500"></iconify-icon>
            </div>
            <div>
              <h3 class="text-lg font-bold text-gray-900 dark:text-white">{$i18n.t('Get started')}</h3>
              <p class="text-xs text-gray-500">{$i18n.t('Pick how you want to sign in. No email, no password — just one click.')}</p>
            </div>
          </div>

          <div class="flex flex-col gap-2.5">
            <!-- Primary: one-click create -->
            <button
              class="w-full py-3 px-4 rounded-xl font-semibold text-white primaryButton transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              disabled={loading}
              on:click={handleQuickCreate}
            >
              {#if loading}
                <iconify-icon icon="mdi:loading" class="animate-spin text-xl"></iconify-icon>
                {$i18n.t('Creating...')}
              {:else}
                <iconify-icon icon="mdi:flash" class="text-xl"></iconify-icon>
                <div class="flex flex-col items-start leading-tight">
                  <span>{$i18n.t('Create Wallet')}</span>
                  <span class="text-[10px] font-normal opacity-80">{$i18n.t('One click — instant access')}</span>
                </div>
              {/if}
            </button>

            <!-- Secondary: Google -->
            <button
              class="w-full py-3 px-4 rounded-xl font-medium border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 transition hover:border-gray-400 flex items-center justify-center gap-2"
              on:click={handleGoogle}
            >
              <iconify-icon icon="logos:google-icon" class="text-xl"></iconify-icon>
              {$i18n.t('Continue with Google')}
            </button>

            <!-- Tertiary: Import existing -->
            <button
              class="w-full py-3 px-4 rounded-xl font-medium text-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 transition hover:border-primary-500/60 hover:text-primary-600 dark:hover:text-primary-300 flex items-center justify-center gap-2"
              on:click={() => { step = 'import'; }}
            >
              <iconify-icon icon="mdi:key-variant" class="text-base"></iconify-icon>
              {$i18n.t('Import existing wallet')}
            </button>
          </div>

          <p class="mt-4 text-center text-[11px] text-gray-400 dark:text-gray-500">
            {$i18n.t('1,000 credits = $1. No subscription.')}
          </p>
        </div>

      {:else if step === 'created'}
        <!-- Created: backup-now reveal screen. Shown ONCE. -->
        <div class="px-6 py-5">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <iconify-icon icon="mdi:check-circle" class="text-2xl text-emerald-500"></iconify-icon>
            </div>
            <div>
              <h3 class="text-lg font-bold text-gray-900 dark:text-white">{$i18n.t('Wallet ready')}</h3>
              <p class="text-xs text-gray-500">{connectedAddress.slice(0, 6)}…{connectedAddress.slice(-4)}</p>
            </div>
          </div>

          <!-- Loud, hard-to-miss warning. Lose the private key = lose the wallet = lose any credits in it. -->
          <div class="bg-red-50 dark:bg-red-900/15 border-2 border-red-300 dark:border-red-700/60 rounded-xl p-4 mb-4 text-sm text-red-800 dark:text-red-200">
            <p class="font-bold flex items-center gap-1.5 mb-1.5">
              <iconify-icon icon="mdi:alert-octagon" class="text-lg text-red-500"></iconify-icon>
              {$i18n.t('Save your private key NOW')}
            </p>
            <p class="text-xs leading-relaxed">{$i18n.t('Without this key, your wallet (and any credits in it) cannot be recovered if you change browsers or clear your data. We do not store it. Save it somewhere safe right now.')}</p>
          </div>

          <div class="relative mb-3">
            <div
              class="font-mono text-[11px] break-all bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-3 pr-12 select-all min-h-[56px]"
              style={pkVisible ? '' : 'filter: blur(6px);'}
            >
              {revealedPrivateKey || '\u00A0'}
            </div>
            <button
              type="button"
              class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              on:click={() => (pkVisible = !pkVisible)}
              title={pkVisible ? $i18n.t('Hide') : $i18n.t('Show')}
            >
              <iconify-icon icon={pkVisible ? 'mdi:eye-off-outline' : 'mdi:eye-outline'} class="text-lg"></iconify-icon>
            </button>
          </div>

          <div class="flex gap-2 mb-4">
            <button
              class="flex-1 py-2.5 rounded-xl font-medium text-sm border border-gray-200 dark:border-gray-700 hover:border-primary-500/60 transition flex items-center justify-center gap-1.5"
              on:click={copyPrivateKey}
            >
              <iconify-icon icon={pkCopied ? 'mdi:check' : 'mdi:content-copy'} class="text-base"></iconify-icon>
              {pkCopied ? $i18n.t('Copied!') : $i18n.t('Copy private key')}
            </button>
          </div>

          <button
            class="w-full py-3 rounded-xl font-semibold text-white primaryButton transition hover:opacity-90"
            on:click={finishBackupStep}
          >
            {$i18n.t('I have backed it up — continue')}
          </button>
        </div>

      {:else if step === 'import'}
        <!-- Import wallet by private key. Password is optional now —
             leaving it blank produces a one-click-style auto-encrypted
             wallet that decrypts without prompting. -->
        <div class="px-6 py-5">
          <button class="text-sm text-gray-400 hover:text-gray-600 mb-3 flex items-center gap-1" on:click={() => { step = 'entry'; password = ''; privateKey = ''; }}>
            <iconify-icon icon="mdi:arrow-left" class="text-base"></iconify-icon> {$i18n.t('Back')}
          </button>
          <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-1">{$i18n.t('Import existing wallet')}</h3>
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-4">{$i18n.t('Paste the private key of any DBC-Chain compatible wallet.')}</p>

          <label class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{$i18n.t('Private Key')}</label>
          <input
            type="password"
            bind:value={privateKey}
            placeholder="0x..."
            class="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-primary-500 mb-3"
            on:keydown={(e) => { if (e.key === 'Enter') handleImport(); }}
          />

          <details class="mb-4 text-sm">
            <summary class="cursor-pointer text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              {$i18n.t('Optional: encrypt with a password')}
            </summary>
            <input
              type="password"
              bind:value={password}
              placeholder={$i18n.t('Leave blank for one-click access')}
              class="w-full mt-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-primary-500"
            />
          </details>

          <button
            class="w-full py-3 rounded-xl font-semibold text-white primaryButton transition hover:opacity-90 disabled:opacity-50"
            disabled={!privateKey.trim() || loading}
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

          <!-- Address & ID -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-3 space-y-2">
            <div class="flex items-center gap-2">
              <iconify-icon icon="mdi:wallet" class="text-primary-500 text-base flex-shrink-0"></iconify-icon>
              <span class="text-xs text-gray-400 flex-shrink-0">{$i18n.t('Address')}:</span>
              <span class="text-xs font-mono text-gray-600 dark:text-gray-300 truncate">{connectedAddress}</span>
            </div>
            <div class="flex items-center gap-2">
              <iconify-icon icon="mdi:identifier" class="text-amber-500 text-base flex-shrink-0"></iconify-icon>
              <span class="text-xs text-gray-400 flex-shrink-0">ID:</span>
              <span class="text-sm font-bold font-mono text-gray-900 dark:text-white">{walletId || '...'}</span>
            </div>
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
                  {balanceLoading ? '...' : (parseInt($dlcpBalance) || 0).toLocaleString()}
                </span>
                <span class="text-sm text-gray-400 ml-1">pts</span>
              </div>
              <div class="text-sm text-gray-400">
                ≈ ${pointsToUSDT($dlcpBalance || '0')}
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
  </div>
{/if}
