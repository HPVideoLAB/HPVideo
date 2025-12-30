<script lang="ts">
  import { getContext } from 'svelte';
  import { mobile } from '$lib/stores';

  const i18n: any = getContext('i18n');

  export let videosize = '16/9';
  export let errtip = 'Video Generation Failed';
  export let isLastMessage = false;
  export let resentMessageHandler: Function;

  let aspectRatio = '16/9';
  let sizeflag = true;

  $: if (videosize) {
    if (videosize.includes('*')) {
      if (Number(videosize.split('*')[0]) > Number(videosize.split('*')[1])) {
        aspectRatio = '16/9';
        sizeflag = true;
      } else {
        aspectRatio = '9/16';
        sizeflag = false;
      }
    } else if (videosize.includes(':')) {
      if (Number(videosize.split(':')[0]) > Number(videosize.split(':')[1])) {
        aspectRatio = '16/9';
        sizeflag = true;
      } else {
        aspectRatio = '9/16';
        sizeflag = false;
      }
    } else {
      aspectRatio = '16/9';
      sizeflag = true;
    }
  }
</script>

<div class="w-full">
  <div class="flex w-full">
    <div
      class={`flex justify-center flex-col items-center w-full ${
        $mobile ? '' : sizeflag ? 'max-w-[600px]' : 'max-w-[300px]'
      } rounded-lg bg-gradient-to-r from-red-600 via-rose-600 to-pink-600`}
      style={`aspect-ratio: ${aspectRatio}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" class="w-8 h-8" version="1.1">
        <path d="M512 512m-512 0a512 512 0 1 0 1024 0 512 512 0 1 0-1024 0Z" fill="#ffffff" />
        <path
          d="M512 824.905143c35.328 0 64-30.025143 64-67.072 0-37.010286-28.672-67.035429-64-67.035429s-64 29.988571-64 67.035429 28.672 67.072 64 67.072z m0-625.810286a77.897143 77.897143 0 0 1 77.604571 84.992l-31.085714 341.869714a46.738286 46.738286 0 0 1-93.037714 0l-31.085714-341.869714A77.897143 77.897143 0 0 1 512 199.094857z"
          fill="#d81e06"
        />
      </svg>

      <span class="text-sm text-gray-50 mt-2 w-[70%] text-center">{$i18n.t(errtip)}!</span>

      {#if isLastMessage}
        <button
          class="flex flex-row items-center bg-gray-50 rounded-lg px-4 py-1.5 text-gray-800 text-sm mt-2"
          on:click={async () => {
            await resentMessageHandler();
          }}
        >
          {$i18n.t('Regenerate')}
        </button>
      {/if}
    </div>
  </div>
</div>
