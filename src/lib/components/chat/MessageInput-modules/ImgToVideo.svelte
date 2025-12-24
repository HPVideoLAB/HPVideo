<script lang="ts">
  import ImgToVideoUploader from './ImgToVideoUploader.svelte';
  import ImgToVideoParams from './ImgToVideoParams.svelte';

  type Resolution = '720p' | '1080p';
  type UploadStatus = 'idle' | 'valid' | 'uploading' | 'success' | 'error';
  type TaskStatus = 'idle' | 'submitting' | 'processing' | 'completed' | 'failed';

  type Transition = {
    duration: number; // seconds
    prompt?: string; // optional local prompt
  };

  const MAX_FILES = 5;
  const MAX_TOTAL_DURATION = 25;

  // UI state
  let files: File[] = []; // 只收图片（png/jpg）
  let status: UploadStatus = 'idle';
  let message = '';

  // Right params (per docs)
  let globalPrompt = '';
  let negativePrompt = ''; // 文档没有 negative，这里先保留（不发到 API）
  let resolution: Resolution = '720p';
  let seed = -1;

  // transitions length must be len(images) - 1
  let transitions: Transition[] = [];
  let taskStatus: TaskStatus = 'idle';
  let requestId = '';
  let outputUrl = '';

  // ===== helpers =====
  function isImage(f: File) {
    return f.type === 'image/png' || f.type === 'image/jpeg';
  }

  function clampFiles(next: File[]) {
    // 去重：name+size+lastModified
    const uniq = new Map<string, File>();
    for (const f of next.filter(isImage)) {
      uniq.set(`${f.name}-${f.size}-${f.lastModified}`, f);
    }
    return Array.from(uniq.values()).slice(0, MAX_FILES);
  }

  function syncTransitionsToFiles() {
    const need = Math.max(0, files.length - 1);
    if (transitions.length === need) return;

    // 保留已有前缀，补默认
    const next: Transition[] = [];
    for (let i = 0; i < need; i++) {
      next.push(transitions[i] ?? { duration: 5, prompt: '' });
    }
    transitions = next;
  }

  function totalDuration() {
    return transitions.reduce((sum, t) => sum + (Number(t.duration) || 0), 0);
  }

  function validateBeforeSubmit() {
    if (files.length < 2) {
      return 'Pikaframes 需要 2~5 张图片（keyframes）。';
    }
    if (!globalPrompt.trim()) {
      return '请填写提示词（Prompt）。';
    }
    const td = totalDuration();
    if (td > MAX_TOTAL_DURATION) {
      return `转场总时长不能超过 ${MAX_TOTAL_DURATION}s（当前 ${td}s）。`;
    }
    // transitions 必须等于 images-1
    if (transitions.length !== files.length - 1) {
      return '转场数量必须等于 图片数量 - 1。';
    }
    // duration 合法
    for (const [i, t] of transitions.entries()) {
      if (!Number.isFinite(t.duration) || t.duration <= 0) {
        return `第 ${i + 1} 段转场时长必须是正数。`;
      }
    }
    return '';
  }

  // ===== events from left =====
  function onFilesChange(next: File[]) {
    files = clampFiles(next);
    syncTransitionsToFiles();

    if (files.length === 0) {
      status = 'idle';
      message = '';
      return;
    }
    status = 'valid';
    message = `已选择 ${files.length} 张图片。`;
  }

  function onRemoveFile(index: number) {
    files = files.filter((_, i) => i !== index);
    syncTransitionsToFiles();

    if (files.length === 0) {
      status = 'idle';
      message = '';
    } else {
      status = 'valid';
      message = `已选择 ${files.length} 张图片。`;
    }
  }

  function onClear() {
    files = [];
    transitions = [];
    status = 'idle';
    message = '';
    taskStatus = 'idle';
    requestId = '';
    outputUrl = '';
  }

  // ===== API integration =====
  async function uploadImagesToUrls(imageFiles: File[]): Promise<string[]> {
    // 你需要实现这个后端：把 File 上传到对象存储，返回可访问 URL 列表
    const form = new FormData();
    imageFiles.forEach((f) => form.append('images', f));

    const res = await fetch('/api/upload/images', { method: 'POST', body: form });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    const data = await res.json();
    // 期望返回：{ urls: string[] }
    if (!data?.urls || !Array.isArray(data.urls)) throw new Error('Upload response invalid');
    return data.urls;
  }

  async function submitPikaTask(imageUrls: string[]) {
    const payload = {
      prompt: globalPrompt.trim(),
      images: imageUrls,
      transitions: transitions.map((t) => ({
        duration: Number(t.duration),
        ...(t.prompt?.trim() ? { prompt: t.prompt.trim() } : {}),
      })),
      resolution,
      seed,
    };

    const res = await fetch('/api/pika/v2.2-pikaframes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || 'Submit failed');
    }
    // 期望返回：{ id: string }
    return data.id as string;
  }

  async function pollResult(id: string) {
    taskStatus = 'processing';
    outputUrl = '';

    // 简单轮询：最多 120 次（约 2 分钟，间隔 1s）
    for (let i = 0; i < 120; i++) {
      const res = await fetch(`/api/pika/predictions/${id}/result`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Result failed');

      const status = data?.data?.status as string;
      if (status === 'completed') {
        const outputs = data?.data?.outputs;
        outputUrl = Array.isArray(outputs) ? outputs[0] : '';
        taskStatus = 'completed';
        return;
      }
      if (status === 'failed') {
        taskStatus = 'failed';
        throw new Error(data?.data?.error || 'Task failed');
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    throw new Error('Polling timeout');
  }

  async function generateNow() {
    const err = validateBeforeSubmit();
    if (err) {
      status = 'error';
      message = err;
      return;
    }

    try {
      status = 'uploading';
      message = '正在上传图片…';
      taskStatus = 'submitting';

      const urls = await uploadImagesToUrls(files);

      message = '提交生成任务…';
      requestId = await submitPikaTask(urls);

      message = '生成中…';
      await pollResult(requestId);

      status = 'success';
      message = '生成完成。';
    } catch (e: any) {
      status = 'error';
      taskStatus = 'failed';
      message = e?.message || '发生错误';
    }
  }

  // 初次/变更同步
  $: syncTransitionsToFiles();
</script>

<div class="w-full bg-transparent">
  <div class="mx-auto w-full p-3 !pt-0 sm:p-4">
    <div class="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
      <ImgToVideoUploader
        {files}
        {status}
        {message}
        on:filesChange={(e) => onFilesChange(e.detail)}
        on:removeFile={(e) => onRemoveFile(e.detail)}
        on:clear={onClear}
      />

      <ImgToVideoParams
        bind:globalPrompt
        bind:negativePrompt
        bind:resolution
        bind:seed
        bind:transitions
        {taskStatus}
        {outputUrl}
        {requestId}
        on:generate={generateNow}
      />
    </div>
  </div>
</div>
