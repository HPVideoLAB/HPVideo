<script lang="ts">
  import { v4 as uuidv4 } from 'uuid';
  import { toast } from 'svelte-sonner';

  import { onMount, tick, getContext } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import {
    models,
    modelfiles,
    settings,
    chats,
    chatId,
    WEBUI_NAME,
    tags as _tags,
    showSidebar,
    theme,
    paystatus,
    chatsearch,
    // 👇 引用 Store
    messages,
    history,
  } from '$lib/stores';
  import { copyToClipboard, convertMessagesToHistory } from '$lib/utils';

  import { getDeOpenAIChatCompletion, getDeOpenAIChatResult, generateDeTitle } from '$lib/apis/de';
  import { DEGPT_TOKEN } from '$lib/constants';

  import { createNewChat, getChatById, getChatList, getTagsById, updateChatById } from '$lib/apis/chats';

  import { createOpenAITextStream } from '$lib/apis/streaming';
  import { queryMemory } from '$lib/apis/memories';

  // 引入组件
  import MessageInput from '$lib/components/chat/MessageInput.svelte';
  import Messages from '$lib/components/chat/Messages.svelte';
  import Navbar from '$lib/components/layout/Navbar.svelte';
  import ImgToVideo from '$lib/components/chat/MessageInput-modules/ImgToVideo.svelte'; // 确保引入了它

  import { config as wconfig, modal, getUSDTBalance, tranUsdt } from '$lib/utils/wallet/bnb/index';
  import { getAccount } from '@wagmi/core';
  import { bnbpaycheck } from '$lib/apis/pay';

  const i18n: any = getContext('i18n');

  let loaded = false;

  let stopResponseFlag = false;
  let autoScroll = true;
  let processing = '';
  let messagesContainerElement: HTMLDivElement;
  let currentRequestId = null;

  // let chatId = $page.params.id;
  let showModelSelector = true;

  let selectedModels = [''];
  let atSelectedModel = '';

  let selectedModelfile = null;

  $: selectedModelfile =
    selectedModels.length === 1 && $modelfiles.filter((modelfile) => modelfile.tagName === selectedModels[0]).length > 0
      ? $modelfiles.filter((modelfile) => modelfile.tagName === selectedModels[0])[0]
      : null;

  let selectedModelfiles = {};
  $: selectedModelfiles = selectedModels.reduce((a, tagName, i, arr) => {
    const modelfile = $modelfiles.filter((modelfile) => modelfile.tagName === tagName)?.at(0) ?? undefined;
    return {
      ...a,
      ...(modelfile && { [tagName]: modelfile }),
    };
  }, {});

  let chat = null;
  let tags = [];

  let title = '';
  let prompt = '';
  let files = [];
  let fileFlag = false;

  let firstResAlready = false; // 已经有了第一个响应

  let chatInputPlaceholder = '';

  // 👇 Store 监听
  $: if ($history.currentId !== null) {
    let _messages = [];
    let currentMessage = $history.messages[$history.currentId];
    while (currentMessage !== null) {
      _messages.unshift({ ...currentMessage });
      currentMessage = currentMessage.parentId !== null ? $history.messages[currentMessage.parentId] : null;
    }
    $messages = _messages;
  } else {
    $messages = [];
  }

  $: if ($page.params.id) {
    (async () => {
      if (await loadChat()) {
        await tick();
        loaded = true;
        window.setTimeout(() => scrollToBottom(), 0);
      } else {
        await goto('/creator');
      }
    })();
  }

  $: if ($chatsearch != '') {
    const resultIds = Object.values($history.messages)
      .filter((item: any) => {
        const contentStr = typeof item.content === 'string' ? item.content : '';
        return contentStr.includes($chatsearch);
      })
      .map((item: any) => item.id);
    if (resultIds.length > 0) {
      scrollContent(resultIds[0]);
    }
  }
  function scrollContent(id: string) {
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }

  // 定义图生视频模型列表
  const allowModel = ['pika-v2.2-pikaframes', 'sam3-video', 'wan-2.1-v2v'];

  // 👇👇👇 核心：响应式判断当前模型是否为视频模型
  $: currentModelId = selectedModels.length > 0 ? selectedModels[0] : '';
  $: isVideoModel = allowModel.includes(currentModelId);

  //////////////////////////
  // Web functions
  //////////////////////////

  const loadChat = async () => {
    await chatId.set($page.params.id);
    chat = await getChatById(localStorage.token, $chatId).catch(async (error) => {
      await goto('/creator');
      return null;
    });

    if (chat) {
      tags = await getTags();
      const chatContent = chat.chat;

      if (chatContent) {
        if (chatContent.models) selectedModels = chatContent.models;

        // 👇👇👇 核心修复：数据清洗逻辑 (Data Cleaning) 👇👇👇
        // 这一步专门用来修复历史遗留的 "content 是数组" 的问题
        let loadedHistory =
          (chatContent?.history ?? undefined) !== undefined
            ? chatContent.history
            : convertMessagesToHistory(chatContent.messages);

        if (loadedHistory && loadedHistory.messages) {
          Object.keys(loadedHistory.messages).forEach((msgId) => {
            const msg = loadedHistory.messages[msgId];
            // 如果 content 是数组，取第一个元素变成字符串
            if (Array.isArray(msg.content) && msg.content.length > 0) {
              msg.content = msg.content[0];
            } else if (Array.isArray(msg.content) && msg.content.length === 0) {
              msg.content = ''; // 空数组变空字符串
            }
          });
        }
        // 👆👆👆 修复结束 👆👆👆

        $history = loadedHistory;
        title = chatContent.title;

        let _settings = JSON.parse(localStorage.getItem('settings') ?? '{}');
        await settings.set({
          ..._settings,
          system: chatContent.system ?? _settings.system,
          options: chatContent.options ?? _settings.options,
        });
        autoScroll = true;
        await tick();

        if ($messages.length > 0) {
          if ($messages.at(-1)) {
            $history.messages[$messages.at(-1).id].done = true;
          }
        }
        await tick();

        return true;
      } else {
        return null;
      }
    }
  };

  const scrollToBottom = async () => {
    await tick();
    if (messagesContainerElement) {
      messagesContainerElement.scrollTop = messagesContainerElement.scrollHeight;
    }
  };

  //////////////////////////
  // Ollama functions
  //////////////////////////
  // 2. 点击提交按钮，触发检查
  const submitPrompt = async (userPrompt: string, videoInfo: any, _user = null) => {
    console.log('submitPrompt', $chatId);

    selectedModels = selectedModels.map((modelId) => ($models.map((m) => m.id).includes(modelId) ? modelId : ''));

    firstResAlready = false;
    await tick();

    if (selectedModels.includes('')) {
      toast.error($i18n.t('Model not selected'));
    }
    // ⚠️ messages -> $messages
    else if ($messages.length != 0 && $messages.at(-1).done != true) {
      console.log('wait');
    } else if (files.length > 0 && files.filter((file) => file.upload_status === false).length > 0) {
      toast.error(
        `Oops! Hold tight! Your files are still in the processing oven. We're cooking them up to perfection. Please be patient and we'll let you know once they're ready.`
      );
    } else {
      document.getElementById('chat-textarea').style.height = '';

      // Create user message
      let userMessageId = uuidv4();
      let userMessage = {
        id: userMessageId,
        parentId: $messages.length !== 0 ? $messages.at(-1).id : null,
        childrenIds: [],
        role: 'user',
        user: _user ?? undefined,
        content: userPrompt,
        files: files.length > 0 ? files : undefined,
        toolInfo: videoInfo,
        timestamp: Math.floor(Date.now() / 1000), // Unix epoch
        models: selectedModels,
      };

      $history.messages[userMessageId] = userMessage;
      $history.currentId = userMessageId;

      if ($messages.length !== 0) {
        $history.messages[$messages.at(-1).id].childrenIds.push(userMessageId);
      }

      let responseMap: any = {};
      selectedModels.map(async (modelId) => {
        const model = $models.filter((m) => m.id === modelId).at(0);
        if (model) {
          let responseMessageId = uuidv4();
          let responseMessage = {
            parentId: userMessageId,
            id: responseMessageId,
            childrenIds: [],
            role: 'assistant',
            size: videoInfo?.size,
            duration: videoInfo?.duration,
            paystatus: false,
            paytype: 'unpaid',
            paymoney: videoInfo?.amount,
            status: 'processing',
            content: 'paying',
            model: model.id,
            userContext: null,
            done: true,
            timestamp: Math.floor(Date.now() / 1000), // Unix epoch
          };

          $history.messages[responseMessageId] = responseMessage;
          $history.currentId = responseMessageId;

          if (userMessageId !== null) {
            $history.messages[userMessageId].childrenIds = [
              ...$history.messages[userMessageId].childrenIds,
              responseMessageId,
            ];
          }
          responseMap[model?.id] = responseMessage;
        }
      });

      prompt = '';
      files = [];

      await tick();
      scrollToBottom();

      try {
        if ($messages.length == 2) {
          if ($settings.saveChatHistory ?? true) {
            chat = await createNewChat(localStorage.token, {
              id: $chatId,
              title: $i18n.t('New Chat'),
              models: selectedModels,
              system: $settings.system ?? undefined,
              options: {
                ...($settings.options ?? {}),
              },
              messages: $messages,
              history: $history,
              timestamp: Date.now(),
            });
            await chats.set(await getChatList(localStorage.token));
            await chatId.set(chat.id);
          } else {
            await chatId.set('local');
          }
          await tick();
        }

        const _chatId = JSON.parse(JSON.stringify($chatId));
        await updateChatMessage(_chatId);

        stopResponse();
      } catch (err) {
        const _chatId = JSON.parse(JSON.stringify($chatId));
        Object.keys(responseMap).map(async (modelId) => {
          const model = $models.filter((m) => m.id === modelId).at(0);
          let responseMessage = responseMap[model?.id];
          await handleOpenAIError(err, null, model, responseMessage);

          $history.messages[responseMessageId] = responseMessage;

          await updateChatMessage(_chatId);

          await tick();

          if (autoScroll) {
            scrollToBottom();
          }
        });
      }
    }
  };

  //=======bnb pay function=======
  const connect = () => {
    checkModalTheme();
    modal.open();
  };
  const checkModalTheme = () => {
    if ($theme === 'system' || $theme === 'light') {
      modal.setThemeMode('light');
    } else {
      modal.setThemeMode('dark');
    }
  };
  const startPay = async (messageinfo: any) => {
    const account = getAccount(wconfig);
    if (!account?.address) {
      connect();
      $paystatus = false;
      return;
    }

    let paymoney = messageinfo?.paymoney.toString();
    let body = {
      hash: '',
      address: account?.address,
      messageid: messageinfo?.id,
      model: messageinfo?.model,
      size: messageinfo?.size,
      duration: messageinfo?.duration,
      amount: paymoney,
    };
    const response = await bnbpaycheck(localStorage.token, body);
    console.log('==============checkpay result=============', response);
    if (response?.ok) {
      $paystatus = false;
      await updatePayStatus(messageinfo, true, 'paying');

      // Send prompt
      let currResponseMap: any = {};
      currResponseMap[messageinfo?.model] = messageinfo;
      let currmessage = $messages.filter((item) => item.id == messageinfo?.parentId);
      await sendPrompt(currmessage[0].content, currResponseMap);
    } else {
      const balance = await getUSDTBalance(account?.address);

      if (Number(paymoney) <= balance) {
        await updatePayStatus(messageinfo, false, 'paying');

        const txResponse = await tranUsdt(paymoney, messageinfo.id);
        if (txResponse) {
          let body = {
            hash: txResponse?.hash,
            address: account?.address,
            messageid: messageinfo?.id,
            model: messageinfo?.model,
            size: messageinfo?.size,
            duration: messageinfo?.duration,
            amount: paymoney,
          };
          const response = await bnbpaycheck(localStorage.token, body);
          if (response?.ok) {
            $paystatus = false;
            await updatePayStatus(messageinfo, true, 'paying');
            toast.success($i18n.t('Pay Success'));

            // Send prompt
            let currResponseMap: any = {};
            currResponseMap[messageinfo?.model] = messageinfo;
            let currmessage = $messages.filter((item) => item.id == messageinfo?.parentId);
            await sendPrompt(currmessage[0].content, currResponseMap);
          } else {
            $paystatus = false;
            await updatePayStatus(messageinfo, false, 'unpaid');
            toast.error($i18n.t('Pay Failed'));
          }
        } else {
          $paystatus = false;
          await updatePayStatus(messageinfo, false, 'unpaid');
          toast.error($i18n.t('Pay Failed'));
        }
      } else {
        $paystatus = false;
        toast.error($i18n.t('Insufficient USDT Balance'));
      }
    }
  };

  // update chat message into db
  const updatePayStatus = async (messageinfo: any, paystatus: boolean, payval: string) => {
    let responseMessageId = messageinfo?.id;
    messageinfo.paystatus = paystatus;
    messageinfo.paytype = payval;
    messageinfo.status = payval;
    messageinfo.content = payval;
    $history.messages[responseMessageId] = messageinfo;
    await updateChatMessage($chatId);
  };

  // 3\2. 继续聊天会话
  const sendPrompt = async (prompt: string, responseMap: any, modelId = null, reload = false) => {
    const _chatId = JSON.parse(JSON.stringify($chatId));
    // 对每个模型都做请求
    await Promise.all(
      (modelId ? [modelId] : atSelectedModel !== '' ? [atSelectedModel.id] : Object.keys(responseMap)).map(
        async (modelId) => {
          const model = $models.filter((m) => m.id === modelId).at(0);
          if (model) {
            // 创建响应消息
            let responseMessage = responseMap[model?.id];
            let responseMessageId = responseMessage?.id;

            responseMessage.content = '';
            responseMessage.done = false;

            $history.messages[responseMessageId] = responseMessage;
            $history.currentId = responseMessageId;

            let userContext = null;
            if ($settings?.memory ?? false) {
              if (userContext === null) {
                const res = await queryMemory(localStorage.token, prompt).catch((error) => {
                  toast.error(error);
                  return null;
                });

                if (res) {
                  if (res.documents[0].length > 0) {
                    userContext = res.documents.reduce((acc, doc, index) => {
                      const createdAtTimestamp = res.metadatas[index][0].created_at;
                      const createdAtDate = new Date(createdAtTimestamp * 1000).toISOString().split('T')[0];
                      acc.push(`${index + 1}. [${createdAtDate}]. ${doc[0]}`);
                      return acc;
                    }, []);
                  }

                  console.log(userContext);
                }
              }
            }
            responseMessage.userContext = userContext;

            // send a video request
            stopResponseFlag = false;
            await sendPromptDeOpenAI(model, responseMessageId, _chatId, reload);
          } else {
            console.error($i18n.t(`Model {{modelId}} not found`, {}));
          }
        }
      )
    );

    // 所有模型响应结束后，还原firstResAlready为初始状态false
    firstResAlready = false;

    // 加载聊天列表（赋值聊天title）
    if ($messages.length == 2) {
      window.history.replaceState(window.history.state, '', `/creator/c/${_chatId}`);
      const _title = await generateDeChatTitle(prompt);
      await setChatTitle(_chatId, _title);
    } else {
      await chats.set(await getChatList(localStorage.token));
    }
  };

  const checkImage = () => {
    const userMsgsa = $messages.filter((item) => item.role === 'user');
    const lastUserMsg = userMsgsa.length > 0 ? userMsgsa[userMsgsa.length - 1] : null;
    if (lastUserMsg && Array.isArray(lastUserMsg.files)) {
      return true;
    } else {
      return false;
    }
  };
  // 对话DeGpt (子页面修正版)
  const sendPromptDeOpenAI = async (model, responseMessageId, _chatId, reload) => {
    console.log('🔍 [Child Debug] 进入 sendPromptDeOpenAI');
    const responseMessage = $history.messages[responseMessageId];

    scrollToBottom();

    try {
      let send_message = [
        $settings.system || (responseMessage?.userContext ?? null)
          ? {
              role: 'system',
              content: `${$settings?.system ?? ''}${
                responseMessage?.userContext ?? null
                  ? `\n\nUser Context:\n${(responseMessage?.userContext ?? []).join('\n')}`
                  : ''
              }`,
            }
          : undefined,
        ...$messages,
      ].filter((message) => message);

      send_message = send_message.filter((item) => !item.error).filter((item) => item.content != '');

      send_message = send_message.map((message, idx, arr) => ({
        role: message.role,
        ...((message.files?.filter((file) => file.type === 'image').length > 0 ?? false) && message.role === 'user'
          ? {
              content: [
                {
                  type: 'text',
                  text: arr.length - 1 !== idx ? message.content : message?.raContent ?? message.content,
                },
                ...message.files
                  .filter((file) => file.type === 'image')
                  .map((file) => ({
                    type: 'image_url',
                    image_url: {
                      url: file.url,
                    },
                  })),
              ],
            }
          : {
              content: arr.length - 1 !== idx ? message.content : message?.raContent ?? message.content,
            }),
      }));

      let fileFlag = checkImage();

      const [res, controller] = await getDeOpenAIChatCompletion(localStorage.token, {
        source: model.source,
        permodel: model.id,
        model: fileFlag ? model.imagemodel : model.textmodel,
        duration: responseMessage.duration,
        messageid: responseMessageId,
        messages: send_message,
        size: responseMessage.size,
      });

      await tick();
      scrollToBottom();

      // 6. 创建openai对话数据流
      if (res && res.ok && res.body) {
        if (reload) {
          responseMessage.reload = false;
        }
        const textStream = await createOpenAITextStream(res.body, true);
        for await (const update of textStream) {
          let { value, limit, createId, status, paystatus, paymoney, done, error } = update;

          console.log('🔍 [Child Debug Stream Send]', { value, status, done, isArray: Array.isArray(value) });

          if (paymoney) {
            responseMessage.paystatus = paystatus;
            responseMessage.paymoney = paymoney;
          }
          if (status) {
            responseMessage.status = status;
          }
          if (!done) {
            responseMessage.limit = limit;
          }
          if (!responseMessage.createId && createId) {
            responseMessage.createId = createId;
            updateChatMessage(_chatId);
          }

          // 这里不直接更新 $messages，后面统一刷新 $history
          // $messages = $messages;

          if (error) {
            await handleOpenAIError(error, null, model, responseMessage);
            break;
          }
          if (value && !firstResAlready) {
            firstResAlready = true;
            $history.currentId = responseMessageId;
          }

          if (done || stopResponseFlag || _chatId !== $chatId) {
            responseMessage.done = true;
            // ✨✨✨ 强制刷新源头 history ✨✨✨
            $history = $history;
            if (stopResponseFlag) {
              controller.abort('User: Stop Response');
            }
            break;
          }

          if (status == 'completed') {
            responseMessage.replytime = Math.floor(Date.now() / 1000);
          }

          if (!firstResAlready && responseMessage.content.length > 0) {
            firstResAlready = true;
            $history.currentId = responseMessageId;
            await tick();
          }

          // 1. 数组清洗
          if (Array.isArray(value) && value.length > 0) {
            console.log('🔍 [Child Debug] SendPrompt 检测到数组，正在转换:', value);
            value = value[0];
          }

          // 2. 赋值保护 + 强制刷新 history
          if (value && value.length > 0) {
            responseMessage.content = value;
            // ✨✨✨ 强制刷新源头 history ✨✨✨
            $history = $history;
          }

          if ($settings.responseAutoCopy) {
            copyToClipboard(responseMessage.content);
          }

          if ($settings.responseAutoPlayback) {
            await tick();
            document.getElementById(`speak-button-${responseMessage.id}`)?.click();
          }

          if (autoScroll) {
            scrollToBottom();
          }
        }
      } else {
        await handleOpenAIError(null, res, model, responseMessage);
      }
    } catch (error) {
      console.error('🔍 [Child Debug Error]', error);
      await handleOpenAIError(error, null, model, responseMessage);
    }

    // 更新消息到数据库
    await updateChatMessage(_chatId);

    await tick();
    if (autoScroll) {
      scrollToBottom();
    }
  };

  const refreshVideoResult = async (messageinfo: any, _chatId: string) => {
    console.log('🔍 [Child Debug] 进入 refreshVideoResult', messageinfo.createId);

    if (messageinfo.createId) {
      scrollToBottom();

      let responseMessageId = messageinfo?.id;
      messageinfo.done = false;
      messageinfo.error = false;
      messageinfo.status = 'processing';
      $history.messages[responseMessageId] = messageinfo;

      const responseMessage = $history.messages[responseMessageId];
      let currModel = $models.find((item) => item.id == responseMessage.model);
      let fileFlag = checkImage();

      try {
        const [res, controller] = await getDeOpenAIChatResult(localStorage.token, {
          requestId: messageinfo.createId,
          source: currModel?.source,
          permodel: currModel?.id,
          model: fileFlag ? currModel?.imagemodel : currModel?.textmodel,
          duration: responseMessage?.duration,
          size: responseMessage?.size,
          messageid: responseMessageId,
          messages: $messages,
        });

        await tick();
        scrollToBottom();

        if (res && res.ok && res.body) {
          const textStream = await createOpenAITextStream(res.body, true);
          for await (const update of textStream) {
            let { value, status, done, error } = update;

            console.log('🔍 [Child Debug Stream Refresh]', { value, status, done, isArray: Array.isArray(value) });

            if (status) {
              responseMessage.status = status;
            }
            // 不刷新 messages，后面统一刷 history
            // $messages = $messages;

            if (error) {
              await handleOpenAIError(error, null, null, responseMessage);
              break;
            }

            if (done || stopResponseFlag || _chatId !== $chatId) {
              responseMessage.done = true;
              // ✨✨✨ 强制刷新源头 history ✨✨✨
              $history = $history;
              if (stopResponseFlag) {
                controller.abort('User: Stop Response');
              }
              break;
            }

            // 1. 数组清洗
            if (Array.isArray(value) && value.length > 0) {
              console.log('🔍 [Child Debug] 检测到数组，正在转换:', value);
              value = value[0];
            }

            // 2. 赋值保护 + 强制刷新 history
            if (value && value.length > 0) {
              responseMessage.content = value;
              // ✨✨✨ 强制刷新源头 history ✨✨✨
              $history = $history;
            }

            if (autoScroll) {
              scrollToBottom();
            }
          }
        }
      } catch (error) {
        console.error('🔍 [Child Debug Error]', error);
        await handleOpenAIError(error, null, null, responseMessage);
      }

      await updateChatMessage(_chatId);
      await tick();
      if (autoScroll) {
        scrollToBottom();
      }
    } else {
      let currResponseMap: any = {};
      currResponseMap[messageinfo?.model] = messageinfo;
      let currmessage = $messages.filter((item) => item.id == messageinfo?.parentId);
      await sendPrompt(currmessage[0].content, currResponseMap);
    }
  };

  // 更新消息到数据库
  const updateChatMessage = async (_chatId: string) => {
    $messages = $messages;

    stopResponseFlag = false;

    // 更新聊天记录
    if (_chatId === $chatId) {
      if ($settings.saveChatHistory ?? true) {
        await updateChatById(localStorage.token, _chatId, {
          messages: $messages,
          history: $history,
        });
      }
    }
  };

  const generateDeChatTitle = async (userPrompt) => {
    if ($settings?.title?.auto ?? true) {
      const model = $models.find((model) => model.id === selectedModels[0]);

      const titleModelId =
        model?.external ?? false
          ? $settings?.title?.modelExternal ?? selectedModels[0]
          : $settings?.title?.model ?? selectedModels[0];
      const titleModel = $models.find((model) => model.id === titleModelId);

      console.log(titleModel);
      const title = await generateDeTitle(
        DEGPT_TOKEN,
        $settings?.title?.prompt ??
          $i18n.t(
            "Create a concise, 3-5 word phrase as a header for the following query, strictly adhering to the 3-5 word limit and avoiding the use of the word 'title':"
          ) + ' {{prompt}}',
        titleModelId,
        userPrompt
      );

      return title;
    } else {
      return `${userPrompt}`;
    }
  };

  const handleOpenAIError = async (error, res: Response | null, model, responseMessage) => {
    responseMessage.error = true;
    responseMessage.content = 'It seems that you are offline. Please reconnect to send messages.';
    responseMessage.done = true;
    $messages = $messages;
  };

  const stopResponse = () => {
    stopResponseFlag = true;
    console.log('stopResponse');
  };
  const regenerateResponse = async (message) => {
    console.log('regenerateResponse');

    if ($messages.length != 0) {
      let userMessage = $history.messages[message.parentId];
      let userPrompt = userMessage.content;

      if ((userMessage?.models ?? [...selectedModels]).length == 1) {
        await sendPrompt(userPrompt, userMessage.id);
      } else {
        await sendPrompt(userPrompt, userMessage.id, message.model);
      }
    }
  };

  const continueGeneration = async () => {
    console.log('continueGeneration');
    const _chatId = JSON.parse(JSON.stringify($chatId));

    if ($messages.length != 0 && $messages.at(-1).done == true) {
      const responseMessage = $history.messages[$history.currentId];
      responseMessage.done = false;
      await tick();

      const model = $models.filter((m) => m.id === responseMessage.model).at(0);

      if (model) {
        await sendPromptDeOpenAI(model, responseMessage.id, _chatId);
      }
    } else {
      console.error($i18n.t(`Model {{modelId}} not found`, {}));
      // toast.error($i18n.t(`Model {{modelId}} not found`, { modelId }));
    }
  };

  const setChatTitle = async (_chatId, _title) => {
    if (_chatId === $chatId) {
      title = _title;
    }

    if ($settings.saveChatHistory ?? true) {
      chat = await updateChatById(localStorage.token, _chatId, {
        title: _title,
      });
      await chats.set(await getChatList(localStorage.token));
    }
  };

  const getTags = async () => {
    return await getTagsById(localStorage.token, $chatId).catch(async (error) => {
      return [];
    });
  };

  onMount(async () => {
    if (!($settings.saveChatHistory ?? true)) {
      await goto('/creator');
    }
  });
</script>

<svelte:head>
  <title>
    {title ? `${title.length > 30 ? `${title.slice(0, 30)}...` : title} | ${$WEBUI_NAME}` : `${$WEBUI_NAME}`}
  </title>
</svelte:head>

{#if loaded}
  <div
    class="min-h-screen max-h-screen {$showSidebar
      ? 'md:max-w-[calc(100%-310px)]'
      : ''} w-full max-w-full flex flex-col"
  >
    <Navbar
      {title}
      {chat}
      bind:selectedModels
      bind:showModelSelector
      shareEnabled={$messages.length > 0}
      initNewChat={async () => {
        if (currentRequestId !== null) {
          await cancelOllamaRequest(localStorage.token, currentRequestId);
          currentRequestId = null;
        }
        prompt = '';
        goto('/creator');
      }}
    />

    {#if isVideoModel}
      <div class="flex flex-col flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <div
          class="flex-1 flex flex-col w-full"
          id="messages-container"
          bind:this={messagesContainerElement}
          on:scroll={(e) => {
            autoScroll =
              messagesContainerElement.scrollHeight - messagesContainerElement.scrollTop <=
              messagesContainerElement.clientHeight + 45;
          }}
        >
          <!-- <div class="pt-6">
            {#if selectedModels[0] && $models.find((m) => m.id === selectedModels[0])}
              <div class="flex flex-col justify-center items-center w-full">
                <img class="size-8" src={$models.find((m) => m.id === selectedModels[0]).modelicon} alt="" />
                <span class="text-xl font-bold mt-1">{$models.find((m) => m.id === selectedModels[0]).name}</span>
                <span class="w-full max-w-[600px] text-lg text-center mt-1.5 px-5 text-gray-500">
                  {$i18n.t($models.find((m) => m.id === selectedModels[0]).desc)}
                </span>
              </div>
            {/if}
          </div> -->

          <div class="h-full w-full flex flex-col pb-4 px-2 md:px-4">
            <Messages
              chatId={$chatId}
              {selectedModels}
              {selectedModelfiles}
              {processing}
              bind:history={$history}
              bind:messages={$messages}
              bind:autoScroll
              bind:prompt
              bind:chatInputPlaceholder
              bottomPadding={files.length > 0}
              {sendPrompt}
              {startPay}
              {refreshVideoResult}
              {continueGeneration}
              {regenerateResponse}
            />
          </div>
        </div>

        <div class="w-full bg-white dark:bg-gray-900 z-20">
          <div class="p-2 md:p-4">
            <ImgToVideo />
          </div>
        </div>
      </div>
    {:else}
      <div class="flex flex-col flex-auto overflow-y-auto">
        <div
          class=" pb-2.5 flex flex-col justify-between w-full flex-auto max-w-full"
          id="messages-container"
          bind:this={messagesContainerElement}
          on:scroll={(e) => {
            autoScroll =
              messagesContainerElement.scrollHeight - messagesContainerElement.scrollTop <=
              messagesContainerElement.clientHeight + 45;
          }}
        >
          <div class=" h-full w-full flex flex-col py-4">
            <Messages
              chatId={$chatId}
              {selectedModels}
              {selectedModelfiles}
              {processing}
              bind:history={$history}
              bind:messages={$messages}
              bind:autoScroll
              bind:prompt
              bind:chatInputPlaceholder
              bottomPadding={files.length > 0}
              {sendPrompt}
              {startPay}
              {refreshVideoResult}
              {continueGeneration}
              {regenerateResponse}
            />
          </div>
        </div>
      </div>
    {/if}
  </div>

  {#if !isVideoModel}
    <MessageInput
      bind:files
      bind:prompt
      bind:autoScroll
      bind:chatInputPlaceholder
      bind:selectedModel={atSelectedModel}
      bind:currentModel={selectedModels}
      messages={$messages}
      {submitPrompt}
      {stopResponse}
    />
  {/if}
{/if}
