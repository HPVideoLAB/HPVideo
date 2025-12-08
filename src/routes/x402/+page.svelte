<script lang="ts">
  import { onMount, tick } from "svelte";
  import { page } from "$app/stores";
  import { getX402DeOpenAIChatResult } from "$lib/apis/de";
  import { createOpenAITextStream } from "$lib/apis/streaming";
  import VideoLoading from "$lib/components/chat/Messages/VideoLoading.svelte";
  import VideoPlay from "$lib/components/chat/Messages/VideoPlay.svelte";
  
  let videoLoading = true;
  let videoUrl = "";
  const getVideoResult = async (createid: string) => {
    try {
      const [res, controller] = await getX402DeOpenAIChatResult(
        localStorage.token,
        { requestId: createid }
      );

      await tick();

      if (res && res.ok && res.body) {
        const textStream = await createOpenAITextStream(res.body, true);
        for await (const update of textStream) {
          let { value, status, done } = update;
          if (status == "completed") {
            videoLoading = false;
            videoUrl = value;
          }
          await tick();
        }
      }
    } catch (error) {
      console.log("====================", error);
    }
  };

  onMount(async () => {
    const queryParams = new URLSearchParams($page.url?.search);
    let createid = queryParams.get("createid");
    await getVideoResult(createid);
  });
</script>

<div class="flex justify-center w-full">
  {#if videoLoading}
    <VideoLoading />
  {:else}
    <VideoPlay bind:videourl={videoUrl} />
  {/if}
</div>
