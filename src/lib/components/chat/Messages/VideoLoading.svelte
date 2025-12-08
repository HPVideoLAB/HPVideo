<script lang="ts">
	import { getContext } from 'svelte';
	import { mobile } from "$lib/stores";
	const i18n = getContext('i18n');
	export let videosize = '16/9';
	let aspectRatio = '16/9';
	let sizeflag = true;

	$: if(videosize) {
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

<div class="w-full my-3">
	<div class="animate-pulse flex w-full">
		<div class="flex justify-center flex-col items-center w-full {$mobile ? '' : (sizeflag ? 'max-w-[600px]' : 'max-w-[300px]')} rounded-lg
			bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" style={`aspect-ratio: ${aspectRatio}`}>
			<img class="size-10" src="/creator/static/video/video_generating.png" alt=""/>
			<span class="text-sm text-gray-50 mt-1">{ $i18n.t("Video Generating...") }</span>
		</div>
	</div>
</div>