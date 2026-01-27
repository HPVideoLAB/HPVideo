<script lang="ts">
  import { createEventDispatcher, getContext, onDestroy } from 'svelte';

  // ✅ 接收父组件绑定的 imageFile
  export let imageFile: File | null = null;

  const dispatch = createEventDispatcher<{ fileChange: File | null }>();
  const i18n: any = getContext('i18n');

  let fileInput: HTMLInputElement;
  let previewUrl: string | null = null;
  let isDragging = false;

  // ✅ 封面模式：cover 更像“首帧封面”，contain 看完整图
  let fitMode: 'cover' | 'contain' = 'cover';

  // 监听文件变化，生成/销毁预览图
  $: if (imageFile) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(imageFile);
  } else {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }

  onDestroy(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  });

  function handleFile(f: File | null) {
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      return alert($i18n.t('Only JPG/PNG/WEBP images supported'));
    }
    imageFile = f;
    dispatch('fileChange', f);

    // 🔥 关键修复：清空 input 值，解决“重复上传同一张图无反应”
    if (fileInput) fileInput.value = '';
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    handleFile(e.dataTransfer?.files?.[0] || null);
  }

  function clearFile() {
    imageFile = null;
    dispatch('fileChange', null);
  }

  function openPicker() {
    fileInput?.click();
  }

  $: fileTypeLabel = imageFile?.type ? imageFile.type.replace('image/', '').toUpperCase() : '';
</script>

<section class="flex flex-col gap-2">
  <div class="px-1 flex items-center justify-between gap-2">
    <h2 class="text-sm font-semibold text-text-light dark:text-text-dark">
      {$i18n.t('Start Frame / Product Image')}
    </h2>

    {#if imageFile}
      <div class="text-[10px] text-text-lightSecondary dark:text-text-darkSecondary truncate max-w-[60%]">
        {imageFile.name}
      </div>
    {/if}
  </div>

  <input
    bind:this={fileInput}
    type="file"
    accept="image/*"
    class="hidden"
    on:change={() => handleFile(fileInput?.files?.[0] || null)}
  />

  <!-- 外框：上传前后保持一致，不跳变 -->
  <button
    class={`
      relative rounded-2xl border bg-bg-light dark:bg-bg-dark
      border-border-light dark:border-border-dark
      shadow-sm overflow-hidden
      transition-all duration-200
      ${
        isDragging
          ? 'ring-2 ring-primary-500/30 border-primary-500'
          : 'hover:border-primary-300 dark:hover:border-primary-900'
      }
    `}
    on:drop={onDrop}
    on:dragover|preventDefault={() => (isDragging = true)}
    on:dragleave={() => (isDragging = false)}
  >
    <!-- 预览区：更“横幅”，更小、更协调 -->
    <button
      type="button"
      class="relative w-full aspect-[21/9] max-h-[260px] flex items-center justify-center outline-none group"
      on:click={openPicker}
    >
      {#if !imageFile}
        <!-- 空态：更克制的 dropzone -->
        <div class="absolute inset-0 flex items-center justify-center p-4">
          <div
            class={`
              w-full h-full rounded-2xl border-2 border-dashed
              border-border-light dark:border-border-dark
              bg-bg-light/40 dark:bg-bg-dark/30
              flex flex-col items-center justify-center gap-2
              transition
              ${isDragging ? 'border-primary-500 bg-primary-50/10 dark:bg-primary-900/10' : 'hover:border-primary-400'}
            `}
          >
            <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 dark:bg-[#2a2a2a] shadow-sm">
              <span class="text-xl">🖼️</span>
            </div>

            <div class="text-center">
              <div class="text-sm font-semibold text-text-light dark:text-text-dark">
                {$i18n.t('Upload Reference Image')}
              </div>
              <div class="mt-1 text-[10px] text-text-lightSecondary dark:text-text-darkSecondary">
                {$i18n.t('Click or drag & drop')} · JPG / PNG / WEBP
              </div>
            </div>
          </div>
        </div>
      {:else}
        <!-- 有图态：像封面一样铺满 -->
        <img
          src={previewUrl}
          alt="preview"
          class={`absolute inset-0 w-full h-full ${fitMode === 'cover' ? 'object-cover' : 'object-contain'} bg-black`}
        />

        <!-- 渐变遮罩：保证按钮可读 -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-black/20" />

        <!-- 右上角操作：不依赖 iconify，永远不空白 -->
        <div class="absolute top-2 right-2 z-10 flex items-center gap-1.5">
          <!-- Fit：胶囊（带文字） -->
          <button
            type="button"
            class="h-8 px-2 rounded-full bg-white/85 hover:bg-white text-black shadow-sm
                   dark:bg-black/55 dark:hover:bg-black/65 dark:text-white
                   backdrop-blur flex items-center gap-1"
            title={fitMode === 'cover' ? 'Cover' : 'Contain'}
            on:click|stopPropagation={() => (fitMode = fitMode === 'cover' ? 'contain' : 'cover')}
          >
            <span class="text-[12px] font-bold leading-none">⤢</span>
            <span class="text-[10px] font-semibold opacity-80">
              {fitMode === 'cover' ? 'Cover' : 'Contain'}
            </span>
          </button>

          <!-- Replace -->
          <button
            type="button"
            class="h-8 w-8 rounded-full bg-white/85 hover:bg-white text-black shadow-sm
                   dark:bg-black/55 dark:hover:bg-black/65 dark:text-white
                   backdrop-blur flex items-center justify-center"
            title={$i18n.t('Replace')}
            on:click|stopPropagation={openPicker}
          >
            <span class="text-[14px] font-bold leading-none">↺</span>
          </button>

          <!-- Remove -->
          <button
            type="button"
            class="h-8 w-8 rounded-full bg-white/85 hover:bg-white text-black shadow-sm
                   dark:bg-black/55 dark:hover:bg-black/65 dark:text-white
                   backdrop-blur flex items-center justify-center"
            title={$i18n.t('Remove')}
            on:click|stopPropagation={clearFile}
          >
            <span class="text-[14px] font-bold leading-none">✕</span>
          </button>
        </div>
      {/if}
    </button>

    <!-- 底部信息条：完成态更舒服 -->
    <div class="px-3 py-2 border-t border-border-light dark:border-border-dark flex items-center justify-between">
      {#if !imageFile}
        <div class="text-[10px] text-text-lightSecondary dark:text-text-darkSecondary">
          {$i18n.t('Best for product shots or starting frames')}
        </div>
      {:else}
        <div class="text-[10px] text-text-lightSecondary dark:text-text-darkSecondary truncate">
          {fileTypeLabel}
        </div>

        <div class="text-[10px] text-text-lightSecondary dark:text-text-darkSecondary">
          {fitMode === 'cover' ? 'Cover' : 'Contain'}
        </div>
      {/if}
    </div>
  </button>
</section>
