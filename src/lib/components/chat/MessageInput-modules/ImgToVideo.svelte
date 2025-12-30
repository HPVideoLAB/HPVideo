<script lang="ts">
  import { getContext } from 'svelte';
  import { get } from 'svelte/store';

  // 1. 引入原有组件 (Pika)
  import ImgToVideoUploader from './ImgToVideoUploader.svelte';
  import ImgToVideoParams from './ImgToVideoParams.svelte';

  // 2. 引入新增组件 (Wan / SAM)
  import VideoUploader from './VideoUploader.svelte';
  import WanParams from './WanParams.svelte';
  import SamParams from './SamParams.svelte';

  // 核心服务 & Store
  import { VideoChatService } from '$lib/services/VideoChatService';
  import { settings, theme } from '$lib/stores';

  // 支付 & 钱包
  import { getAccount } from '@wagmi/core';
  import { config as wconfig, modal, getUSDTBalance, tranUsdt } from '$lib/utils/wallet/bnb/index';
  import { bnbpaycheck } from '$lib/apis/pay';
  import { toast } from 'svelte-sonner';
  import { v4 as uuidv4 } from 'uuid';

  // 工具
  import type { Resolution, UploadStatus, TaskStatus, Transition, FormErrors } from './modules/types';
  import { clampImageFiles, syncTransitions, totalDuration, validateImgToVideoForm } from './modules/form';

  const i18n: any = getContext('i18n');
  const getToken = () => localStorage.getItem('token') || localStorage.getItem('access_token') || '';

  // ====== 🤖 1. 模型判断逻辑 ======
  $: currentModelId = $settings?.models?.[0] ?? 'pika-v2.2-pikaframes'; // 获取当前选中的模型ID

  // 简单的字符串匹配判断
  $: isWan = currentModelId.includes('wan');
  $: isSam = currentModelId.includes('sam');
  $: isPika = !isWan && !isSam;

  // ====== UI 状态 ======
  let taskStatus: TaskStatus = 'idle';
  let status: UploadStatus = 'idle';
  let message = '';
  let errors: FormErrors | any = {};

  // --- 文件状态 ---
  let files: File[] = []; // Pika 用图片
  let videoFile: File | null = null; // Wan/Sam 用视频

  // --- 通用参数 ---
  let globalPrompt = '';
  let seed = -1;

  // --- Pika 专属参数 ---
  let resolution: Resolution = '720p';
  let transitions: Transition[] = [];

  // --- Wan 专属参数 ---
  let wanNegativePrompt = '';
  let wanStrength = 0.9;
  let wanDuration = 5;
  let wanSteps = 30;
  let wanGuidance = 5;
  let wanShift = 3;
  let wanLoras: { path: string; scale: number }[] = []; // 绑定子组件

  // --- SAM 专属参数 ---
  let samApplyMask = true;

  // ====== 交互逻辑 ======

  // A. Pika 图片处理 (保持原样)
  function syncTransitionsToFiles() {
    if (isPika) transitions = syncTransitions(files.length, transitions);
  }

  function onFilesChange(next: File[]) {
    files = clampImageFiles(next);
    syncTransitionsToFiles();
    updateStatus();
  }

  function onRemoveFile(index: number) {
    files = files.filter((_, i) => i !== index);
    syncTransitionsToFiles();
    updateStatus();
  }

  // B. Wan/SAM 视频处理 (新增)
  function onVideoChange(f: File | null) {
    videoFile = f;
    updateStatus();
  }

  // 统一状态更新
  function updateStatus() {
    errors = {}; // 清空错误
    if (isPika) {
      if (files.length === 0) {
        status = 'idle';
        message = '';
      } else {
        status = 'valid';
        message = `已选择 ${files.length} 张图片。`;
      }
    } else {
      // Wan / Sam
      if (!videoFile) {
        status = 'idle';
        message = '';
      } else {
        status = 'valid';
        message = `已选择视频: ${videoFile.name}`;
      }
    }
  }

  function onClear() {
    files = [];
    videoFile = null;
    transitions = [];
    status = 'idle';
    message = '';
    taskStatus = 'idle';
    errors = {};
  }

  // ====== 支付逻辑 (修改适配多模型) ======
  function calcAmount(): number {
    return 0.0001;
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
    const amount = calcAmount().toString();
    const messageid = uuidv4();

    // 🔥 动态计算时长 (Pika 算 transitions，Wan 算 wanDuration，Sam 默认 5)
    let currentDuration = 0;
    if (isPika) currentDuration = totalDuration(transitions);
    else if (isWan) currentDuration = wanDuration;
    else currentDuration = 5;

    // 预检参数
    const body = {
      hash: '',
      address,
      messageid,
      model: 'img-to-video',
      size: resolution, // Wan/Sam 虽然没选分辨率，但传个默认值无妨
      duration: currentDuration,
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

  // ====== 🔥 核心提交逻辑 (Generate) ======
  async function generateNow() {
    errors = {};

    // 1. 校验逻辑 (分流)
    if (!globalPrompt.trim()) {
      errors = { globalPrompt: '提示词不能为空' };
      status = 'error';
      message = '提示词不能为空';
      return;
    }

    if (isPika) {
      // 原有 Pika 校验
      const v = validateImgToVideoForm({ filesLen: files.length, globalPrompt, transitions, seed });
      if (!v.ok) {
        errors = v.errors;
        status = 'error';
        message = v.errors.__form || '请检查表单参数。';
        return;
      }
    } else {
      // Wan / Sam 校验
      if (!videoFile) {
        status = 'error';
        message = '请先上传源视频';
        return;
      }
    }

    try {
      // 2. 支付 (保留你的逻辑)
      await payBeforeGenerate();

      taskStatus = 'submitting';
      message = '正在提交任务...';

      // 3. 准备文件 (动态选择)
      const filesToUpload = (isWan || isSam) && videoFile ? [videoFile] : files;

      // 4. 调用 Service (传大对象，Service 负责清洗)
      // 注意：这里我们传入所有可能用到的参数，Service 内部会根据 selectedModels[0] 来决定用哪些
      await VideoChatService.submitTask({
        // 基础参数
        files: filesToUpload,
        prompt: globalPrompt,
        seed: seed,
        amount: 0.0001,
        selectedModels: [currentModelId], // 传入真实 ID
        token: getToken(),
        translateFn: get(i18n).t,

        // Pika 参数
        resolution: isPika ? resolution : undefined,
        transitions: isPika ? transitions : undefined,
        // 这里为了兼容 Service 里的 duration 字段
        duration: isPika ? totalDuration(transitions) : isWan ? wanDuration : 5,

        // Wan 参数
        negative_prompt: isWan ? wanNegativePrompt : undefined,
        strength: isWan ? wanStrength : undefined,
        num_inference_steps: isWan ? wanSteps : undefined,
        guidance_scale: isWan ? wanGuidance : undefined,
        flow_shift: isWan ? wanShift : undefined,
        loras: isWan ? wanLoras : undefined, // 风格数据

        // Sam 参数
        apply_mask: isSam ? samApplyMask : undefined,
      });

      // 5. 成功反馈
      status = 'success';
      message = '任务已提交，请查看上方对话框进度';
      taskStatus = 'idle';
    } catch (e: any) {
      console.error(e);
      status = 'error';
      taskStatus = 'failed';
      message = e?.message || '发生错误';
    }
  }

  let showHeight = true;
  $: syncTransitionsToFiles(); // 保持对 files 变化的监听
</script>

<div class={`w-full pb-1 bg-transparent ${showHeight ? 'h-full' : 'h-0'}`}>
  <div class="mx-auto w-full px-3">
    <div class="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
      <div class="h-full">
        {#if isWan || isSam}
          <VideoUploader {videoFile} {status} {message} on:fileChange={(e) => onVideoChange(e.detail)} />
        {:else}
          <ImgToVideoUploader
            {files}
            {status}
            {message}
            on:filesChange={(e) => onFilesChange(e.detail)}
            on:removeFile={(e) => onRemoveFile(e.detail)}
            on:clear={onClear}
          />
        {/if}
      </div>

      <div>
        {#if isPika}
          <ImgToVideoParams
            bind:globalPrompt
            bind:resolution
            bind:seed
            bind:transitions
            {taskStatus}
            {errors}
            on:generate={generateNow}
          />
        {:else if isWan}
          <WanParams
            bind:globalPrompt
            bind:negativePrompt={wanNegativePrompt}
            bind:strength={wanStrength}
            bind:seed
            bind:duration={wanDuration}
            bind:num_inference_steps={wanSteps}
            bind:guidance_scale={wanGuidance}
            bind:flow_shift={wanShift}
            bind:loras={wanLoras}
            {taskStatus}
            {errors}
            on:generate={generateNow}
          />
        {:else if isSam}
          <SamParams bind:globalPrompt bind:applyMask={samApplyMask} {taskStatus} {errors} on:generate={generateNow} />
        {/if}
      </div>
    </div>
  </div>
</div>
