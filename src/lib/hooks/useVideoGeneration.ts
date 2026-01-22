import { writable, get } from 'svelte/store';
// 👇 引入 Wagmi Core 用于双重保险获取地址 (防止参数意外丢失)
import { getAccount } from '@wagmi/core';
import { config as wconfig } from '$lib/utils/wallet/bnb/index';

// 👇 引入 API
import {
  uploadImagesToOss,
  submitLargeLanguageModel,
  getLargeLanguageModelResult,
  getHistoryList,
  type SubmitReq,
} from '$lib/apis/model/pika';
import { pollTaskResult } from '../../routes/pro/modules/task';

// 1. 🔥 修改接口：允许 payload 携带 txHash
interface ExtendedSubmitReq extends SubmitReq {
  video?: string;
  negative_prompt?: string;
  loras?: any[];
  strength?: number;
  num_inference_steps?: number;
  duration?: number;
  guidance_scale?: number;
  flow_shift?: number;
  apply_mask?: boolean;
  txHash?: string; // 👈 新增：支付凭证
}

export type HistoryItem = {
  id: string;
  createdAt: number;
  model: string;
  status: 'processing' | 'completed' | 'failed';
  prompt: string;
  outputUrl?: string;
  thumbUrl?: string;
  params?: any;
  txHash?: string; // 2. 🔥 新增：前端列表需要这个字段来发起重试
};

export function useVideoGeneration() {
  const isGenerating = writable(false);
  const history = writable<HistoryItem[]>([]);

  const getToken = () => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('token') || localStorage.getItem('access_token') || '';
  };

  const getCurrentAddress = (fallbackAddress?: string) => {
    const account = getAccount(wconfig);
    if (account && account.address) return account.address;
    if (fallbackAddress) return fallbackAddress;
    return '';
  };

  // 核心流程 (无需改动，只要 payload 里有 txHash，它就会传给 submitLargeLanguageModel)
  const _runTaskCore = async (
    payload: ExtendedSubmitReq,
    tempId: string,
    addressArg: string,
    onSuccess?: () => void,
    // 👇 新增配置项
    pollConfig: { intervalMs: number; timeoutMs: number } = { intervalMs: 20000, timeoutMs: 1800000 }
  ) => {
    try {
      // API 调用时，payload 里已经包含了 txHash
      const { requestId } = await submitLargeLanguageModel(payload, addressArg);

      history.update((list) => list.map((item) => (item.id === tempId ? { ...item, id: requestId } : item)));

      const abortController = new AbortController();

      await pollTaskResult({
        requestId,
        fetcher: getLargeLanguageModelResult,
        signal: abortController.signal,
        // 🔥 将配置传递给 pollTaskResult
        intervalMs: pollConfig.intervalMs,
        timeoutMs: pollConfig.timeoutMs,
        onCompleted: (url: string) => {
          console.log('✅ 生成完成，更新 UI');
          history.update((list) =>
            list.map((item) => (item.id === requestId ? { ...item, status: 'completed', outputUrl: url } : item))
          );
          isGenerating.set(false);
          if (onSuccess) {
            onSuccess();
          }
        },
      });
    } catch (error: any) {
      console.error('Task Failed:', error);
      history.update((list) => {
        const targetId = list.find((i) => i.id === tempId) ? tempId : list.find((i) => i.status === 'processing')?.id;
        return list.map((item) => (item.id === targetId ? { ...item, status: 'failed' } : item));
      });
      isGenerating.set(false);
      alert(`生成出错: ${error.message}`);
    } finally {
      isGenerating.set(false);
    }
  };

  // ==========================================
  // 🔥 加载历史记录 (关键修改)
  // ==========================================
  const loadHistory = async (addressArg: string) => {
    const address = getCurrentAddress(addressArg);
    if (!address) {
      history.set([]);
      return;
    }

    try {
      const list = await getHistoryList(address);
      const formattedList: HistoryItem[] = list.map((item: any) => ({
        id: item.requestId,
        createdAt: new Date(item.createdAt).getTime(),
        model: item.modelName,
        status: item.status,
        prompt: item.prompt,
        outputUrl: item.outputUrl,
        thumbUrl: item.thumbUrl,
        params: item.params,
        txHash: item.txHash, // 👈 3. 🔥 必须映射回来，不然重试按钮拿不到 Hash
      }));
      history.set(formattedList);
    } catch (e) {
      console.error('加载历史记录失败:', e);
    }
  };

  // =========================================================
  // 🟢 Pika (修改参数)
  // =========================================================
  const submitPika = async (
    // 4. 🔥 参数里增加 txHash (可选)
    args: { files: File[]; prompt: string; transitions: any[]; resolution: any; seed: number; txHash?: string },
    addressArg: string,
    onSuccess?: () => void
  ) => {
    if (get(isGenerating)) return;
    const address = getCurrentAddress(addressArg);
    if (!address) return alert('请先连接钱包');

    isGenerating.set(true);
    const tempId = `temp-${Date.now()}`;

    history.update((l) => [
      {
        id: tempId,
        createdAt: Date.now(),
        model: 'pika',
        status: 'processing',
        prompt: args.prompt,
        thumbUrl: URL.createObjectURL(args.files[0]),
        params: { model: 'pika', ...args },
        // 🔥🔥🔥 新增这一行：把 hash 放到最外层 🔥🔥🔥
        txHash: args.txHash,
      },
      ...l,
    ]);

    try {
      const { urls } = await uploadImagesToOss(getToken(), args.files);
      await _runTaskCore(
        {
          model: 'pika',
          prompt: args.prompt,
          images: urls,
          resolution: args.resolution,
          transitions: args.transitions,
          seed: args.seed,
          txHash: args.txHash, // 👈 5. 🔥 传给 Core -> API -> 后端
        },
        tempId,
        address,
        onSuccess,
        // 🔥 Pika 策略：10秒查一次，最长等 30 分钟
        { intervalMs: 10000, timeoutMs: 1800000 }
      );
    } catch (e: any) {
      isGenerating.set(false);
      history.update((l) => l.filter((i) => i.id !== tempId));
      alert(`Pika 错误: ${e.message}`);
    }
  };

  // =========================================================
  // 🔵 Wan (修改参数)
  // =========================================================
  const submitWan = async (args: any, addressArg: string, onSuccess?: () => void) => {
    if (get(isGenerating)) return;
    const address = getCurrentAddress(addressArg);
    if (!address) return alert('请先连接钱包');

    isGenerating.set(true);
    const tempId = `temp-${Date.now()}`;

    history.update((l) => [
      {
        id: tempId,
        createdAt: Date.now(),
        model: 'wan-2.1',
        status: 'processing',
        prompt: args.prompt,
        thumbUrl: URL.createObjectURL(args.videoFile),
        params: { model: 'wan-2.1', ...args },
        // 🔥🔥🔥 新增这一行：把 hash 放到最外层 🔥🔥🔥
        txHash: args.txHash,
      },
      ...l,
    ]);

    try {
      const { urls } = await uploadImagesToOss(getToken(), [args.videoFile]);
      await _runTaskCore(
        {
          model: 'wan-2.1',
          prompt: args.prompt,
          images: [],
          video: urls[0],
          negative_prompt: args.negative_prompt,
          strength: args.strength,
          seed: args.seed,
          loras: args.loras,
          duration: args.duration,
          num_inference_steps: args.num_inference_steps,
          guidance_scale: args.guidance_scale,
          flow_shift: args.flow_shift,
          txHash: args.txHash, // 👈 6. 🔥 传给 Core
        },
        tempId,
        address,
        onSuccess,
        // 🔥 Pika 策略：10秒查一次，最长等 30 分钟
        { intervalMs: 2000, timeoutMs: 1800000 }
      );
    } catch (e: any) {
      isGenerating.set(false);
      history.update((l) => l.filter((i) => i.id !== tempId));
      alert(`Wan 错误: ${e.message}`);
    }
  };

  // =========================================================
  // 🟣 Sam (修改参数)
  // =========================================================
  const submitSam = async (args: any, addressArg: string, onSuccess?: () => void) => {
    if (get(isGenerating)) return;
    const address = getCurrentAddress(addressArg);
    if (!address) return alert('请先连接钱包');

    isGenerating.set(true);
    const tempId = `temp-${Date.now()}`;

    history.update((l) => [
      {
        id: tempId,
        createdAt: Date.now(),
        model: 'sam3',
        status: 'processing',
        prompt: args.prompt,
        thumbUrl: URL.createObjectURL(args.videoFile),
        params: { model: 'sam3', ...args },
        // 🔥🔥🔥 新增这一行：把 hash 放到最外层 🔥🔥🔥
        txHash: args.txHash,
      },
      ...l,
    ]);

    try {
      const { urls } = await uploadImagesToOss(getToken(), [args.videoFile]);
      await _runTaskCore(
        {
          model: 'sam3',
          prompt: args.prompt,
          images: [],
          video: urls[0],
          apply_mask: args.apply_mask,
          txHash: args.txHash, // 👈 7. 🔥 传给 Core
        },
        tempId,
        address,
        onSuccess,
        // 🔥 Pika 策略：10秒查一次，最长等 30 分钟
        { intervalMs: 2000, timeoutMs: 1800000 }
      );
    } catch (e: any) {
      isGenerating.set(false);
      history.update((l) => l.filter((i) => i.id !== tempId));
      alert(`Sam 错误: ${e.message}`);
    }
  };

  return { isGenerating, history, submitPika, submitWan, submitSam, loadHistory };
}
