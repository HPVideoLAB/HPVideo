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

// 定义参数类型
export interface VideoTaskParams {
  files: File[];
  prompt: string;
  transitions: any[];
  resolution: string;
  seed: number;
  amount: number;
  duration: number;
  selectedModels: string[];
  token: string;
  translateFn: Function;
}

export class VideoChatService {
  /**
   * 【核心方法】提交视频生成任务
   */
  static async submitTask(params: VideoTaskParams) {
    const { files, prompt, transitions, resolution, seed, amount, duration, selectedModels, token, translateFn } =
      params;

    // ==========================================
    // 1. 上传阶段 (Upload)
    // ==========================================
    let uploadedUrls: string[] = [];
    if (files && files.length > 0) {
      try {
        const uploadRes = await uploadImagesToOss(token, files);
        uploadedUrls = uploadRes.urls || [];
      } catch (e) {
        console.error('Image upload failed', e);
        throw new Error('Image upload failed, please try again');
      }
    }

    // ==========================================
    // 2. 伪造数据阶段 (Optimistic UI)
    // ==========================================
    const userMessageId = uuidv4();
    const responseMessageId = uuidv4();
    const timestamp = Math.floor(Date.now() / 1000);

    // 获取 Store 快照
    const currentMessages: any = get(messagesStore);
    const currentHistory = get(historyStore);
    let currentChatId = get(chatId);
    const currentUser = get(user);

    // 2.1 构造 User Message
    const userMessage = {
      id: userMessageId,
      parentId: currentMessages.length > 0 ? currentMessages.at(-1).id : null,
      childrenIds: [responseMessageId],
      role: 'user',
      content: prompt,
      imageinfo: '',
      toolInfo: {
        duration: duration,
        size: resolution,
        amount: amount,
        transitions: transitions,
        seed: seed,
      },
      models: selectedModels,
      files: uploadedUrls.map((url) => ({ type: 'image', url: url })),
      timestamp: timestamp,
      user: currentUser,
    };

    // 2.2 构造 Assistant Message
    const responseMessage = {
      id: responseMessageId,
      parentId: userMessageId,
      childrenIds: [],
      role: 'assistant',
      content: '',
      status: 'processing',
      model: selectedModels[0],
      size: resolution,
      duration: duration,
      paystatus: true,
      paytype: 'unpaid',
      paymoney: amount,
      done: false,
      timestamp: timestamp,
      userContext: null,
    };

    // 2.3 链接上一条消息
    if (currentMessages.length > 0) {
      const lastMsgId = currentMessages.at(-1).id;
      if (currentHistory.messages[lastMsgId]) {
        currentHistory.messages[lastMsgId].childrenIds.push(userMessageId);
      }
    }

    // 2.4 更新本地 Store -> UI 刷新
    currentHistory.messages[userMessageId] = userMessage;
    currentHistory.messages[responseMessageId] = responseMessage;
    currentHistory.currentId = responseMessageId;

    this.updateStore(currentHistory);
    this.scrollToBottom();

    // ==========================================
    // 3. 存档阶段 (Sync to Backend)
    // ==========================================
    const newMessagesList = get(messagesStore);

    try {
      // 如果 ID 是 local、空字符串或者 undefined，说明是新对话
      if (!currentChatId || currentChatId === 'local' || currentChatId === '') {
        // --- Case A: 新建会话 (Create) ---
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

        // 更新本地 ID
        currentChatId = newChat.id;
        chatId.set(currentChatId);

        // 更新浏览器 URL
        window.history.replaceState(window.history.state, '', `/creator/c/${currentChatId}`);

        // 刷新左侧列表
        await chats.set(await getChatList(token));

        // ✨ 调用自动生成标题 (不 await)
        this.generateAndSetTitle(token, currentChatId, prompt, selectedModels[0]);
      } else {
        // --- Case B: 更新已有会话 (Update) ---
        await updateChatById(token, currentChatId, {
          messages: newMessagesList,
          history: currentHistory,
        });
      }

      // ==========================================
      // 4. 执行任务 (Call NestJS)
      // ==========================================
      const nestPayload: any = {
        prompt: prompt,
        images: uploadedUrls,
        transitions: transitions.map((t: any) => ({
          duration: Number(t.duration),
          ...(t.prompt?.trim() ? { prompt: t.prompt.trim() } : {}),
        })),
        resolution: resolution,
        seed: seed,
        model: 'pika',
      };

      const submitResp = await submitLargeLanguageModel(nestPayload);

      // ==========================================
      // 5. 轮询 (Polling)
      // ==========================================
      if (submitResp && submitResp.requestId) {
        // 不 await pollAndResolve，让它在后台运行
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

  /**
   * ✨ 辅助：自动生成并更新会话标题 (带拦截器)
   */
  private static async generateAndSetTitle(token: string, chatId: string, prompt: string, modelId: string) {
    const _settings = get(settings);
    const _models = get(models);

    if (!(_settings?.title?.auto ?? true)) return;

    try {
      const currModel: any = _models.find((m) => m.id === modelId);
      const titleModelId =
        currModel?.external ?? false ? _settings?.title?.modelExternal ?? modelId : _settings?.title?.model ?? modelId;

      const defaultTemplate = 'Create a concise, 3-5 word phrase as a header...: {{prompt}}';

      let title = await generateDeTitle(DEGPT_TOKEN, _settings?.title?.prompt || defaultTemplate, titleModelId, prompt);

      // 🚨 拦截器：防止 "Innovative Solutions Hub"
      if (!title || title.includes('Innovative Solutions Hub') || title.length > 30) {
        console.warn('Detected invalid AI title, falling back to prompt.');
        title = prompt.length > 15 ? prompt.slice(0, 15) + '...' : prompt;
      }

      if (title) {
        await updateChatById(token, chatId, { title });
        await chats.set(await getChatList(token));
      }
    } catch (e) {
      console.error('Auto title generation failed:', e);
      // 失败兜底
      const fallbackTitle = prompt.length > 15 ? prompt.slice(0, 15) + '...' : prompt;
      await updateChatById(token, chatId, { title: fallbackTitle });
      await chats.set(await getChatList(token));
    }
  }

  /**
   * 内部方法：轮询并处理最终结果
   */
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
      console.error('Polling Error:', err);
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
