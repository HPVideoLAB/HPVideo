<script lang="ts">
  import WalletConnect from '$lib/components/wallet/WalletConnect.svelte';
  import MyVideo from './modules/MyVideo.svelte';
  import { walletAddress } from '$lib/stores/wallet';
  import { ensureWalletConnected } from '$lib/utils/wallet/check';
  import { calculateCost } from '$lib/utils/pro/pricing';

  // 🔥 新引入的恢复工具
  import { restoreProParams } from '$lib/utils/pro/history-restore';

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
  import { tick } from 'svelte';

  const { isGenerating, history, submitPika, submitWan, submitSam, loadHistory } = useVideoGeneration();
  const { pay } = usePayment();

  // --- 模型选择 ---
  $: modelOptions = proModel.map((m) => ({
    value: m.model,
    label: m.name,
    icon: m.modelicon,
    hasAudio: m.audio,
    desc: m.desc,
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
  // ⚡️ 逻辑：历史记录回填 (极简版)
  // ==========================================
  async function handleHistorySelect(e: CustomEvent) {
    const item = e.detail;
    if (!item?.params) return;

    // 自动切 Tab
    const targetModel = proModel.find((m) => m.model.includes(item.params.model));
    if (targetModel) currentModelValue = targetModel.model;
    await tick();

    // 🔥 调用抽离的工具函数
    await restoreProParams(item.params, {
      setPika: (data) => {
        // 支持部分更新 (合并)
        pikaForm = { ...pikaForm, ...data };
        if (data.transitions) pikaForm.transitions = data.transitions; // 强制覆盖转场
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
  // ⚡️ 提交处理 (代码结构保持，但使用聚合对象)
  // ==========================================
  const handlePikaGenerate = async () => {
    const address = await ensureWalletConnected();
    if (!address) return;
    if (pikaForm.files.length < 2) return toast.warning('Please upload images');

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

    const payment = await pay({
      amount: pikaCost,
      model: 'pika',
      resolution: pikaForm.resolution,
      duration: pikaDuration,
    });
    if (!payment.success) return;

    await submitPika(
      {
        files: pikaForm.files,
        prompt: pikaForm.prompt,
        resolution: pikaForm.resolution,
        transitions: pikaForm.transitions,
        seed: pikaForm.seed,
      },
      $walletAddress,
      () => loadHistory($walletAddress)
    );
  };

  const handleWanGenerate = async () => {
    const address = await ensureWalletConnected();
    if (!address) return;
    if (!wanForm.video) return toast.warning('Please upload video');

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

    const payment = await pay({
      amount: wanCost,
      model: 'wan-2.1',
      resolution: '720p',
      duration: wanForm.duration,
    });
    if (!payment.success) return;

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
      },
      $walletAddress,
      () => loadHistory($walletAddress)
    );
  };

  const handleSamGenerate = async () => {
    const address = await ensureWalletConnected();
    if (!address) return;
    if (!samForm.video) return toast.warning('Please upload video');

    const check = validateSamForm({ hasVideo: !!samForm.video, prompt: samForm.prompt });
    if (!check.ok) {
      samForm.errors = check.errors;
      return;
    }
    samForm.errors = {};

    const payment = await pay({
      amount: samCost,
      model: 'sam3',
      resolution: 'original',
      duration: samForm.duration,
    });
    if (!payment.success) return;

    await submitSam(
      {
        videoFile: samForm.video!,
        prompt: samForm.prompt,
        apply_mask: samForm.mask,
      },
      $walletAddress,
      () => loadHistory($walletAddress)
    );
  };

  // 自动加载
  $: loadHistory($walletAddress);
</script>

<div class="flex flex-col min-h-screen bg-bg-light dark:bg-bg-dark text-text-light dark:text-text-dark">
  <nav
    class="fixed top-0 w-full z-[999999] px-6 py-2.5 md:py-4 flex justify-between items-center backdrop-blur-md border-b border-border-light dark:border-border-dark"
  >
    <a href="/" class="flex items-center cursor-pointer select-none">
      <span
        class="text-sm md:text-2xl font-bold tracking-tight bg-gradient-to-r from-primary-400 via-primary-500 to-violet-400 bg-clip-text text-transparent drop-shadow-[0_1px_10px_rgba(194,19,242,0.22)]"
      >
        HPVideo Pro
      </span>
    </a>
    <div><WalletConnect /></div>
  </nav>

  <main
    class="w-full flex flex-col gap-5 md:flex-row pt-[80px] pb-3 px-4 h-screen overflow-auto md:overflow-hidden md:px-6"
  >
    <div
      class="border-border-light flex flex-col gap-4 pr-4 relative dark:border-border-dark border-r flex-[2.5] xl:flex-[1.7] md:overflow-y-auto scroll-fade"
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
            on:generate={handlePikaGenerate}
          />
        {:else if currentModelValue === 'sam3-video'}
          <SamParams
            bind:globalPrompt={samForm.prompt}
            bind:applyMask={samForm.mask}
            costUsd={samCost}
            errors={samForm.errors}
            taskStatus={$isGenerating ? 'submitting' : 'idle'}
            on:generate={handleSamGenerate}
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
            on:generate={handleWanGenerate}
          />
        {/if}
      </div>
    </div>

    <div class="flex-[3]">
      <MyVideo items={$history} on:select={handleHistorySelect} />
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
