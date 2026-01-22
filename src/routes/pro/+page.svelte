<script lang="ts">
  import WalletConnect from '$lib/components/wallet/WalletConnect.svelte';
  import MyVideo from './modules/MyVideo.svelte';
  import { walletAddress } from '$lib/stores/wallet';
  import { ensureWalletConnected } from '$lib/utils/wallet/check';
  import { calculateCost } from '$lib/utils/pro/pricing';
  import { getContext, onMount, tick } from 'svelte';
  // 🔥 新引入的恢复工具
  import { restoreProParams } from '$lib/utils/pro/history-restore';
  import { initPageFlag } from '$lib/stores';
  import { urlToFileApi } from '$lib/apis/model/pika';

  // 子组件
  import ImgToVideoUploader from './modules/pika/ImgToVideoUploader.svelte';
  import ImgToVideoParams from './modules/pika/ImgToVideoParams.svelte';
  import SamParams from './modules/sams/SamParams.svelte';
  import SamVideoUploader from './modules/sams/VideoUploader.svelte';
  import WanVideoUploader from './modules/wan/VideoUploader.svelte';
  import WanParams from './modules/wan/WanParams.svelte';
  import ExampleCard from './modules/ExampleCard.svelte';
  import MySelect from '$lib/components/common/MySelect.svelte';
  import { toast } from 'svelte-sonner';

  // Hooks & Constants
  import { proModel } from '../../constants/pro-model';
  import { useVideoGeneration } from '$lib/hooks/useVideoGeneration';
  import { usePayment } from '$lib/hooks/useProPayment';
  import {
    validateImgToVideoForm,
    syncTransitions,
    totalDuration,
    validateWanForm,
    validateSamForm,
  } from './modules/form';

  const { isGenerating, history, submitPika, submitWan, submitSam, loadHistory } = useVideoGeneration();
  const { pay } = usePayment();
  const i18n: any = getContext('i18n');

  // --- 模型选择 ---
  $: modelOptions = proModel.map((m) => ({
    value: m.model,
    label: m.name,
    icon: m.modelicon,
    hasAudio: m.audio,
    desc: $i18n.t(`model_desc_${m.model}`),
  }));
  let currentModelValue = proModel[2]?.model || '';

  // ==========================================
  // 🟢 Pika State (聚合)
  // ==========================================
  let pikaForm = {
    files: [] as File[],
    prompt: '',
    resolution: '720p' as '720p' | '1080p',
    seed: -1,
    transitions: [] as any[],
    errors: {} as any,
  };

  // 响应式逻辑
  $: pikaForm.transitions = syncTransitions(pikaForm.files.length, pikaForm.transitions);
  $: pikaDuration = Math.max(totalDuration(pikaForm.transitions), 5);
  $: pikaCost = calculateCost('pika', {
    resolution: pikaForm.resolution,
    duration: totalDuration(pikaForm.transitions),
  });

  // ==========================================
  // 🔵 Wan State (聚合)
  // ==========================================
  let wanForm = {
    video: null as File | null,
    prompt: '',
    negative_prompt: '',
    strength: 0.9,
    seed: -1,
    loras: [] as any[],
    duration: 5,
    steps: 30,
    cfg: 5,
    flow: 3,
    errors: {} as any,
  };

  $: wanCost = calculateCost('wan', { duration: wanForm.duration });

  // ==========================================
  // 🟣 Sam State (聚合)
  // ==========================================
  let samForm = {
    video: null as File | null,
    prompt: '',
    mask: true,
    duration: 5, // 真实时长
    errors: {} as any,
  };

  $: samCost = calculateCost('sam', { duration: samForm.duration });

  // ==========================================
  // ⚡️ 逻辑：历史记录回填 (点击卡片)
  // ==========================================
  async function handleHistorySelect(e: CustomEvent) {
    const item = e.detail;
    if (!item?.params) return;

    // 自动切 Tab
    const targetModel = proModel.find((m) => m.model.includes(item.params.model));
    if (targetModel) currentModelValue = targetModel.model;
    await tick();

    // 回填参数
    await restoreProParams(item.params, {
      setPika: (data) => {
        pikaForm = { ...pikaForm, ...data };
        if (data.transitions) pikaForm.transitions = data.transitions;
      },
      setWan: (data) => {
        wanForm = { ...wanForm, ...data };
      },
      setSam: (data) => {
        samForm = { ...samForm, ...data, mask: data.apply_mask ?? true };
      },
    });
  }

  // ==========================================
  // 🔥🔥🔥 逻辑：失败任务重试 (智能判断 + 自动提交)
  // ==========================================
  const handleRetryVideo = async (e: CustomEvent) => {
    const item = e.detail;
    if (!item || !item.params) return;

    // 1. 拿凭证
    const oldTxHash = item.txHash || item.params?.txHash;
    if (!oldTxHash) {
      return toast.error($i18n.t('Unable to retrieve payment proof for retry'));
    }

    // 2. 切 Tab
    const targetModel = proModel.find((m) => m.model.includes(item.params.model));
    if (targetModel) currentModelValue = targetModel.model;
    await tick();

    // 3. 🔥🔥🔥 智能判断：如果表单里已经有文件了，直接提交，别再去折腾下载了！
    let isReady = false;

    if (item.model.includes('pika')) {
      // Pika: 如果文件数组不为空，说明就绪
      if (pikaForm.files.length > 0) isReady = true;
    } else if (item.model.includes('wan')) {
      // Wan: 必须是 File 对象 (不能是 null 或 URL字符串)
      if (wanForm.video instanceof File) isReady = true;
    } else if (item.model.includes('sam')) {
      // Sam: 必须是 File 对象
      if (samForm.video instanceof File) isReady = true;
    }

    // 4. 分支逻辑
    if (isReady) {
      console.log('✨ 资源已就绪，直接发起重试...');
      // A. 资源已在表单中 -> 直接生成
      await executeGenerate(item.model, oldTxHash);
    } else {
      console.log('📥 资源未就绪，开始回填...');
      // B. 资源不在 -> 走老路：回填 + 等待 + 生成

      // 复用回填逻辑
      await handleHistorySelect(e);

      // 等待文件就绪 (加个保险，防止 handleHistorySelect 里的下载没跑完)
      const readyAfterWait = await waitForFile(item.model);
      if (!readyAfterWait) return;

      // 生成
      await executeGenerate(item.model, oldTxHash);
    }
  };

  // 🛠️ 抽取生成逻辑 (避免重复代码)
  const executeGenerate = async (model: string, txHash: string) => {
    // 传入 true 表示保留参数，不要清空表单！
    if (model.includes('pika')) {
      await handlePikaGenerate(txHash, true);
    } else if (model.includes('wan')) {
      await handleWanGenerate(txHash, true);
    } else if (model.includes('sam')) {
      await handleSamGenerate(txHash, true);
    }
  };

  // 🛠️ 辅助函数：简单的等待器 (放在 script 底部即可)
  const waitForFile = async (model: string) => {
    let attempts = 0;
    while (attempts < 150) {
      // 最多等30秒
      if (model.includes('pika') && pikaForm.files.length > 0) return true;
      // 必须判断是 File 对象，防止拿到旧的 URL 字符串
      if (model.includes('wan') && wanForm.video instanceof File) return true;
      if (model.includes('sam') && samForm.video instanceof File) return true;

      await new Promise((r) => setTimeout(r, 200)); // 每0.2秒看一眼
      attempts++;
    }
    toast.error($i18n.t('Timeout waiting for asset restoration'));
    return false;
  };

  // ==========================================
  // ⚡️ 提交处理 (修改：支持 reuseTxHash)
  // ==========================================

  // 🟢 Pika
  const handlePikaGenerate = async (reuseTxHash?: string, keepParams?: boolean) => {
    const address = await ensureWalletConnected();
    if (!address) return;
    if (pikaForm.files.length < 2) return toast.warning($i18n.t('Please upload images'));

    const check = validateImgToVideoForm({
      filesLen: pikaForm.files.length,
      globalPrompt: pikaForm.prompt,
      transitions: pikaForm.transitions,
      seed: pikaForm.seed,
    });
    if (!check.ok) {
      pikaForm.errors = check.errors;
      return;
    }
    pikaForm.errors = {};

    let finalTxHash = reuseTxHash;

    // 🔥 如果没有传入复用的 Hash，才走支付流程
    if (!finalTxHash) {
      const payment = await pay({
        amount: pikaCost,
        model: 'pika',
        resolution: pikaForm.resolution,
        duration: pikaDuration,
      });
      if (!payment.success) return;
      finalTxHash = payment.txHash;
    } else {
      // toast.info($i18n.t('Retrying with previous payment...'));
    }

    await submitPika(
      {
        files: pikaForm.files,
        prompt: pikaForm.prompt,
        resolution: pikaForm.resolution,
        transitions: pikaForm.transitions,
        seed: pikaForm.seed,
        txHash: finalTxHash, // 🔥 传给后端验证
      },
      $walletAddress,
      () => {
        loadHistory($walletAddress);
        // 🔥🔥🔥 关键修改：只有不保留参数时，才清空表单 🔥🔥🔥
        if (!keepParams) {
          pikaForm.files = [];
          pikaForm.prompt = ''; // 视情况是否清空提示词
        }
      }
    );
  };

  // 🔵 Wan
  const handleWanGenerate = async (reuseTxHash?: string, keepParams?: boolean) => {
    const address = await ensureWalletConnected();
    if (!address) return;
    if (!wanForm.video) return toast.warning($i18n.t('Please upload video'));

    const check = validateWanForm({
      hasVideo: !!wanForm.video,
      prompt: wanForm.prompt,
      duration: wanForm.duration,
      num_inference_steps: wanForm.steps,
      guidance_scale: wanForm.cfg,
      flow_shift: wanForm.flow,
      seed: wanForm.seed,
      loras: wanForm.loras,
    });
    if (!check.ok) {
      wanForm.errors = check.errors;
      return;
    }
    wanForm.errors = {};

    let finalTxHash = reuseTxHash;

    // 🔥 支付判断
    if (!finalTxHash) {
      const payment = await pay({
        amount: wanCost,
        model: 'wan-2.1',
        resolution: '720p',
        duration: wanForm.duration,
      });
      if (!payment.success) return;
      finalTxHash = payment.txHash;
    } else {
      // toast.info($i18n.t('Retrying with previous payment...'));
    }

    await submitWan(
      {
        videoFile: wanForm.video!,
        prompt: wanForm.prompt,
        negative_prompt: wanForm.negative_prompt,
        strength: wanForm.strength,
        seed: wanForm.seed,
        loras: wanForm.loras,
        duration: wanForm.duration,
        num_inference_steps: wanForm.steps,
        guidance_scale: wanForm.cfg,
        flow_shift: wanForm.flow,
        txHash: finalTxHash, // 🔥
      },
      $walletAddress,
      () => {
        loadHistory($walletAddress);
        // 🔥🔥🔥 关键修改 🔥🔥🔥
        if (!keepParams) {
          wanForm.video = null; // 只有非重试模式才清空
        }
      }
    );
  };

  // 🟣 Sam
  const handleSamGenerate = async (reuseTxHash?: string, keepParams?: boolean) => {
    const address = await ensureWalletConnected();
    if (!address) return;
    if (!samForm.video) return toast.warning($i18n.t('Please upload video'));

    const check = validateSamForm({ hasVideo: !!samForm.video, prompt: samForm.prompt });
    if (!check.ok) {
      samForm.errors = check.errors;
      return;
    }
    samForm.errors = {};

    let finalTxHash = reuseTxHash;

    // 🔥 支付判断
    if (!finalTxHash) {
      const payment = await pay({
        amount: samCost,
        model: 'sam3',
        resolution: 'original',
        duration: samForm.duration,
      });
      if (!payment.success) return;
      finalTxHash = payment.txHash;
    } else {
      // toast.info($i18n.t('Retrying with previous payment...'));
    }

    await submitSam(
      {
        videoFile: samForm.video!,
        prompt: samForm.prompt,
        apply_mask: samForm.mask,
        txHash: finalTxHash, // 🔥
      },
      $walletAddress,
      () => {
        loadHistory($walletAddress);
        // 🔥🔥🔥 关键修改 🔥🔥🔥
        if (!keepParams) {
          samForm.video = null;
        }
      }
    );
  };

  // 自动加载
  $: loadHistory($walletAddress);

  onMount(() => {
    initPageFlag.set(true);
  });
</script>

<div class="flex flex-col min-h-screen bg-bg-light dark:bg-bg-dark text-text-light dark:text-text-dark">
  <nav
    class="fixed top-0 w-full z-[999999] px-3 py-2.5 md:px-4 md:py-4 flex justify-between items-center backdrop-blur-md border-b border-border-light dark:border-border-dark"
  >
    <a href="/creator" class="flex items-center cursor-pointer select-none">
      <span
        class="text-base md:text-2xl font-bold tracking-tight bg-gradient-to-r from-primary-400 via-primary-500 to-violet-400 bg-clip-text text-transparent drop-shadow-[0_1px_10px_rgba(194,19,242,0.22)]"
      >
        HPVideo Pro
      </span>
    </a>
    <div><WalletConnect /></div>
  </nav>

  <main
    class="w-full flex flex-col gap-5 md:flex-row pt-[80px] pb-3 px-3 h-screen overflow-auto md:overflow-hidden md:px-4"
  >
    <div
      class="border-border-light flex flex-col gap-2 pr-3 relative dark:border-border-dark border-r flex-[2.5] xl:flex-[1.7] md:overflow-y-auto scroll-fade"
    >
      <div class="max-w-[270px]">
        <MySelect options={modelOptions} bind:value={currentModelValue} />
      </div>

      {#if currentModelValue === 'pika-v2.2-pikaframes'}
        <ImgToVideoUploader
          bind:files={pikaForm.files}
          status={$isGenerating ? 'uploading' : 'idle'}
          on:filesChange={(e) => (pikaForm.files = e.detail)}
          on:removeFile={(e) => (pikaForm.files = pikaForm.files.filter((_, i) => i !== e.detail))}
          on:clear={() => (pikaForm.files = [])}
        />
      {:else if currentModelValue === 'sam3-video'}
        <SamVideoUploader
          bind:videoFile={samForm.video}
          on:fileChange={(e) => (samForm.video = e.detail)}
          on:durationChange={(e) => (samForm.duration = e.detail)}
        />
      {:else}
        <WanVideoUploader bind:videoFile={wanForm.video} on:fileChange={(e) => (wanForm.video = e.detail)} />
      {/if}

      <ExampleCard {currentModelValue} on:select={handleHistorySelect} />

      <div
        class="bg-bg-light dark:bg-bg-dark rounded-2xl md:sticky md:bottom-0 md:left-0 z-[99] border-t border-border-light dark:border-border-dark shadow-[0_-10px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-10px_20px_rgba(0,0,0,0.7)]"
      >
        {#if currentModelValue === 'pika-v2.2-pikaframes'}
          <ImgToVideoParams
            bind:globalPrompt={pikaForm.prompt}
            bind:resolution={pikaForm.resolution}
            bind:seed={pikaForm.seed}
            bind:transitions={pikaForm.transitions}
            costUsd={pikaCost}
            errors={pikaForm.errors}
            taskStatus={$isGenerating ? 'submitting' : 'idle'}
            on:generate={() => handlePikaGenerate()}
          />
        {:else if currentModelValue === 'sam3-video'}
          <SamParams
            bind:globalPrompt={samForm.prompt}
            bind:applyMask={samForm.mask}
            costUsd={samCost}
            errors={samForm.errors}
            taskStatus={$isGenerating ? 'submitting' : 'idle'}
            on:generate={() => handleSamGenerate()}
          />
        {:else}
          <WanParams
            bind:globalPrompt={wanForm.prompt}
            bind:negativePrompt={wanForm.negative_prompt}
            bind:strength={wanForm.strength}
            bind:seed={wanForm.seed}
            bind:loras={wanForm.loras}
            bind:duration={wanForm.duration}
            bind:num_inference_steps={wanForm.steps}
            bind:guidance_scale={wanForm.cfg}
            bind:flow_shift={wanForm.flow}
            costUsd={wanCost}
            errors={wanForm.errors}
            taskStatus={$isGenerating ? 'submitting' : 'idle'}
            on:generate={() => handleWanGenerate()}
          />
        {/if}
      </div>
    </div>

    <div class="flex-[3]">
      <MyVideo items={$history} on:select={handleHistorySelect} on:retry={handleRetryVideo} />
    </div>
  </main>
</div>

<style>
  .scroll-fade {
    scrollbar-gutter: stable;
    --sb-thumb: rgba(180, 180, 180, 0);
    --sb-thumb-dark: rgba(180, 180, 180, 0);
    transition: --sb-thumb 200ms ease, --sb-thumb-dark 200ms ease;
  }
  .scroll-fade:hover {
    --sb-thumb: rgba(180, 180, 180, 0.35);
    --sb-thumb-dark: rgba(180, 180, 180, 0.25);
  }
  .scroll-fade::-webkit-scrollbar {
    width: 10px;
  }
  .scroll-fade::-webkit-scrollbar-track {
    background: transparent;
  }
  .scroll-fade::-webkit-scrollbar-thumb {
    background-color: var(--sb-thumb);
    border-radius: 999px;
    border: 3px solid transparent;
    background-clip: padding-box;
  }
  .dark .scroll-fade::-webkit-scrollbar-thumb {
    background-color: var(--sb-thumb-dark);
  }
  .scroll-fade {
    scrollbar-width: thin;
    scrollbar-color: rgba(180, 180, 180, 0) transparent;
  }
  .scroll-fade:hover {
    scrollbar-color: rgba(180, 180, 180, 0.35) transparent;
  }
  .dark .scroll-fade:hover {
    scrollbar-color: rgba(180, 180, 180, 0.25) transparent;
  }
</style>
