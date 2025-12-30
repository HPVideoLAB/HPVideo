<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte';

  type UploadStatus = 'idle' | 'valid' | 'uploading' | 'success' | 'error';

  export let files: File[] = [];
  export let status: UploadStatus = 'idle';
  export let message = '';

  const dispatch = createEventDispatcher<{
    filesChange: File[];
    removeFile: number;
    clear: void;
  }>();

  const ACCEPT_TEXT = 'image/png,image/jpeg';
  const MAX_FILES = 5;

  let isDragging = false;
  let fileInput: HTMLInputElement | null = null;

  // 预览 URL 缓存：避免每次渲染都 createObjectURL
  const previewMap = new Map<string, string>();

  function keyOf(f: File) {
    return `${f.name}-${f.size}-${f.lastModified}`;
  }

  function isImage(f: File) {
    return f.type === 'image/png' || f.type === 'image/jpeg';
  }

  // 去重 + 限制数量
  function clamp(next: File[]) {
    const uniq = new Map<string, File>();
    for (const f of next.filter(isImage)) uniq.set(keyOf(f), f);
    return Array.from(uniq.values()).slice(0, MAX_FILES);
  }

  function addFiles(incoming: FileList | null) {
    if (!incoming || incoming.length === 0) return;
    const next = clamp([...files, ...Array.from(incoming)]);
    dispatch('filesChange', next);
  }

  function openPicker(e?: Event) {
    e?.stopPropagation();
    if (status === 'uploading') return; // 上传中禁止选择
    fileInput?.click();
  }

  function onFileInputChange() {
    addFiles(fileInput?.files ?? null);

    // 关键：清空 value，确保“同一文件再次选择”也能触发 change
    if (fileInput) fileInput.value = '';
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    addFiles(e.dataTransfer?.files ?? null);
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function onDragLeave() {
    isDragging = false;
  }

  // 获取预览 URL（缓存）
  function previewUrl(f: File) {
    const k = keyOf(f);
    const existing = previewMap.get(k);
    if (existing) return existing;

    const url = URL.createObjectURL(f);
    previewMap.set(k, url);
    return url;
  }

  // files 改变时，自动回收不再使用的 URL
  $: {
    const alive = new Set(files.map(keyOf));
    for (const [k, url] of previewMap.entries()) {
      if (!alive.has(k)) {
        URL.revokeObjectURL(url);
        previewMap.delete(k);
      }
    }
  }

  onDestroy(() => {
    for (const url of previewMap.values()) URL.revokeObjectURL(url);
    previewMap.clear();
  });
</script>

<section class="rounded-2xl border border-gray-200 bg-transparent p-3 dark:border-gray-850 flex flex-col">
  <!-- 标题 -->
  <div class="mb-3">
    <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">关键帧图片（images）</h2>
  </div>

  <!-- 上传区域 -->
  <input
    bind:this={fileInput}
    class="hidden"
    type="file"
    multiple
    accept={ACCEPT_TEXT}
    on:change={onFileInputChange}
    disabled={status === 'uploading'}
  />
  <!-- 上传按钮 -->
  <button
    type="button"
    class={`rounded-2xl flex-1 border-2 border-dashed bg-transparent p-4 transition
      ${isDragging ? 'border-primary-500' : 'border-gray-300 hover:border-primary-500'}
      dark:border-gray-700`}
    on:drop|preventDefault={onDrop}
    on:dragover|preventDefault={onDragOver}
    on:dragleave={onDragLeave}
    on:click={openPicker}
    on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && openPicker(e)}
    disabled={status === 'uploading'}
  >
    <div class="flex flex-col items-center gap-3 text-center">
      <div
        class="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-700
               dark:border-gray-850 dark:bg-gray-950 dark:text-gray-300"
      >
        ⬆
      </div>

      <div class="space-y-1">
        <p class="text-sm font-medium text-gray-900 dark:text-gray-100">把图片拖到这里，或点击选择图片</p>
        <p class="text-xs text-gray-600 dark:text-gray-400">PNG/JPG 最多 5 张 · 作为关键帧</p>
      </div>

      <div class="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          class={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium text-white
                 ${
                   status === 'uploading'
                     ? 'bg-gray-400 cursor-not-allowed'
                     : 'bg-primary-500 hover:bg-primary-600 active:bg-primary-700'
                 }`}
          on:click={openPicker}
          disabled={status === 'uploading'}
        >
          选择图片
        </button>

        <button
          type="button"
          class="inline-flex items-center rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium
                 text-gray-900 hover:border-primary-500 hover:text-primary-500
                 dark:border-gray-700 dark:text-gray-100 disabled:opacity-50"
          on:click|stopPropagation={() => dispatch('clear')}
          disabled={status === 'uploading' || files.length === 0}
        >
          清空
        </button>
      </div>

      {#if message}
        <div
          class=" w-full rounded-xl border px-3 py-2 text-sm
                 border-gray-200 bg-gray-50 text-gray-800
                 dark:border-gray-850 dark:bg-gray-950 dark:text-gray-200"
        >
          {message}
        </div>
      {/if}
    </div>
  </button>

  <!-- 文件预览 -->
  {#if files.length > 0}
    <div class="mt-3">
      <div class="mb-2 flex items-center justify-between">
        <div class="text-xs font-medium text-gray-700 dark:text-gray-300">图片预览（最多 5 张）</div>
        <div class="text-xs text-gray-600 dark:text-gray-400">{files.length} 张</div>
      </div>

      <div class="grid grid-cols-5 gap-2">
        {#each files as f, idx (keyOf(f))}
          <div class="group relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-850">
            <img src={previewUrl(f)} alt={f.name} class="h-16 w-full object-cover" />
            <button
              type="button"
              class="absolute right-1 top-1 rounded-lg border border-gray-200 bg-black/50 px-2 py-1 text-[11px] font-medium text-white
                     opacity-0 transition group-hover:opacity-100 dark:border-gray-850"
              on:click|stopPropagation={() => dispatch('removeFile', idx)}
              disabled={status === 'uploading'}
            >
              移除
            </button>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</section>
