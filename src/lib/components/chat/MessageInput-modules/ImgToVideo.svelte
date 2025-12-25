<script lang="ts">
  import { onDestroy } from 'svelte';
  import ImgToVideoUploader from './ImgToVideoUploader.svelte';
  import ImgToVideoParams from './ImgToVideoParams.svelte';

  import { getAccount } from '@wagmi/core';
  import { config as wconfig, modal, getUSDTBalance, tranUsdt } from '$lib/utils/wallet/bnb/index';
  import { bnbpaycheck } from '$lib/apis/pay';
  import { toast } from 'svelte-sonner';
  import { v4 as uuidv4 } from 'uuid';
  import { theme } from '$lib/stores';

  import { updateChatById } from '$lib/apis/chats';

  import { uploadImagesToOss, submitLargeLanguageModel, getLargeLanguageModelResult } from '$lib/apis/model/pika';

  // 抽离后的工具
  import type { Resolution, UploadStatus, TaskStatus, Transition, FormErrors } from './modules/types';
  import { IMG_TO_VIDEO_RULES as R } from './modules/types';
  import { clampImageFiles, syncTransitions, totalDuration, validateImgToVideoForm } from './modules/form';
  import { pollTaskResult } from './modules/task';

  // ====== 接收主页面传入（关键：写入旧聊天树） ======
  export let chatId: string = '';
  export let history: any;
  export let messages: any[] = [];
  export let selectedModels: string[] = [];

  // ====== UI 状态（左侧上传） ======
  let files: File[] = [];
  let status: UploadStatus = 'idle';
  let message = '';

  // ====== UI 状态（右侧参数） ======
  let globalPrompt = '';
  let negativePrompt = ''; // UI 保留，不发给 API
  let resolution: Resolution = '720p';
  let seed = -1;

  // transitions 必须 = files.length - 1
  let transitions: Transition[] = [];

  // ====== 表单错误（右侧展示） ======
  let errors: FormErrors = {};

  // ====== 任务状态 ======
  let taskStatus: TaskStatus = 'idle';
  let requestId = '';
  let outputUrl = '';

  // ====== 轮询控制器 ======
  let pollCtl: AbortController | null = null;

  onDestroy(() => stopPolling());

  function stopPolling() {
    pollCtl?.abort();
    pollCtl = null;
  }

  function getToken(): string {
    return localStorage.getItem('token') || localStorage.getItem('access_token') || '';
  }

  function syncTransitionsToFiles() {
    transitions = syncTransitions(files.length, transitions);
  }

  function getModelId() {
    return selectedModels?.[0] ?? 'img-to-video';
  }

  async function persistChat() {
    // local 或无 chatId 不落库
    if (!chatId || chatId === 'local') return;
    await updateChatById(localStorage.token, chatId, { messages, history });
  }

  function appendVideoChatMessages(params: {
    prompt: string;
    modelId: string;
    resolution: string;
    duration: number;
    seed: number;
    requestId: string;
    images: string[];
  }) {
    // 防御：若主页面没传 history/messages，这里直接抛错，避免 silent fail
    if (!history || !history.messages) {
      throw new Error('history 未传入 ImgToVideo');
    }

    const userId = uuidv4();
    const assistantId = uuidv4();

    const parentId = messages.length ? messages.at(-1).id : null;

    const userMessage = {
      id: userId,
      parentId,
      childrenIds: [],
      role: 'user',
      content: params.prompt,
      toolInfo: {
        type: 'img2video',
        requestId: params.requestId,
        images: params.images,
        resolution: params.resolution,
        duration: params.duration,
        seed: params.seed,
      },
      models: [params.modelId],
      timestamp: Math.floor(Date.now() / 1000),
    };

    // 注意：为了复用旧 ResponseMessage 的 VideoLoading/VideoPlay/VideoError
    // - processing：content 为空，done=false
    // - completed：content 为 mp4 url，done=true，status=completed
    // - failed：error=true，done=true，status=failed
    const assistantMessage = {
      id: assistantId,
      parentId: userId,
      childrenIds: [],
      role: 'assistant',
      model: params.modelId,

      size: params.resolution,
      duration: params.duration,

      status: 'processing',
      content: '',
      done: false,
      error: false,

      // 关闭旧支付分支（避免触发 pay UI）
      paystatus: true,
      paytype: 'paid',
      paymoney: 0,

      // 记录 requestId，后续如果你要做 refresh/重试可用
      createId: params.requestId,

      timestamp: Math.floor(Date.now() / 1000),
    };

    history.messages[userId] = userMessage;
    history.messages[assistantId] = assistantMessage;
    history.currentId = assistantId;

    // 挂到聊天树上
    if (parentId) {
      history.messages[parentId].childrenIds = [...(history.messages[parentId].childrenIds ?? []), userId];
    }
    history.messages[userId].childrenIds = [...(history.messages[userId].childrenIds ?? []), assistantId];

    return { userId, assistantId };
  }

  // ====== 左侧事件 ======
  function onFilesChange(next: File[]) {
    files = clampImageFiles(next);
    syncTransitionsToFiles();

    errors = { ...errors, __form: undefined };

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

    errors = { ...errors, __form: undefined };

    if (files.length === 0) {
      status = 'idle';
      message = '';
    } else {
      status = 'valid';
      message = `已选择 ${files.length} 张图片。`;
    }
  }

  function onClear() {
    stopPolling();

    files = [];
    transitions = [];
    status = 'idle';
    message = '';
    taskStatus = 'idle';
    requestId = '';
    outputUrl = '';
    errors = {};
  }

  async function uploadImagesToUrls(imageFiles: File[]): Promise<string[]> {
    const token = getToken();
    const resp = await uploadImagesToOss(token, imageFiles);
    return resp.urls;
  }

  // ====== 轮询任务结果（使用抽离的 pollTaskResult） ======
  async function pollResult(id: string) {
    taskStatus = 'processing';
    outputUrl = '';

    stopPolling();
    pollCtl = new AbortController();

    const ret = await pollTaskResult({
      requestId: id,
      fetcher: (rid) => getLargeLanguageModelResult(rid),
      signal: pollCtl.signal,
      onCompleted: (url) => {
        // completed 时即时更新 UI
        outputUrl = url;
      },
    });

    outputUrl = ret.url;
    taskStatus = 'completed';
  }

  function calcAmount(): string {
    return '0.0001';
  }

  async function payBeforeGenerate(): Promise<{ txHash?: string }> {
    const account = getAccount(wconfig);
    if (!account?.address) {
      try {
        if ($theme === 'system' || $theme === 'light') modal.setThemeMode('light');
        else modal.setThemeMode('dark');
      } catch {}
      modal.open();
      document.getElementById('connect-wallet-btn')?.click();
      throw new Error('请先连接钱包');
    }

    const address = account.address;
    const amount = calcAmount();
    const messageid = uuidv4();

    const body = {
      hash: '',
      address,
      messageid,
      model: 'img-to-video',
      size: resolution,
      duration: totalDuration(transitions),
      amount,
    };

    status = 'valid';
    taskStatus = 'submitting';
    message = '等待支付确认…';

    const check1 = await bnbpaycheck(getToken(), body);
    if (check1?.ok) {
      message = '支付已确认，开始生成…';
      return {};
    }

    message = '检查钱包余额…';
    const balance = await getUSDTBalance(address);

    if (!(Number(amount) > 0)) throw new Error('支付金额不合法');
    if (Number(balance) < Number(amount)) throw new Error('USDT 余额不足');

    message = '发起支付交易…';
    const txResponse = await tranUsdt(amount, messageid);
    if (!txResponse?.hash) throw new Error('交易未发出或用户取消');

    message = '支付确认中…';
    const check2 = await bnbpaycheck(getToken(), { ...body, hash: txResponse.hash });
    if (!check2?.ok) throw new Error('支付校验失败');

    toast.success('支付成功');
    message = '支付成功，开始生成…';
    return { txHash: txResponse.hash };
  }

  async function generateNow() {
    // 1) 校验
    const v = validateImgToVideoForm({
      filesLen: files.length,
      globalPrompt,
      transitions,
      seed,
    });
    errors = v.errors;

    if (!v.ok) {
      status = 'error';
      message = v.errors.__form || '请检查表单参数。';
      return;
    }

    let assistantId: string | null = null;

    try {
      // 2) 支付
      await payBeforeGenerate();

      // 3) 上传 + 提交
      status = 'uploading';
      message = '正在上传图片…';
      taskStatus = 'submitting';

      outputUrl = '';
      requestId = '';

      const urls = await uploadImagesToUrls(files);

      message = '提交生成任务…';
      const submitResp = await submitLargeLanguageModel({
        prompt: globalPrompt.trim(),
        images: urls,
        transitions: transitions.map((t) => ({
          duration: Number(t.duration),
          ...(t.prompt?.trim() ? { prompt: t.prompt.trim() } : {}),
        })),
        resolution,
        seed,
      });

      requestId = submitResp.requestId;

      // === 写入旧聊天树：生成中（最小复用旧 UI） ===
      const modelId = getModelId();
      const duration = totalDuration(transitions);

      const ids = appendVideoChatMessages({
        prompt: globalPrompt.trim(),
        modelId,
        resolution,
        duration,
        seed,
        requestId,
        images: urls,
      });

      assistantId = ids.assistantId;
      await persistChat();

      // 4) 轮询
      message = '生成中…';
      await pollResult(requestId);

      // === 写入旧聊天树：完成 ===
      if (assistantId && history?.messages?.[assistantId]) {
        history.messages[assistantId].status = 'completed';
        history.messages[assistantId].content = outputUrl; // 纯 URL，旧 VideoPlay 直接吃
        history.messages[assistantId].done = true;
        history.messages[assistantId].error = false;
        history.messages[assistantId].replytime = Math.floor(Date.now() / 1000);
        await persistChat();
      }

      status = 'success';
      message = '生成完成。';
    } catch (e: any) {
      status = 'error';
      taskStatus = 'failed';
      message = e?.message || '发生错误';

      // === 写入旧聊天树：失败 ===
      if (assistantId && history?.messages?.[assistantId]) {
        history.messages[assistantId].status = 'failed';
        history.messages[assistantId].done = true;
        history.messages[assistantId].error = true;
        history.messages[assistantId].errmsg = e?.message || 'Video Generation Failed';
        await persistChat();
      }
    }
  }

  // 文件变化时自动同步 transitions
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
        {errors}
        on:generate={generateNow}
      />
    </div>
  </div>
</div>
