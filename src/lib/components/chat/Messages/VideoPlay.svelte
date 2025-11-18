<script lang="ts">
	import { mobile } from "$lib/stores";
	export let videourl = "";
	export let videosize = "16:9";

	let videoElement: any;
	let videoWidth = 0;
	let videoHeight = 0;
	let sizeflag = true;

	$: if(videosize) {
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
			videoHeight = videoWidth * 9 / 16;
			sizeflag = true;
		}
	}

	function calculateOnLoadedMetadata() {
		const originalWidth = videoElement.videoWidth;
    const originalHeight = videoElement.videoHeight;
		videoHeight = videoWidth * originalHeight / originalWidth;
	}

</script>

<div class="w-full mt-3 mb-4">
	<div class="flex w-full">
		<div class="w-full {$mobile ? '' : sizeflag ? 'max-w-[600px]' : 'max-w-[300px]'}">
			<video bind:this={videoElement} bind:clientWidth={videoWidth} class="my-1 w-full rounded-lg bg-red" controls src={videourl}
				style={`height: ${videoHeight}px;`}
				on:loadedmetadata={calculateOnLoadedMetadata}/>
		</div>
	</div>
</div>