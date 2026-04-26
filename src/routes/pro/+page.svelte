<script lang="ts">
  import { getContext, onMount, tick } from 'svelte';
  import { get } from 'svelte/store';
  import WalletConnect from '$lib/components/wallet/WalletConnect.svelte';
  import { walletAddress } from '$lib/stores/wallet';
  import { initPageFlag } from '$lib/stores';
  import { toast } from 'svelte-sonner';

  // Components
  import MySelect from '$lib/components/common/MySelect.svelte';
  import ExampleCard from './modules/ExampleCard.svelte';
  import MyVideo from './modules/MyVideo.svelte';

  // Modules
  import ImgToVideoUploader from './modules/pika/ImgToVideoUploader.svelte';
  import ImgToVideoParams from './modules/pika/ImgToVideoParams.svelte';
  import WanVideoUploader from './modules/wan/VideoUploader.svelte';
  import WanParams from './modules/wan/WanParams.svelte';
  import SamVideoUploader from './modules/sams/VideoUploader.svelte';
  import SamParams from './modules/sams/SamParams.svelte';

  // 🔥 [新增] Commercial Modules
  import CommercialUploader from './modules/commercial/VideoUploader.svelte';
  import CommercialParams from './modules/commercial/CommercialParams.svelte';

  // Constants & Utils
  import { proModel } from '../../constants/pro-model';
  import { restoreProParams } from '$lib/utils/pro/history-restore';

  // Hooks
  import { useVideoGeneration } from '$lib/hooks/useVideoGeneration';
  import { usePayment } from '$lib/hooks/useProPayment';
  import { usePointsPayment } from '$lib/hooks/usePointsPayment';
  import { paymentMode } from '$lib/stores';

  // Stores (Hooks)
  import { usePikaState } from '$lib/stores/pro/usePikaState';
  import { useWanState } from '$lib/stores/pro/useWanState';
  import { useSamState } from '$lib/stores/pro/useSamState';
  // 🔥 [新增] Commercial Store
  import { useCommercialState } from '$lib/stores/pro/useCommercialState';

  const i18n: any = getContext('i18n');
  const { isGenerating, history, submitTask, loadHistory } = useVideoGeneration();
  const { pay: payToken } = usePayment();
  const { pay: payPoints } = usePointsPayment();
  // Use points or token payment based on mode
  const pay = (args: any) => {
    return $paymentMode === 'points' ? payPoints(args) : payToken(args);
  };

  // =========================================================
  // 🔥 1. 初始化模型 Hooks (依赖注入)
  // =========================================================
  const deps = { pay, submitTask, loadHistory, walletAddress };

  const pika = usePikaState(i18n, deps);
  const wan = useWanState(i18n, deps);
  const sam = useSamState(i18n, deps);
  // 🔥 [新增] 初始化 Commercial
  const commercial = useCommercialState(i18n, deps);

  // 解构出 State 方便模板使用
  const { form: pikaForm, cost: pikaCost } = pika;
  const { form: wanForm, cost: wanCost } = wan;
  const { form: samForm, cost: samCost } = sam;
  // 🔥 [新增] 解构 Commercial
  const { form: commForm, cost: commCost } = commercial;

  // --- Tab 切换 ---
  $: modelOptions = proModel.map((m) => ({
    value: m.model,
    label: m.name,
    icon: m.modelicon,
    hasAudio: m.audio,
    desc: $i18n.t(`model_desc_${m.model}`),
  }));

  // 默认选中第一个或指定的模型
  let currentModelValue = proModel[0]?.model || '';

  // =========================================================
  // ⚡️ 2. 历史回填逻辑
  // =========================================================
  async function handleHistorySelect(e: CustomEvent) {
    const item = e.detail;
    if (!item?.params) return;

    const targetModel = proModel.find((m) => m.model.includes(item.params.model));
    if (targetModel) currentModelValue = targetModel.model;
    await tick();

    // 直接操作 store.update
    await restoreProParams(item.params, {
      setPika: (data) => pikaForm.update((f) => ({ ...f, ...data, transitions: data.transitions || f.transitions })),
      setWan: (data) => wanForm.update((f) => ({ ...f, ...data })),
      setSam: (data) => samForm.update((f) => ({ ...f, ...data, mask: data.apply_mask ?? true })),
      // 🔥 [新增] Commercial 回填
      setCommercial: (data) => commForm.update((f) => ({ ...f, ...data })),
    });
  }

  // =========================================================
  // ⚡️ 3. 重试逻辑 (调用 Hook 内部的 submit)
  // =========================================================
  const handleRetryVideo = async (e: CustomEvent) => {
    const item = e.detail;
    if (!item || !item.params) return;
    const oldTxHash = item.txHash || item.params?.txHash;
    if (!oldTxHash) return toast.error($i18n.t('Unable to retrieve payment proof for retry'));

    // 切 Tab
    const targetModel = proModel.find((m) => m.model.includes(item.params.model));
    if (targetModel) currentModelValue = targetModel.model;
    await tick();

    // 辅助函数：等待文件就绪 (使用 get 读取 store)
    const waitForFile = async (type: 'pika' | 'wan' | 'sam' | 'commercial') => {
      let attempts = 0;
      while (attempts < 150) {
        if (type === 'pika' && get(pikaForm).files.length > 0) return true;
        if (type === 'wan' && get(wanForm).video instanceof File) return true;
        if (type === 'sam' && get(samForm).video instanceof File) return true;
        // 🔥 [新增] Commercial 文件检测 (image)
        if (type === 'commercial' && get(commForm).image instanceof File) return true;

        await new Promise((r) => setTimeout(r, 200));
        attempts++;
      }
      toast.error($i18n.t('Timeout waiting for asset restoration'));
      return false;
    };

    // 智能判断 & 执行
    if (item.model.includes('pika')) {
      if (get(pikaForm).files.length === 0) {
        await handleHistorySelect(e);
        await waitForFile('pika');
      }
      await pika.submit(oldTxHash, true);
    } else if (item.model.includes('wan')) {
      if (!(get(wanForm).video instanceof File)) {
        await handleHistorySelect(e);
        await waitForFile('wan');
      }
      await wan.submit(oldTxHash, true);
    } else if (item.model.includes('sam')) {
      if (!(get(samForm).video instanceof File)) {
        await handleHistorySelect(e);
        await waitForFile('sam');
      }
      await sam.submit(oldTxHash, true);
    } else if (item.model.includes('commercial')) {
      // 🔥 [新增] Commercial 重试逻辑
      if (!(get(commForm).image instanceof File)) {
        await handleHistorySelect(e);
        await waitForFile('commercial');
      }
      await commercial.submit(oldTxHash, true);
    }
  };

  $: loadHistory($walletAddress);

  // Pick up params left by the share page's "Remix this" button.
  function consumeRemixParams() {
    if (typeof sessionStorage === 'undefined') return;
    const raw = sessionStorage.getItem('hpv:remix-params');
    if (!raw) return;
    sessionStorage.removeItem('hpv:remix-params');
    try {
      const { params } = JSON.parse(raw);
      if (!params) return;
      handleHistorySelect(new CustomEvent('select', { detail: { params } }));
    } catch (e) {
      console.warn('remix params decode failed', e);
    }
  }

  onMount(() => {
    initPageFlag.set(true);
    consumeRemixParams();
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
        {$i18n.t('HPVideo Pro')}
      </span>
    </a>
    <div><WalletConnect /></div>
  </nav>

  <main
    class="w-full flex flex-col gap-2 md:flex-row pt-[60.8px] md:pt-[80px] pb-3 px-3 h-screen overflow-auto md:overflow-hidden md:px-4"
  >
    <div class=" flex flex-col gap-2 relative flex-[2.5] xl:flex-[1.4] md:overflow-y-auto scroll-fade">
      <div class="max-w-[300px]">
        <MySelect options={modelOptions} bind:value={currentModelValue} />
      </div>

      {#if currentModelValue === 'pika-v2.2-pikaframes'}
        <ImgToVideoUploader
          bind:files={$pikaForm.files}
          status={$isGenerating ? 'uploading' : 'idle'}
          on:filesChange={(e) => ($pikaForm.files = e.detail)}
          on:removeFile={(e) => ($pikaForm.files = $pikaForm.files.filter((_, i) => i !== e.detail))}
          on:clear={() => pika.reset()}
        />
      {:else if currentModelValue === 'sam3-video'}
        <SamVideoUploader
          bind:videoFile={$samForm.video}
          on:fileChange={(e) => ($samForm.video = e.detail)}
          on:durationChange={(e) => ($samForm.duration = e.detail)}
        />
      {:else if currentModelValue === 'commercial-pipeline'}
        <CommercialUploader bind:imageFile={$commForm.image} on:fileChange={(e) => ($commForm.image = e.detail)} />
      {:else}
        <WanVideoUploader bind:videoFile={$wanForm.video} on:fileChange={(e) => ($wanForm.video = e.detail)} />
      {/if}

      <ExampleCard {currentModelValue} on:select={handleHistorySelect} />

      <div
        class="bg-bg-light dark:bg-bg-dark rounded-2xl md:sticky md:bottom-0 md:left-0 z-[99] border-t border-border-light dark:border-border-dark shadow-[0_-10px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-10px_20px_rgba(0,0,0,0.7)]"
      >
        {#if currentModelValue === 'pika-v2.2-pikaframes'}
          <ImgToVideoParams
            bind:globalPrompt={$pikaForm.prompt}
            bind:resolution={$pikaForm.resolution}
            bind:seed={$pikaForm.seed}
            bind:transitions={$pikaForm.transitions}
            costUsd={$pikaCost}
            errors={$pikaForm.errors}
            taskStatus={$isGenerating ? 'submitting' : 'idle'}
            on:generate={() => pika.submit()}
          />
        {:else if currentModelValue === 'sam3-video'}
          <SamParams
            bind:globalPrompt={$samForm.prompt}
            bind:applyMask={$samForm.mask}
            costUsd={$samCost}
            errors={$samForm.errors}
            taskStatus={$isGenerating ? 'submitting' : 'idle'}
            on:generate={() => sam.submit()}
          />
        {:else if currentModelValue === 'commercial-pipeline'}
          <CommercialParams
            bind:globalPrompt={$commForm.prompt}
            bind:voiceId={$commForm.voiceId}
            bind:duration={$commForm.duration}
            bind:enableSmartEnhance={$commForm.enableSmartEnhance}
            bind:enableUpscale={$commForm.enableUpscale}
            costUsd={$commCost}
            errors={$commForm.errors}
            taskStatus={$isGenerating ? 'submitting' : 'idle'}
            on:generate={() => commercial.submit()}
          />
        {:else}
          <WanParams
            bind:globalPrompt={$wanForm.prompt}
            bind:negativePrompt={$wanForm.negative_prompt}
            bind:strength={$wanForm.strength}
            bind:seed={$wanForm.seed}
            bind:loras={$wanForm.loras}
            bind:duration={$wanForm.duration}
            bind:num_inference_steps={$wanForm.steps}
            bind:guidance_scale={$wanForm.cfg}
            bind:flow_shift={$wanForm.flow}
            costUsd={$wanCost}
            errors={$wanForm.errors}
            taskStatus={$isGenerating ? 'submitting' : 'idle'}
            on:generate={() => wan.submit()}
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
