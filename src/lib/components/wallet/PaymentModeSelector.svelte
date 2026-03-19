<script lang="ts">
  import { createEventDispatcher, getContext } from 'svelte';
  import { paymentMode } from '$lib/stores';
  import { refreshWalletAddress } from '$lib/stores/wallet';

  const dispatch = createEventDispatcher();
  const i18n: any = getContext('i18n');

  export let show = false;

  const selectMode = (mode: 'token' | 'points') => {
    paymentMode.set(mode);
    localStorage.setItem('paymentMode', mode);
    refreshWalletAddress();
    show = false;
    dispatch('select', mode);
  };
</script>

{#if show}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm" style="margin:0;padding:0;" on:click|self={() => { show = false; }}>
    <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-[400px] max-w-[90vw] overflow-hidden border border-gray-200 dark:border-gray-700">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
        <h3 class="text-lg font-bold text-gray-900 dark:text-white">{$i18n.t('Select Payment Mode')}</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{$i18n.t('Choose how you want to pay for video generation')}</p>
      </div>

      <!-- Options -->
      <div class="p-4 space-y-3">
        <!-- Token Mode -->
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
          class="group flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all
            {$paymentMode === 'token'
              ? 'border-primary bg-primary/5'
              : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'}"
          on:click={() => selectMode('token')}
        >
          <div class="w-12 h-12 rounded-full flex items-center justify-center text-2xl
            {$paymentMode === 'token' ? 'bg-primary/10' : 'bg-gray-100 dark:bg-gray-800'}">
            <iconify-icon icon="token:usdt" class="text-2xl"></iconify-icon>
          </div>
          <div class="flex-1">
            <div class="font-semibold text-gray-900 dark:text-white">{$i18n.t('Token Mode')}</div>
            <div class="text-sm text-gray-500 dark:text-gray-400">{$i18n.t('Pay with USDT on BNB Chain')}</div>
          </div>
          {#if $paymentMode === 'token'}
            <iconify-icon icon="mdi:check-circle" class="text-primary text-xl"></iconify-icon>
          {/if}
        </div>

        <!-- Points Mode -->
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
          class="group flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all
            {$paymentMode === 'points'
              ? 'border-primary bg-primary/5'
              : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'}"
          on:click={() => selectMode('points')}
        >
          <div class="w-12 h-12 rounded-full flex items-center justify-center text-2xl
            {$paymentMode === 'points' ? 'bg-primary/10' : 'bg-gray-100 dark:bg-gray-800'}">
            <iconify-icon icon="mdi:star-circle" class="text-2xl text-amber-500"></iconify-icon>
          </div>
          <div class="flex-1">
            <div class="font-semibold text-gray-900 dark:text-white">{$i18n.t('Points Mode')}</div>
            <div class="text-sm text-gray-500 dark:text-gray-400">{$i18n.t('Pay with DLCP Points (1000 pts = $1)')}</div>
          </div>
          {#if $paymentMode === 'points'}
            <iconify-icon icon="mdi:check-circle" class="text-primary text-xl"></iconify-icon>
          {/if}
        </div>
      </div>

      <!-- Footer hint -->
      <div class="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-400 text-center">
        {$i18n.t('You can switch payment mode anytime from settings')}
      </div>
    </div>
  </div>
{/if}
