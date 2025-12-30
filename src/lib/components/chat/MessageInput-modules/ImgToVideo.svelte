<script lang="ts">
  import { getContext } from 'svelte';
  import { get } from 'svelte/store'; // 引入 get

  // 组件引用
  import ImgToVideoUploader from './ImgToVideoUploader.svelte';
  import ImgToVideoParams from './ImgToVideoParams.svelte';

  // 核心服务引用
  import { VideoChatService } from '$lib/services/VideoChatService';

  // Store 引用 (新增 settings)
  import { settings, theme } from '$lib/stores';

  // 支付 & 钱包引用
  import { getAccount } from '@wagmi/core';
  import { config as wconfig, modal, getUSDTBalance, tranUsdt } from '$lib/utils/wallet/bnb/index';
  import { bnbpaycheck } from '$lib/apis/pay';
  import { toast } from 'svelte-sonner';
  import { v4 as uuidv4 } from 'uuid';

  // 工具引用
  import type { Resolution, UploadStatus, TaskStatus, Transition, FormErrors } from './modules/types';
  import { clampImageFiles, syncTransitions, totalDuration, validateImgToVideoForm } from './modules/form';

  const i18n: any = getContext('i18n');

  // ====== UI 状态 ======
  let files: File[] = [];
  let status: UploadStatus = 'idle';
  let message = '';

  let globalPrompt = '';
  let resolution: Resolution = '720p';
  let seed = -1;
  let transitions: Transition[] = [];
  let errors: FormErrors = {};

  let taskStatus: TaskStatus = 'idle';

  function getToken(): string {
    return localStorage.getItem('token') || localStorage.getItem('access_token') || '';
  }

  // ====== 交互逻辑 ======
  function syncTransitionsToFiles() {
    transitions = syncTransitions(files.length, transitions);
  }

  function onFilesChange(next: File[]) {
    files = clampImageFiles(next);
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
    files = [];
    transitions = [];
    status = 'idle';
    message = '';
    taskStatus = 'idle';
    errors = {};
  }

  function calcAmount(): number {
    return 0.0001;
  }

  // ====== 支付逻辑 (保留) ======
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

    // 预检参数
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

  // ====== 核心提交逻辑 ======
  async function generateNow() {
    // 1. 校验
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

    try {
      // 2. 支付
      await payBeforeGenerate();

      taskStatus = 'submitting';
      message = '正在提交任务...';

      // 3. 获取当前选中的模型 (动态获取，默认 wan-2.5)
      const currentModels = get(settings)?.models || ['wan-2.5'];

      // 4. 🔥 调用 Service 全权代理 🔥
      await VideoChatService.submitTask({
        files: files,
        prompt: globalPrompt,
        transitions: transitions,
        resolution: resolution,
        seed: seed,
        amount: 0.00001,
        duration: totalDuration(transitions),
        // ✅ 修正：使用动态获取的模型
        selectedModels: currentModels,
        token: getToken(),
        // ✅ 修正：正确获取翻译函数
        translateFn: get(i18n).t,
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
  $: syncTransitionsToFiles();
  const toggleHeight = () => (showHeight = !showHeight);
</script>

<div class={`w-full bg-transparent ${showHeight ? 'h-full' : 'h-0'}`}>
  <!-- <button class="btn" on:click={toggleHeight}>高度</button> -->
  <div class="mx-auto w-full px-3">
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
        bind:resolution
        bind:seed
        bind:transitions
        {taskStatus}
        {errors}
        on:generate={generateNow}
      />
    </div>
  </div>
</div>
