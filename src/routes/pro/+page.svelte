<script lang="ts">
  import WalletConnect from '$lib/components/wallet/WalletConnect.svelte';
  import MyVideo from './modules/MyVideo.svelte';
  import { walletAddress } from '$lib/stores/wallet';
  // --- 子组件引入 ---
  import ImgToVideoUploader from './modules/pika/ImgToVideoUploader.svelte';
  import ImgToVideoParams from './modules/pika/ImgToVideoParams.svelte';
  import SamParams from './modules/sams/SamParams.svelte';
  import SamVideoUploader from './modules/sams/VideoUploader.svelte';
  import WanVideoUploader from './modules/wan/VideoUploader.svelte';
  import WanParams from './modules/wan/WanParams.svelte';
  import ExampleCard from './modules/ExampleCard.svelte';
  import MySelect from '$lib/components/common/MySelect.svelte';
  import { toast } from 'svelte-sonner';

  // --- 常量与工具 ---
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

  // --- 初始化 ---
  const { isGenerating, history, submitPika, submitWan, submitSam, loadHistory } = useVideoGeneration();
  const { pay } = usePayment();

  // --- 状态 ---
  $: modelOptions = proModel.map((m) => ({ value: m.model, label: m.name, icon: m.modelicon, hasAudio: m.audio }));
  let currentModelValue = proModel[0]?.model || '';

  // Pika Vars
  let pikaFiles: File[] = [];
  let pikaPrompt = '';
  let pikaResolution: '720p' | '1080p' = '720p';
  let pikaSeed = -1;
  let pikaTransitions: any[] = [];
  let pikaErrors: any = {};
  $: pikaTransitions = syncTransitions(pikaFiles.length, pikaTransitions);

  // Wan Vars
  let wanVideo: File | null = null;
  let wanPrompt = '';
  let wanNegPrompt = '';
  let wanStrength = 0.9;
  let wanSeed = -1;
  let wanLoras: any[] = [];
  let wanDuration = 5;
  let wanSteps = 30;
  let wanCfg = 5;
  let wanFlow = 3;

  // Sam Vars
  let samVideo: File | null = null;
  let samPrompt = '';
  let samMask = true;
  // Wan Vars ...
  let wanErrors: any = {};

  // Sam Vars ...
  let samErrors: any = {};

  // ==========================================
  // 🔥 回调函数：任务成功后，刷新历史记录
  // ==========================================
  const handleTaskSuccess = () => {
    if ($walletAddress) {
      console.log('🔄 任务完成 (Callback)，正在同步后端数据...', $walletAddress);
      loadHistory($walletAddress);
    }
  };

  // ==========================================
  // ⚡️ 提交处理 (调用时必须传 Address 和 Callback)
  // ==========================================

  const handlePikaGenerate = async () => {
    if (pikaFiles.length === 0) {
      toast.warning('Please upload video');
      return false;
    }

    const check = validateImgToVideoForm({
      filesLen: pikaFiles.length,
      globalPrompt: pikaPrompt,
      transitions: pikaTransitions,
      seed: pikaSeed,
    });
    if (!check.ok) {
      pikaErrors = check.errors;
      return;
    }
    pikaErrors = {};

    const payment = await pay({
      amount: 0.0001,
      model: 'pika',
      resolution: pikaResolution,
      duration: totalDuration(pikaTransitions),
    });
    if (!payment.success) return;

    await submitPika(
      {
        files: pikaFiles,
        prompt: pikaPrompt,
        resolution: pikaResolution,
        transitions: pikaTransitions,
        seed: pikaSeed,
      },
      $walletAddress,
      handleTaskSuccess
    );
  };

  const handleWanGenerate = async () => {
    if (!wanVideo) {
      toast.warning('Please upload video');
      return false;
    }

    const check = validateWanForm({
      hasVideo: !!wanVideo,
      prompt: wanPrompt,
      duration: wanDuration,
      num_inference_steps: wanSteps,
      guidance_scale: wanCfg,
      flow_shift: wanFlow,
      seed: wanSeed,
      loras: wanLoras,
    });

    if (!check.ok) {
      wanErrors = check.errors;
      return;
    }
    wanErrors = {};

    const payment = await pay({ amount: 0.0001, model: 'wan-2.1', resolution: '720p', duration: wanDuration });
    if (!payment.success) return;

    await submitWan(
      {
        videoFile: wanVideo!, // ✅ 关键：非空断言
        prompt: wanPrompt,
        negative_prompt: wanNegPrompt,
        strength: wanStrength,
        seed: wanSeed,
        loras: wanLoras,
        duration: wanDuration,
        num_inference_steps: wanSteps,
        guidance_scale: wanCfg,
        flow_shift: wanFlow,
      },
      $walletAddress,
      handleTaskSuccess
    );
  };

  const handleSamGenerate = async () => {
    if (!samVideo) {
      toast.warning('Please upload video');
      return false;
    }

    const check = validateSamForm({
      hasVideo: !!samVideo,
      prompt: samPrompt,
    });

    if (!check.ok) {
      samErrors = check.errors;
      return;
    }
    samErrors = {};

    const payment = await pay({ amount: 0.0001, model: 'sam3', resolution: 'original', duration: 5 });
    if (!payment.success) return;

    await submitSam(
      { videoFile: samVideo!, prompt: samPrompt, apply_mask: samMask }, // ✅ 关键：非空断言
      $walletAddress,
      handleTaskSuccess
    );
  };

  // 历史记录点击回填逻辑 (省略，保持原样)
  // ==========================================
  // ⚡️ 2. 点击历史记录 -> 回填参数
  // ==========================================
  function handleHistorySelect(e: CustomEvent) {
    const item = e.detail; // 从 MyVideo 传出来的 item
    if (!item || !item.params) return;

    const p = item.params; // 数据库里的 params 对象

    // 1. 切换到对应的模型 Tab
    // 注意：后端存的是 'pika', 'wan-2.1'，你需要映射回 proModel 里的完整 ID
    // 假设你的 proModel ID 包含了关键词
    const targetModel = proModel.find((m) => m.model.includes(p.model));
    if (targetModel) {
      currentModelValue = targetModel.model;
    }

    // 2. 根据模型回填数据
    if (p.model === 'pika') {
      pikaPrompt = p.prompt || '';
      pikaResolution = p.resolution || '720p';
      pikaSeed = p.seed ?? -1;
      pikaTransitions = p.transitions || [];

      // ⚠️ Pika 的图片无法直接回填到 File[]，只能给个提示
      toast.warning('Pika 参数已恢复 (图片需重新上传)');
    } else if (p.model === 'wan-2.1') {
      wanPrompt = p.prompt || '';
      wanNegPrompt = p.negative_prompt || '';
      wanStrength = p.strength ?? 0.9;
      wanSeed = p.seed ?? -1;
      wanDuration = p.duration || 5;
      wanSteps = p.num_inference_steps || 30;
      wanCfg = p.guidance_scale || 5;
      wanFlow = p.flow_shift || 3;
      // loras 是数组，需要深拷贝一下防止引用问题
      wanLoras = p.loras ? JSON.parse(JSON.stringify(p.loras)) : [];

      toast.warning('Wan 参数已恢复 (视频需重新上传)');
    } else if (p.model === 'sam3') {
      samPrompt = p.prompt || '';
      samMask = p.apply_mask ?? true;

      toast.warning('Sam 参数已恢复 (视频需重新上传)');
    }
  }

  // 🔥 自动加载历史
  $: loadHistory($walletAddress);
</script>

<div class="flex flex-col min-h-screen bg-bg-light dark:bg-bg-dark text-text-light dark:text-text-dark">
  <nav
    class="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center backdrop-blur-md border-b border-border-light dark:border-border-dark"
  >
    <a href="/" class="flex items-center cursor-pointer select-none">
      <span
        class="text-sm md:text-2xl font-bold tracking-tight
             bg-gradient-to-r from-primary-400 via-primary-500 to-violet-400
             bg-clip-text text-transparent
             drop-shadow-[0_1px_10px_rgba(194,19,242,0.22)]"
      >
        HP Video Pro
      </span>
    </a>

    <div><WalletConnect /></div>
  </nav>

  <main
    class="w-full flex flex-col gap-5 md:flex-row pt-[80px] pb-3 px-4 h-screen overflow-auto md:overflow-hidden md:px-6"
  >
    <div
      class="border-border-light flex flex-col gap-4 pr-4 relative dark:border-border-dark border-r flex-[1.7] md:overflow-y-auto scroll-fade"
    >
      <div class="w-[200px]">
        <MySelect options={modelOptions} bind:value={currentModelValue} />
      </div>

      {#if currentModelValue === 'pika-v2.2-pikaframes'}
        <ImgToVideoUploader
          bind:files={pikaFiles}
          status={$isGenerating ? 'uploading' : 'idle'}
          on:filesChange={(e) => (pikaFiles = e.detail)}
          on:removeFile={(e) => (pikaFiles = pikaFiles.filter((_, i) => i !== e.detail))}
          on:clear={() => (pikaFiles = [])}
        />
      {:else if currentModelValue === 'sam3-video'}
        <SamVideoUploader
          bind:videoFile={samVideo}
          status={$isGenerating ? 'uploading' : 'idle'}
          on:fileChange={(e) => (samVideo = e.detail)}
        />
      {:else}
        <WanVideoUploader
          bind:videoFile={wanVideo}
          status={$isGenerating ? 'uploading' : 'idle'}
          on:fileChange={(e) => (wanVideo = e.detail)}
        />
      {/if}

      <ExampleCard {currentModelValue} on:select={handleHistorySelect} />

      <div
        class="bg-bg-light dark:bg-bg-dark rounded-2xl md:sticky md:bottom-0 md:left-0 z-[9] border-t border-black/10 dark:border-white/5
         shadow-[0_-10px_20px_rgba(0,0,0,0.7)]"
      >
        {#if currentModelValue === 'pika-v2.2-pikaframes'}
          <ImgToVideoParams
            bind:globalPrompt={pikaPrompt}
            bind:resolution={pikaResolution}
            bind:seed={pikaSeed}
            bind:transitions={pikaTransitions}
            costUsd={0.00001}
            errors={pikaErrors}
            taskStatus={$isGenerating ? 'submitting' : 'idle'}
            on:generate={handlePikaGenerate}
          />
        {:else if currentModelValue === 'sam3-video'}
          <SamParams
            bind:globalPrompt={samPrompt}
            bind:applyMask={samMask}
            costUsd={0.00001}
            errors={samErrors}
            taskStatus={$isGenerating ? 'submitting' : 'idle'}
            on:generate={handleSamGenerate}
          />
        {:else}
          <WanParams
            bind:globalPrompt={wanPrompt}
            bind:negativePrompt={wanNegPrompt}
            bind:strength={wanStrength}
            bind:seed={wanSeed}
            bind:loras={wanLoras}
            bind:duration={wanDuration}
            bind:num_inference_steps={wanSteps}
            bind:guidance_scale={wanCfg}
            bind:flow_shift={wanFlow}
            costUsd={0.00001}
            errors={wanErrors}
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
    --sb-thumb: rgba(180, 180, 180, 0); /* 默认透明 */
    --sb-thumb-dark: rgba(180, 180, 180, 0);
    transition: --sb-thumb 200ms ease, --sb-thumb-dark 200ms ease; /* 有些浏览器不认，但不影响 */
  }

  /* 用 hover 改变量（过渡由“容器状态变化”驱动） */
  .scroll-fade:hover {
    --sb-thumb: rgba(180, 180, 180, 0.35);
    --sb-thumb-dark: rgba(180, 180, 180, 0.25);
  }

  /* WebKit */
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

  /* 暗色：thumb 读另一个变量 */
  .dark .scroll-fade::-webkit-scrollbar-thumb {
    background-color: var(--sb-thumb-dark);
  }

  /* Firefox */
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
