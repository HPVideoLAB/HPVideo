import { writable, get } from 'svelte/store';
// 👇 引入 Wagmi Core
import { getAccount } from '@wagmi/core';
import { config as wconfig } from '$lib/utils/wallet/bnb/index';
import { toast } from 'svelte-sonner';
import { NEST_API_BASE_URL } from '$lib/constants';

// 👇 引入 API
import { uploadImagesToOss, submitLargeLanguageModel, getHistoryList } from '$lib/apis/model/pika';

// =================================================================================
// 1. 🔥 核心策略表：所有模型的"差异"都在这里配置
//    以后加新模型，只需要在这里加一段配置，不需要改下面的逻辑代码
// =================================================================================
const MODEL_STRATEGIES: Record<
  string,
  {
    // 从前端参数提取要上传的文件，统一返回 File[]
    getFiles: (args: any) => File[];
    // 生成前端预览图
    getThumb: (args: any) => string;
    // 组装发给后端的 API Payload
    buildPayload: (args: any, ossUrls: string[], txHash?: string) => any;
    // SSE 超时配置 (不同模型生成速度不一样，timeoutMs 用于设置 SSE 连接超时)
    pollConfig: { intervalMs: number; timeoutMs: number };
  }
> = {
  // 🟢 Pika 配置
  pika: {
    getFiles: (args) => args.files || [],
    getThumb: (args) => (args.files?.[0] ? URL.createObjectURL(args.files[0]) : ''),
    buildPayload: (args, urls, txHash) => ({
      model: 'pika',
      prompt: args.prompt,
      images: urls, // Pika 使用 images 字段
      resolution: args.resolution,
      transitions: args.transitions,
      seed: args.seed,
      txHash,
    }),
    pollConfig: { intervalMs: 10000, timeoutMs: 1800000 }, // 10s / 30min
  },

  // 🔵 Wan 2.1 配置
  'wan-2.1': {
    getFiles: (args) => (args.video instanceof File ? [args.video] : []),
    getThumb: (args) => (args.video instanceof File ? URL.createObjectURL(args.video) : ''),
    buildPayload: (args, urls, txHash) => ({
      model: 'wan-2.1',
      prompt: args.prompt,
      video: urls[0], // Wan 使用 video 字段
      negative_prompt: args.negative_prompt,
      loras: args.loras,
      strength: args.strength,
      num_inference_steps: args.num_inference_steps, // 注意：Hook里要做映射，或者表单字段名保持一致
      duration: args.duration,
      guidance_scale: args.guidance_scale,
      flow_shift: args.flow_shift,
      seed: args.seed,
      txHash,
    }),
    pollConfig: { intervalMs: 2000, timeoutMs: 1800000 }, // 2s / 30min
  },

  // 🟣 Sam 3 配置
  sam3: {
    getFiles: (args) => (args.videoFile instanceof File ? [args.videoFile] : []),
    getThumb: (args) => (args.videoFile instanceof File ? URL.createObjectURL(args.videoFile) : ''),
    buildPayload: (args, urls, txHash) => ({
      model: 'sam3',
      prompt: args.prompt,
      video: urls[0], // Sam 使用 video 字段
      apply_mask: args.apply_mask,
      txHash,
    }),
    pollConfig: { intervalMs: 2000, timeoutMs: 1800000 }, // 2s / 30min
  },
  // 🔥 新增 Commercial 配置
  commercial: {
    getFiles: (args) => (args.imageFile instanceof File ? [args.imageFile] : []),
    getThumb: (args) => (args.imageFile instanceof File ? URL.createObjectURL(args.imageFile) : ''),

    // 组装 Payload
    buildPayload: (args, urls, txHash) => ({
      model: 'commercial-pipeline', // 后端识别的 model 字符串
      prompt: args.prompt,
      image: urls[0], // OSS 上传后的 URL
      voice_id: args.voiceId,
      duration: args.duration,
      enableSmartEnhance: args.enableSmartEnhance,
      enableUpscale: args.enableUpscale,
      txHash,
    }),

    // 轮询配置 (假设商业视频生成较慢，设为 3秒一次，超时 60分钟)
    pollConfig: { intervalMs: 30000, timeoutMs: 3600000 },
  },
};

// =================================================================================
// 2. 类型定义
// =================================================================================
export type HistoryItem = {
  id: string;
  createdAt: number;
  model: string;
  status: 'processing' | 'completed' | 'failed';
  prompt: string;
  outputUrl?: string;
  thumbUrl?: string;
  params?: any;
  txHash?: string;
};

export function useVideoGeneration() {
  const isGenerating = writable(false);
  const history = writable<HistoryItem[]>([]);

  // 辅助函数
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

  // =========================================================
  // 🔥 核心运行逻辑 (内部复用，不对外暴露) - 使用 SSE 替代轮询
  // =========================================================
  const _runTaskCore = async (
    payload: any,
    tempId: string,
    addressArg: string,
    onSuccess: (() => void) | undefined,
    pollConfig: { intervalMs: number; timeoutMs: number }
  ) => {
    let eventSource: any | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let isCompleted = false; // 🔥 标志位：防止重复处理 success/fail/error
    let realRequestId = ''; // 用于 catch 块中定位正确的 ID

    try {
      const { requestId } = await submitLargeLanguageModel(payload, addressArg);
      realRequestId = requestId;

      // 临时ID -> 真实 requestId
      // 🔥 修复：如果 requestId 已存在（重试场景），先移除旧记录，避免重复 key
      history.update((list) => {
        // 1. 移除所有与 requestId 相同的旧记录（防止重试时 ID 冲突）
        const filtered = list.filter((item) => item.id !== requestId);
        // 2. 将当前的 tempId 替换为 requestId
        return filtered.map((item) => (item.id === tempId ? { ...item, id: requestId } : item));
      });

      // 🔥 使用 SSE 替代轮询
      await new Promise<void>((resolve, reject) => {
        // 建立 SSE 连接
        const streamUrl = `${NEST_API_BASE_URL}/large-language-model/${requestId}/stream`;
        console.log(`🔌 建立 SSE 连接: ${streamUrl}`);

        eventSource = new EventSource(streamUrl);

        // 设置超时保险 (防止 SSE 挂死)
        timeoutId = setTimeout(() => {
          if (!isCompleted) {
            console.error('⏰ SSE 连接超时');
            if (eventSource) {
              eventSource.close();
              eventSource = null;
            }
            reject(new Error('SSE connection timeout'));
          }
        }, pollConfig.timeoutMs);

        // ------------------------------------------
        // 1. 监听 status 事件（进度更新）
        // ------------------------------------------
        eventSource.addEventListener('status', (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📊 SSE: 状态更新', data);

            history.update((list) =>
              list.map((item) =>
                item.id === requestId
                  ? {
                      ...item,
                      params: {
                        ...item.params,
                        currentStage: data.stage,
                        statusMessage: data.message,
                      },
                    }
                  : item
              )
            );
          } catch (parseError) {
            console.error('Failed to parse status event:', parseError);
          }
        });

        // ------------------------------------------
        // 2. 监听 completed 事件 (成功)
        // ------------------------------------------
        eventSource.addEventListener('completed', (event) => {
          console.log('✅ SSE: 生成完成');
          isCompleted = true;

          // 立即关闭连接
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          if (timeoutId) clearTimeout(timeoutId);

          try {
            const data = JSON.parse(event.data);

            // 更新历史记录
            history.update((list) =>
              list.map((item) =>
                item.id === requestId
                  ? {
                      ...item,
                      status: 'completed',
                      outputUrl: data.outputUrl || data.resultUrl,
                      thumbUrl: data.thumbUrl,
                    }
                  : item
              )
            );

            isGenerating.set(false);
            onSuccess?.();
            resolve();
          } catch (parseError) {
            console.error('Failed to parse completed event:', parseError);
            reject(parseError);
          }
        });

        // ------------------------------------------
        // 3. 监听 failed 事件 (失败)
        // ------------------------------------------
        eventSource.addEventListener('failed', (event) => {
          console.error('❌ SSE: 收到后端 failed 事件');
          isCompleted = true;

          // 🔥 关键：收到失败立即关闭连接，防止后续触发 onerror 导致逻辑混乱
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          if (timeoutId) clearTimeout(timeoutId);

          try {
            const data = JSON.parse(event.data);
            const errorMsg = data.error || data.message || 'Task failed';
            reject(new Error(errorMsg)); // 向上抛出错误
          } catch (parseError) {
            reject(new Error('Task failed (parse error)'));
          }
        });

        // ------------------------------------------
        // 4. 监听连接错误 (onerror)
        // ------------------------------------------
        // 注意：当后端调用 res.end() 关闭连接时，浏览器也会触发 onerror
        eventSource.onerror = (error) => {
          // 如果已经标记为完成（无论成功还是失败），说明这是正常的连接断开，忽略
          if (isCompleted) {
            console.log('ℹ️ SSE: 连接关闭 (预期内，忽略)');
            return;
          }

          console.error('❌ SSE 连接异常 (onerror):', error);

          // 🔥 关键：EventSource 默认会自动重连。必须手动关闭它！
          // 否则会无限重试，导致死循环
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          if (timeoutId) clearTimeout(timeoutId);

          // 判定为连接意外断开
          reject(new Error('SSE connection closed unexpectedly or failed'));
        };
      });
    } catch (error: any) {
      console.error('Task Failed:', error);

      // 失败 UI 更新逻辑
      history.update((list) => {
        // 优先使用 realRequestId，如果没有则使用 tempId
        const targetId = realRequestId || tempId;
        return list.map((item) => (item.id === targetId ? { ...item, status: 'failed' } : item));
      });

      isGenerating.set(false);
      toast.error(`failed: ${error.message}`);

      // 不需要 throw error，因为我们在 catch 里处理了 UI 状态
      // 如果外部还有 try-catch 也可以 throw
    } finally {
      // 兜底清理
      if (timeoutId) clearTimeout(timeoutId);
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      isGenerating.set(false);
    }
  };

  // =========================================================
  // 🔥 加载历史 (保持不变)
  // =========================================================
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
        txHash: item.txHash,
      }));
      history.set(formattedList);
    } catch (e) {
      console.error('加载历史记录失败:', e);
    }
  };

  // =========================================================
  // 🔥🔥🔥 唯一的、通用的提交入口 (UI只调用这个) 🔥🔥🔥
  // =========================================================
  const submitTask = async (
    modelKey: string, // e.g. 'pika', 'wan-2.1'
    rawArgs: any, // 前端表单的原始对象
    addressArg: string,
    onSuccess?: () => void
  ) => {
    if (get(isGenerating)) return;
    const address = getCurrentAddress(addressArg);
    if (!address) return alert('请先连接钱包');

    // 1. 获取策略
    const strategy = MODEL_STRATEGIES[modelKey];
    if (!strategy) return alert(`前端代码未配置模型策略: ${modelKey}`);

    isGenerating.set(true);
    const tempId = `temp-${Date.now()}`;

    // 2. 乐观更新 UI (立即显示 Loading 卡片)
    history.update((l) => [
      {
        id: tempId,
        createdAt: Date.now(),
        model: modelKey,
        status: 'processing',
        prompt: rawArgs.prompt,
        thumbUrl: strategy.getThumb(rawArgs),
        params: { model: modelKey, ...rawArgs },
        txHash: rawArgs.txHash,
      },
      ...l,
    ]);

    try {
      // 3. 上传文件 (如果有)
      const filesToUpload = strategy.getFiles(rawArgs);
      let ossUrls: string[] = [];

      if (filesToUpload.length > 0) {
        const res = await uploadImagesToOss(getToken(), filesToUpload);
        ossUrls = res.urls;
      }

      // 4. 组装 Payload (自动处理字段映射)
      const payload = strategy.buildPayload(rawArgs, ossUrls, rawArgs.txHash);
      console.log(payload, 'payloadpayloadpayloadpayload');

      // 🔥 修复：将实际的 model 值同步到 history 中，避免 modelKey 和实际 model 不一致
      history.update((l) =>
        l.map((item) => (item.id === tempId ? { ...item, params: { ...item.params, model: payload.model } } : item))
      );

      // 5. 运行核心任务
      await _runTaskCore(payload, tempId, address, onSuccess, strategy.pollConfig);
    } catch (e: any) {
      isGenerating.set(false);
      history.update((l) => l.filter((i) => i.id !== tempId));
      alert(`${modelKey} failed: ${e.message}`);
    }
  };

  // 返回
  return { isGenerating, history, submitTask, loadHistory };
}
