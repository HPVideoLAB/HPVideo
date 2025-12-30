<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { mobile } from '$lib/stores';
  export let videourl = '';
  export let videosize = '16:9';

  let videoElement: any;
  let videoWidth = 0;
  let videoHeight = 0;
  let sizeflag = true;

  $: if (videosize) {
    if (videosize.includes('*')) {
      let rate = Number(videosize.split('*')[0]) / Number(videosize.split('*')[1]);
      videoHeight = videoWidth / rate;
      if (rate > 1) {
        sizeflag = true;
      } else {
        sizeflag = false;
      }
    } else if (videosize.includes(':')) {
      let rate = Number(videosize.split('*')[0]) / Number(videosize.split('*')[1]);
      videoHeight = videoWidth / rate;
      if (rate > 1) {
        sizeflag = true;
      } else {
        sizeflag = false;
      }
    } else {
      videoHeight = (videoWidth * 9) / 16;
      sizeflag = true;
    }
  }

  function calculateOnLoadedMetadata() {
    const originalWidth = videoElement.videoWidth;
    const originalHeight = videoElement.videoHeight;
    videoHeight = (videoWidth * originalHeight) / originalWidth;
  }

  onMount(() => {
    window.addEventListener('resize', calculateOnLoadedMetadata);
  });

  onDestroy(() => {
    window.removeEventListener('resize', calculateOnLoadedMetadata);
  });
</script>

<div class="w-full my-3">
  <div class="flex w-full justify-start">
    <div class="w-auto relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
      <video
        bind:this={videoElement}
        class="my-1 block max-h-[320px] w-auto object-contain"
        controls
        src={videourl}
        on:loadedmetadata={calculateOnLoadedMetadata}
      />
    </div>
  </div>
</div>
