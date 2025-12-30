<script lang="ts">
  import { mobile } from '$lib/stores';

  export let videourl = '';
  export let videosize = '16:9'; // 你可以留着，不作为最终判断依据

  let videoEl: HTMLVideoElement | null = null;
  let isLandscape = true; // 横屏：object-cover；竖屏：object-contain

  function onLoadedMetadata() {
    if (!videoEl) return;
    const w = videoEl.videoWidth;
    const h = videoEl.videoHeight;
    if (w > 0 && h > 0) {
      isLandscape = w >= h;
    }
  }

  // 动态 object-fit
  $: fitClass = isLandscape ? 'object-cover' : 'object-contain';
</script>

<div class="w-full">
  <div class="flex w-full justify-start">
    <div class={`w-full ${$mobile ? '' : 'max-w-[600px]'}`}>
      <video
        bind:this={videoEl}
        on:loadedmetadata={onLoadedMetadata}
        class={`w-full max-h-[320px] rounded-xl border border-gray-200 dark:border-gray-850 ${fitClass} bg-black/10`}
        controls
        preload="metadata"
        src={videourl}
      />
    </div>
  </div>
</div>
