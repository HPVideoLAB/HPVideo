<script lang="ts">
  import { showNewModelAlert } from '$lib/stores/useNewModelAlert';
  import { getContext } from 'svelte';
  import { fly } from 'svelte/transition';

  const i18n: any = getContext('i18n');

  function handleDismiss() {
    showNewModelAlert.dismiss();
  }

  function handleExperience() {
    showNewModelAlert.dismiss();
    window.location.href = '/creator/pro';
  }
</script>

{#if $showNewModelAlert}
  <div
    class="relative w-full border-b border-white/10 bg-gradient-to-r from-violet-600 via-primary-600 to-indigo-600 shadow-lg z-[100]"
    transition:fly={{ y: -36, duration: 300 }}
  >
    <div class="absolute inset-x-0 top-0 h-[1px] bg-white/15 pointer-events-none" />

    <div class="relative mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
      <div class="flex items-center justify-between gap-3 py-2">
        <div class="flex min-w-0 items-center gap-3 overflow-hidden">
          <div
            class="hidden sm:flex h-6 w-6 shrink-0 items-center justify-center rounded bg-white/20 ring-1 ring-white/30 backdrop-blur-sm shadow-sm"
          >
            <iconify-icon icon="mdi:movie-open-star" class="text-white text-xs drop-shadow-md" />
          </div>

          <div class="flex items-center gap-2 min-w-0 text-[12px] text-white/90 truncate">
            <span class="shrink-0 rounded bg-yellow-400 px-1.5 py-0.5 text-[10px] font-bold text-yellow-900 shadow-sm">
              NEW
            </span>

            <span class="font-bold text-white truncate">
              {$i18n.t('Revolutionary: The All-in-One AI Commercial Studio')}
            </span>

            <span class="hidden md:inline text-white/30 mx-1">|</span>

            <span class="hidden md:flex items-center gap-3 text-indigo-100/80 font-medium">
              <span>{$i18n.t('AI Script & Dialogue')}</span>
              <span class="w-1 h-1 rounded-full bg-white/30" />
              <span>{$i18n.t('Immersive SFX & BGM')}</span>
              <span class="w-1 h-1 rounded-full bg-white/30" />
              <span class="text-yellow-200 flex items-center gap-1">
                <iconify-icon icon="mdi:hd" class="text-[10px]" />
                {$i18n.t('Cinema-Grade 4K Upscale')}
              </span>
            </span>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-3">
          <button
            on:click={handleExperience}
            class="group relative h-6 sm:h-7 overflow-hidden rounded-full bg-white px-3 text-[11px] font-bold text-primary-700
                   shadow-sm ring-1 ring-white/50 transition-all
                   hover:bg-white/95 hover:scale-105 active:scale-95 whitespace-nowrap flex items-center gap-1"
          >
            {$i18n.t('Start Directing')}
            <iconify-icon icon="mdi:arrow-right" class="text-[12px] transition-transform group-hover:translate-x-0.5" />
          </button>

          <button
            on:click={handleDismiss}
            class="flex items-center justify-center text-white/60 hover:text-white transition-colors"
            aria-label="Close"
          >
            <iconify-icon icon="mdi:close" class="text-[16px]" />
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
