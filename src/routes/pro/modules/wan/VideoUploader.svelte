<!-- VideoUploader.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let videoFile: File | null = null;
  export let status: string = 'idle';
  export let message = '';

  const dispatch = createEventDispatcher<{ fileChange: File | null }>();

  let isDragging = false;
  let fileInput: HTMLInputElement | null = null;
  let previewUrl: string | null = null;

  function handleFile(f: File | null) {
    if (!f) return;
    // 简单限制 100MB
    if (f.size > 100 * 1024 * 1024) return alert('视频大小请控制在 100MB 以内');

    videoFile = f;
    // 生成预览
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(f);

    dispatch('fileChange', f);
  }

  function clear() {
    videoFile = null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    dispatch('fileChange', null);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    const f = e.dataTransfer?.files?.[0];
    if (f && f.type.startsWith('video/')) handleFile(f);
  }
</script>

<section class="rounded-2xl border border-gray-200 bg-transparent p-3 dark:border-gray-850 flex flex-col h-full">
  <div class="mb-3">
    <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">源视频 (Source Video)</h2>
  </div>

  <input
    bind:this={fileInput}
    type="file"
    accept="video/*"
    class="hidden"
    on:change={() => handleFile(fileInput?.files?.[0] || null)}
  />

  {#if !videoFile}
    <button
      type="button"
      class={`rounded-2xl flex-1 border-2 border-dashed bg-transparent p-4 transition flex flex-col items-center justify-center gap-3
        ${isDragging ? 'border-primary-500 bg-primary-50/10' : 'border-gray-300 hover:border-primary-500'}
        dark:border-gray-700`}
      on:click={() => fileInput?.click()}
      on:drop={onDrop}
      on:dragover|preventDefault={() => (isDragging = true)}
      on:dragleave={() => (isDragging = false)}
    >
      <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 text-2xl dark:bg-gray-800">🎬</div>
      <div class="text-center">
        <p class="text-sm font-medium text-gray-900 dark:text-gray-100">点击上传或拖拽视频</p>
        <p class="text-xs text-gray-500">MP4 / MOV / WebM</p>
      </div>
    </button>
  {:else}
    <div class="relative w-full rounded-xl overflow-hidden bg-black border border-gray-200 dark:border-gray-800 group">
      <video src={previewUrl} controls class="w-full max-h-[240px] object-contain mx-auto" />
      <button
        class="absolute top-2 right-2 bg-red-600/80 hover:bg-red-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition backdrop-blur-sm"
        on:click|stopPropagation={clear}
      >
        移除
      </button>
    </div>
    {#if message}
      <div class="mt-2 text-xs text-green-600 dark:text-green-400 px-2">{message}</div>
    {/if}
  {/if}
</section>
