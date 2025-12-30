import { v4 as uuidv4 } from 'uuid';
import { tick } from 'svelte';
import { get } from 'svelte/store';

// 1. 引入 Stores
import { chatId, chats, messages as messagesStore, history as historyStore, user, settings, models } from '$lib/stores';

// 2. 引入 API 接口
import { createNewChat, updateChatById, getChatList } from '$lib/apis/chats';
import { uploadImagesToOss, submitLargeLanguageModel, getLargeLanguageModelResult } from '$lib/apis/model/pika';
import { pollTaskResult } from '$lib/components/chat/MessageInput-modules/modules/task';
import { generateDeTitle } from '$lib/apis/de';
import { DEGPT_TOKEN } from '$lib/constants';

// 🔥 扩展参数接口
export interface VideoTaskParams {
  files: File[];
  prompt: string;
  selectedModels: string[]; // 真实值: ['pika-v2.2-pikaframes'] 等
  token: string;
  translateFn: Function;
  seed: number;
  amount: number;

  // Pika 专属
  transitions?: any[];
  resolution?: string;

  // Wan 专属
  negative_prompt?: string;
  strength?: number;
  duration?: number;
  num_inference_steps?: number;
  guidance_scale?: number;
  flow_shift?: number;
  loras?: any[];

  // Sam 专属
  apply_mask?: boolean;
}

export class VideoChatService {
  /**
   * 【核心方法】提交视频生成任务
   */
  static async submitTask(params: VideoTaskParams) {
    const {
      files,
      prompt,
      selectedModels,
      token,
      translateFn,
      seed,
      amount,
      // Pika
      transitions,
      resolution,
      // Wan
      negative_prompt,
      strength,
      duration,
      num_inference_steps,
      guidance_scale,
      flow_shift,
      loras,
      // Sam
      apply_mask,
    } = params;

    // 1. 获取前端模型 ID (例如 'wan-2.1-v2v')
    const currentModelId = selectedModels[0] || 'pika-v2.2-pikaframes';

    // 2. 模糊匹配判断逻辑 (兼容长 ID)
    const isWan = currentModelId.includes('wan'); // 匹配 'wan-2.1-v2v'
    const isSam = currentModelId.includes('sam'); // 匹配 'sam3-video'
    const isPika = !isWan && !isSam; // 匹配 'pika-v2.2-pikaframes'

    // 3. 🔥 映射为后端 DTO 需要的简短 ID
    let backendModelName = 'pika';
    if (isWan) backendModelName = 'wan-2.1';
    if (isSam) backendModelName = 'sam3';

    // ==========================================
    // 4. 上传阶段 (Upload)
    // ==========================================
    let uploadedUrls: string[] = [];
    if (files && files.length > 0) {
      try {
        const uploadRes = await uploadImagesToOss(token, files);
        uploadedUrls = uploadRes.urls || [];
      } catch (e) {
        console.error('Upload failed', e);
        throw new Error('Upload failed, please try again');
      }
    }

    // ==========================================
    // 5. 伪造数据阶段 (Optimistic UI)
    // ==========================================
    const userMessageId = uuidv4();
    const responseMessageId = uuidv4();
    const timestamp = Math.floor(Date.now() / 1000);

    const currentMessages: any = get(messagesStore);
    const currentHistory = get(historyStore);
    let currentChatId = get(chatId);
    const currentUser = get(user);

    // 5.1 构造 User Message (toolInfo 里的展示数据)
    const toolInfo: any = {
      amount,
      seed,
      ...(duration ? { duration } : {}),
    };

    if (isPika) {
      toolInfo.size = resolution;
      toolInfo.transitions = transitions;
    } else if (isWan) {
      toolInfo.strength = strength;
      toolInfo.steps = num_inference_steps;
      toolInfo.loras = loras;
    } else if (isSam) {
      toolInfo.apply_mask = apply_mask;
    }

    const userMessage = {
      id: userMessageId,
      parentId: currentMessages.length > 0 ? currentMessages.at(-1).id : null,
      childrenIds: [responseMessageId],
      role: 'user',
      content: prompt,
      imageinfo: '',
      toolInfo: toolInfo,
      models: selectedModels,
      // files 用于前端预览：Pika 是图片列表(image)，Wan/Sam 是视频(video)
      files: uploadedUrls.map((url) => ({
        type: isPika ? 'image' : 'video',
        url: url,
      })),
      timestamp: timestamp,
      user: currentUser,
    };

    // 5.2 构造 Assistant Message
    const responseMessage = {
      id: responseMessageId,
      parentId: userMessageId,
      childrenIds: [],
      role: 'assistant',
      content: '',
      status: 'processing',
      model: currentModelId, // 消息里存真实的前端 ID
      size: resolution || '720p',
      duration: duration || 0,
      paystatus: true,
      paytype: 'unpaid',
      paymoney: amount,
      done: false,
      timestamp: timestamp,
      userContext: null,
    };

    // 5.3 链接上一条消息
    if (currentMessages.length > 0) {
      const lastMsgId = currentMessages.at(-1).id;
      if (currentHistory.messages[lastMsgId]) {
        currentHistory.messages[lastMsgId].childrenIds.push(userMessageId);
      }
    }

    // 5.4 更新本地 Store
    currentHistory.messages[userMessageId] = userMessage;
    currentHistory.messages[responseMessageId] = responseMessage;
    currentHistory.currentId = responseMessageId;

    this.updateStore(currentHistory);
    this.scrollToBottom();

    // ==========================================
    // 6. 存档阶段 (Sync to Backend)
    // ==========================================
    const newMessagesList = get(messagesStore);

    try {
      if (!currentChatId || currentChatId === 'local' || currentChatId === '') {
        // --- Create Chat ---
        const chatPayload = {
          id: null,
          title: translateFn('New Chat'),
          models: selectedModels,
          options: {},
          messages: newMessagesList,
          history: currentHistory,
          timestamp: Date.now(),
          tags: [],
        };

        const newChat = await createNewChat(token, chatPayload);
        currentChatId = newChat.id;
        chatId.set(currentChatId);
        window.history.replaceState(window.history.state, '', `/creator/c/${currentChatId}`);
        await chats.set(await getChatList(token));

        this.generateAndSetTitle(token, currentChatId, prompt, currentModelId);
      } else {
        // --- Update Chat ---
        await updateChatById(token, currentChatId, {
          messages: newMessagesList,
          history: currentHistory,
        });
      }

      // ==========================================
      // 7. 🔥 执行任务 (Call NestJS)
      // ==========================================

      // 基础通用参数
      let nestPayload: any = {
        prompt: prompt,
        seed: seed,
        model: backendModelName, // 🔥 传给后端的是简短 ID ('pika', 'wan-2.1', 'sam3')
      };

      if (isPika) {
        // 🟢 Pika Payload
        nestPayload = {
          ...nestPayload,
          images: uploadedUrls,
          resolution: resolution,
          transitions: Array.isArray(transitions)
            ? transitions.map((t: any) => ({
                duration: Number(t.duration),
                ...(t.prompt?.trim() ? { prompt: t.prompt.trim() } : {}),
              }))
            : [],
        };
      } else if (isWan) {
        // 🔵 Wan Payload
        nestPayload = {
          ...nestPayload,
          video: uploadedUrls[0], // 取第一个 URL
          negative_prompt: negative_prompt,
          strength: strength,
          duration: duration,
          num_inference_steps: num_inference_steps,
          guidance_scale: guidance_scale,
          flow_shift: flow_shift,
          loras: loras,
        };
      } else if (isSam) {
        // 🟣 SAM Payload
        nestPayload = {
          ...nestPayload,
          video: uploadedUrls[0], // 取第一个 URL
          apply_mask: apply_mask,
        };
      }

      // console.log('Final Payload to NestJS:', nestPayload);

      const submitResp = await submitLargeLanguageModel(nestPayload);

      // ==========================================
      // 8. 轮询 (Polling)
      // ==========================================
      if (submitResp && submitResp.requestId) {
        this.pollAndResolve(token, currentChatId, responseMessageId, submitResp.requestId);
      } else {
        throw new Error('Failed to get task ID (requestId)');
      }
    } catch (error: any) {
      console.error('Video Generation Error:', error);

      this.updateSingleMessage(responseMessageId, {
        status: 'failed',
        done: true,
        content: error.message || 'Generation failed, please try again',
      });

      if (currentChatId && currentChatId !== 'local') {
        await updateChatById(token, currentChatId, {
          messages: get(messagesStore),
          history: get(historyStore),
        });
      }
    }
  }

  // ... (generateAndSetTitle, pollAndResolve 等私有方法保持不变，直接复用即可) ...
  // 为节省篇幅，下面是这些固定方法的精简版，你需要保留原有的完整实现

  private static async generateAndSetTitle(token: string, chatId: string, prompt: string, modelId: string) {
    // ... 原有逻辑 ...
    const _settings = get(settings);
    const _models = get(models);
    if (!(_settings?.title?.auto ?? true)) return;
    try {
      const currModel: any = _models.find((m) => m.id === modelId);
      const titleModelId =
        currModel?.external ?? false ? _settings?.title?.modelExternal ?? modelId : _settings?.title?.model ?? modelId;
      const defaultTemplate = 'Create a concise, 3-5 word phrase as a header...: {{prompt}}';
      let title = await generateDeTitle(DEGPT_TOKEN, _settings?.title?.prompt || defaultTemplate, titleModelId, prompt);
      if (!title || title.includes('Innovative Solutions Hub') || title.length > 30) {
        title = prompt.length > 15 ? prompt.slice(0, 15) + '...' : prompt;
      }
      if (title) {
        await updateChatById(token, chatId, { title });
        await chats.set(await getChatList(token));
      }
    } catch (e) {
      const fallbackTitle = prompt.length > 15 ? prompt.slice(0, 15) + '...' : prompt;
      await updateChatById(token, chatId, { title: fallbackTitle });
      await chats.set(await getChatList(token));
    }
  }

  private static async pollAndResolve(token: string, chatIdStr: string, msgId: string, requestId: string) {
    try {
      const result = await pollTaskResult({
        requestId,
        fetcher: (rid) => getLargeLanguageModelResult(rid),
      } as any);

      let finalUrl = '';
      if (Array.isArray(result.url) && result.url.length > 0) {
        finalUrl = result.url[0];
      } else if (typeof result.url === 'string') {
        finalUrl = result.url;
      }

      this.updateSingleMessage(msgId, {
        status: 'completed',
        content: finalUrl,
        done: true,
      });

      await updateChatById(token, chatIdStr, {
        messages: get(messagesStore),
        history: get(historyStore),
      });
    } catch (err) {
      this.updateSingleMessage(msgId, {
        status: 'failed',
        done: true,
        content: 'Generation failed, please try again',
      });
      await updateChatById(token, chatIdStr, {
        messages: get(messagesStore),
        history: get(historyStore),
      });
    }
  }

  private static updateStore(newHistory: any) {
    historyStore.set({ ...newHistory });
    messagesStore.set(this.reconstructMessages(newHistory));
    tick();
  }

  private static updateSingleMessage(msgId: string, fields: any) {
    historyStore.update((h) => {
      if (h.messages && h.messages[msgId]) {
        h.messages[msgId] = { ...h.messages[msgId], ...fields };
      }
      return { ...h };
    });
    const h = get(historyStore);
    messagesStore.set(this.reconstructMessages(h));
  }

  private static reconstructMessages(history: any) {
    let _messages: any = [];
    if (history.currentId) {
      let currentMessage = history.messages[history.currentId];
      while (currentMessage) {
        _messages.unshift({ ...currentMessage });
        currentMessage = currentMessage.parentId ? history.messages[currentMessage.parentId] : null;
      }
    }
    return _messages;
  }

  private static scrollToBottom() {
    setTimeout(() => {
      const el = document.getElementById('messages-container');
      if (el) el.scrollTop = el.scrollHeight;
    }, 100);
  }
}
