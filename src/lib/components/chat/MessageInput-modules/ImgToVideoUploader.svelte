<script lang="ts">
  import { createEventDispatcher } from 'svelte';

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

  function isImage(f: File) {
    return f.type === 'image/png' || f.type === 'image/jpeg';
  }

  function clamp(next: File[]) {
    const uniq = new Map<string, File>();
    for (const f of next.filter(isImage)) {
      uniq.set(`${f.name}-${f.size}-${f.lastModified}`, f);
    }
    return Array.from(uniq.values()).slice(0, MAX_FILES);
  }

  function addFiles(incoming: FileList | null) {
    if (!incoming || incoming.length === 0) return;
    const next = clamp([...files, ...Array.from(incoming)]);
    dispatch('filesChange', next);
  }

  function onFileInputChange() {
    addFiles(fileInput?.files ?? null);
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

  function previewUrl(f: File) {
    return URL.createObjectURL(f);
  }
</script>

<section class="rounded-2xl border border-gray-200 bg-transparent p-3 sm:p-4 dark:border-gray-850 flex flex-col">
  <div class="mb-3">
    <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">文件上传</h2>
    <p class="mt-1 text-xs text-gray-600 dark:text-gray-400">拖拽或点击选择图片（PNG/JPG，最多 5 张）。</p>
  </div>

  <button
    type="button"
    class={`rounded-2xl flex-1 border-2 border-dashed bg-transparent p-4 transition
      ${isDragging ? 'border-primary-500' : 'border-gray-300 hover:border-primary-500'}
      dark:border-gray-700`}
    aria-label="图片上传区域：拖拽图片到此处或按回车选择图片"
    on:drop|preventDefault={onDrop}
    on:dragover|preventDefault={onDragOver}
    on:dragleave={onDragLeave}
    on:click={() => fileInput?.click()}
    on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInput?.click()}
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
        <p class="text-xs text-gray-600 dark:text-gray-400">最多 5 张 · 作为关键帧（keyframes）</p>
      </div>

      <div class="flex flex-wrap items-center justify-center gap-2">
        <label
          class="inline-flex cursor-pointer items-center rounded-xl bg-primary-500 px-4 py-2 text-sm font-medium text-white
                 hover:bg-primary-600 active:bg-primary-700"
        >
          选择图片
          <input
            bind:this={fileInput}
            class="hidden"
            type="file"
            multiple
            accept={ACCEPT_TEXT}
            on:change={onFileInputChange}
          />
        </label>

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
          class="mt-2 w-full rounded-xl border px-3 py-2 text-sm
                 border-gray-200 bg-gray-50 text-gray-800
                 dark:border-gray-850 dark:bg-gray-950 dark:text-gray-200"
        >
          {message}
        </div>
      {/if}
    </div>
  </button>

  <!-- 预览（最多 5 张） -->
  {#if files.length > 0}
    <div class="mt-3">
      <div class="mb-2 flex items-center justify-between">
        <div class="text-xs font-medium text-gray-700 dark:text-gray-300">图片预览（最多 5 张）</div>
        <div class="text-xs text-gray-600 dark:text-gray-400">{files.length} 张</div>
      </div>

      <div class="grid grid-cols-5 gap-2">
        {#each files as f, idx}
          <div class="group relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-850">
            <img src={previewUrl(f)} alt={f.name} class="h-20 w-full object-cover" />
            <button
              type="button"
              class="absolute right-1 top-1 rounded-lg border border-gray-200 bg-black/50 px-2 py-1 text-[11px] font-medium text-white
                     opacity-0 transition group-hover:opacity-100 dark:border-gray-850"
              on:click|stopPropagation={() => dispatch('removeFile', idx)}
            >
              移除
            </button>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</section>
