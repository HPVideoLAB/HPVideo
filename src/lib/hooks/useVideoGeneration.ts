import { writable, get } from 'svelte/store';
// 👇 引入 Wagmi Core 用于双重保险获取地址 (防止参数意外丢失)
import { getAccount } from '@wagmi/core';
import { config as wconfig } from '$lib/utils/wallet/bnb/index'; // 请确认路径

// 👇 引入 API
import {
  uploadImagesToOss,
  submitLargeLanguageModel,
  getLargeLanguageModelResult,
  getHistoryList,
  type SubmitReq,
} from '$lib/apis/model/pika';
import { pollTaskResult } from '$lib/components/chat/MessageInput-modules/modules/task';

// 补全参数类型
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
};

export function useVideoGeneration() {
  const isGenerating = writable(false);
  const history = writable<HistoryItem[]>([]);

  const getToken = () => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('token') || localStorage.getItem('access_token') || '';
  };

  // 🔥 辅助函数：获取当前钱包地址 (防止参数传空)
  const getCurrentAddress = (fallbackAddress?: string) => {
    const account = getAccount(wconfig);
    if (account && account.address) return account.address;
    if (fallbackAddress) return fallbackAddress;
    return '';
  };

  /**
   * 🏗️ 核心流程：提交 -> 轮询当前任务 -> 更新 UI -> 🔥 完成后回调
   * 增加了 address 参数传给 API
   */
  const _runTaskCore = async (
    payload: ExtendedSubmitReq,
    tempId: string,
    addressArg: string, // <--- 接收地址
    onSuccess?: () => void
  ) => {
    try {
      // 🔥 1. 把地址传给 API (请确保 submitLargeLanguageModel 已修改为接收 address)
      // 如果 API 还没改，请去 src/lib/apis/model/pika.ts 把 header 加上 x-wallet-address
      const { requestId } = await submitLargeLanguageModel(payload, addressArg);

      // 2. 将临时 ID 更新为真实后端 ID
      history.update((list) => list.map((item) => (item.id === tempId ? { ...item, id: requestId } : item)));

      // 3. 开始轮询
      const abortController = new AbortController();

      await pollTaskResult({
        requestId,
        fetcher: getLargeLanguageModelResult,
        signal: abortController.signal,
        onCompleted: (url: string) => {
          console.log('✅ 生成完成，更新 UI');
          // 4. 成功：直接更新本地 Store
          history.update((list) =>
            list.map((item) => (item.id === requestId ? { ...item, status: 'completed', outputUrl: url } : item))
          );
          isGenerating.set(false);

          // 🔥 5. 执行回调 (去刷新后端列表)
          if (onSuccess) {
            console.log('🔔 执行 onSuccess 回调...');
            onSuccess();
          }
        },
      });
    } catch (error: any) {
      console.error('Task Failed:', error);
      // 失败处理
      history.update((list) => {
        const targetId = list.find((i) => i.id === tempId) ? tempId : list.find((i) => i.status === 'processing')?.id;
        return list.map((item) => (item.id === targetId ? { ...item, status: 'failed' } : item));
      });
      isGenerating.set(false);
      alert(`生成出错: ${error.message}`);
    }
  };

  // ==========================================
  // 🔥 加载历史记录
  // ==========================================
  const loadHistory = async (addressArg: string) => {
    const address = getCurrentAddress(addressArg);
    if (!address) {
      // console.log('❌ 未连接钱包，跳过加载历史');
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
      }));
      history.set(formattedList);
    } catch (e) {
      console.error('加载历史记录失败:', e);
    }
  };

  // =========================================================
  // 🟢 Pika
  // =========================================================
  const submitPika = async (
    args: { files: File[]; prompt: string; transitions: any[]; resolution: any; seed: number },
    addressArg: string, // 🔥 接收地址
    onSuccess?: () => void
  ) => {
    if (get(isGenerating)) return;
    const address = getCurrentAddress(addressArg);
    if (!address) return alert('请先连接钱包');

    isGenerating.set(true);
    const tempId = `temp-${Date.now()}`;

    // ✅ 乐观 UI
    history.update((l) => [
      {
        id: tempId,
        createdAt: Date.now(),
        model: 'pika',
        status: 'processing',
        prompt: args.prompt,
        thumbUrl: URL.createObjectURL(args.files[0]),
        params: { model: 'pika', ...args },
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
        },
        tempId,
        address, // 🔥 透传地址
        onSuccess
      );
    } catch (e: any) {
      isGenerating.set(false);
      history.update((l) => l.filter((i) => i.id !== tempId));
      alert(`Pika 错误: ${e.message}`);
    }
  };

  // =========================================================
  // 🔵 Wan
  // =========================================================
  const submitWan = async (args: any, addressArg: string, onSuccess?: () => void) => {
    if (get(isGenerating)) return;
    const address = getCurrentAddress(addressArg);
    if (!address) return alert('请先连接钱包');

    isGenerating.set(true);
    const tempId = `temp-${Date.now()}`;

    // ✅ 恢复乐观 UI (之前这里漏了)
    history.update((l) => [
      {
        id: tempId,
        createdAt: Date.now(),
        model: 'wan-2.1',
        status: 'processing',
        prompt: args.prompt,
        thumbUrl: URL.createObjectURL(args.videoFile),
        params: { model: 'wan-2.1', ...args },
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
        },
        tempId,
        address, // 🔥 透传地址
        onSuccess
      );
    } catch (e: any) {
      isGenerating.set(false);
      history.update((l) => l.filter((i) => i.id !== tempId));
      alert(`Wan 错误: ${e.message}`);
    }
  };

  // =========================================================
  // 🟣 Sam
  // =========================================================
  const submitSam = async (args: any, addressArg: string, onSuccess?: () => void) => {
    if (get(isGenerating)) return;
    const address = getCurrentAddress(addressArg);
    if (!address) return alert('请先连接钱包');

    isGenerating.set(true);
    const tempId = `temp-${Date.now()}`;

    // ✅ 恢复乐观 UI (之前被注释了)
    history.update((l) => [
      {
        id: tempId,
        createdAt: Date.now(),
        model: 'sam3',
        status: 'processing',
        prompt: args.prompt,
        thumbUrl: URL.createObjectURL(args.videoFile),
        params: { model: 'sam3', ...args },
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
        },
        tempId,
        address, // 🔥 透传地址
        onSuccess
      );
    } catch (e: any) {
      isGenerating.set(false);
      history.update((l) => l.filter((i) => i.id !== tempId));
      alert(`Sam 错误: ${e.message}`);
    }
  };

  return { isGenerating, history, submitPika, submitWan, submitSam, loadHistory };
}
