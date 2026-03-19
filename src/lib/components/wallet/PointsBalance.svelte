<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import { threesideAccount, dlcpBalance, paymentMode } from '$lib/stores';
  import { getDLCPBalance, pointsToUSDT, getPointsBuyLink, POINTS_TIERS } from '$lib/utils/wallet/dlcp/index';
  import { toast } from 'svelte-sonner';

  const i18n: any = getContext('i18n');

  let showBuyPanel = false;
  let loading = false;

  // Refresh DLCP balance
  async function refreshBalance() {
    if ($threesideAccount?.address) {
      loading = true;
      try {
        const balance = await getDLCPBalance($threesideAccount.address);
        dlcpBalance.set(balance);
      } catch (e) {
        console.error('Failed to fetch DLCP balance', e);
      }
      loading = false;
    }
  }

  // Buy points via PayPal
  async function buyPoints(tier: typeof POINTS_TIERS[0]) {
    if (!$threesideAccount?.address) {
      toast.error($i18n.t('Please connect wallet first'));
      return;
    }
    try {
      const url = await getPointsBuyLink($threesideAccount.address, tier.productId);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
        toast.success($i18n.t('PayPal payment page opened'));
      } else {
        toast.error($i18n.t('Failed to get payment link'));
      }
    } catch (e) {
      toast.error($i18n.t('Failed to get payment link'));
    }
  }

  onMount(() => {
    refreshBalance();
    // Auto refresh every 60s
    const interval = setInterval(refreshBalance, 60000);
    return () => clearInterval(interval);
  });

  // Refresh when account changes
  $: if ($threesideAccount?.address) {
    refreshBalance();
  }
</script>

{#if $paymentMode === 'points' && $threesideAccount?.address}
  <div class="mt-2">
    <!-- Balance Card -->
    <div class="bg-gradient-to-r from-amber-500/10 to-purple-500/10 border border-amber-500/20 rounded-xl p-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <iconify-icon icon="mdi:star-circle" class="text-amber-500 text-lg"></iconify-icon>
          <span class="text-sm font-medium text-gray-700 dark:text-gray-200">{$i18n.t('DLCP Points')}</span>
        </div>
        <button
          class="text-xs text-gray-400 hover:text-primary transition"
          on:click={refreshBalance}
          disabled={loading}
        >
          <iconify-icon icon="mdi:refresh" class="text-sm {loading ? 'animate-spin' : ''}"></iconify-icon>
        </button>
      </div>
      <div class="mt-1 flex items-end justify-between">
        <div>
          <span class="text-2xl font-bold text-gray-900 dark:text-white font-mono">
            {loading ? '...' : parseInt($dlcpBalance).toLocaleString()}
          </span>
          <span class="text-xs text-gray-400 ml-1">pts</span>
        </div>
        <div class="text-xs text-gray-400">
          ≈ ${pointsToUSDT($dlcpBalance)}
        </div>
      </div>
      <!-- Buy button -->
      <button
        class="mt-2 w-full py-1.5 rounded-lg text-sm font-semibold text-white transition
          primaryButton hover:opacity-90"
        on:click={() => { showBuyPanel = !showBuyPanel; }}
      >
        <iconify-icon icon="mdi:plus-circle" class="mr-1 align-middle"></iconify-icon>
        {$i18n.t('Buy Points')}
      </button>
    </div>

    <!-- Buy Panel -->
    {#if showBuyPanel}
      <div class="mt-2 bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
        <div class="text-xs text-gray-500 mb-2">{$i18n.t('Purchase via PayPal (1000 pts = $1)')}</div>
        <div class="grid grid-cols-4 gap-2">
          {#each POINTS_TIERS as tier}
            <button
              class="flex flex-col items-center p-2 rounded-lg border border-gray-200 dark:border-gray-700
                hover:border-primary hover:bg-primary/5 transition text-center"
              on:click={() => buyPoints(tier)}
            >
              <span class="text-sm font-bold text-gray-900 dark:text-white">{tier.amount}</span>
              <span class="text-[10px] text-gray-400">{tier.points}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/if}
