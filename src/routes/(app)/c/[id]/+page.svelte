<script lang="ts">
  import { v4 as uuidv4 } from 'uuid';
  import { toast } from 'svelte-sonner';
  // 原来的引用可能只有 getAccount
  import { getAccount, getBalance } from '@wagmi/core';
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
  } from '$lib/stores';
  import { copyToClipboard, convertMessagesToHistory } from '$lib/utils';

  import { getDeOpenAIChatCompletion, getDeOpenAIChatResult, generateDeTitle } from '$lib/apis/de';
  import { DEGPT_TOKEN } from '$lib/constants';

  import { createNewChat, getChatById, getChatList, getTagsById, updateChatById } from '$lib/apis/chats';

  import { createOpenAITextStream } from '$lib/apis/streaming';
  import { queryMemory } from '$lib/apis/memories';
  import MessageInput from '$lib/components/chat/MessageInput.svelte';
  import Messages from '$lib/components/chat/Messages.svelte';
  import Navbar from '$lib/components/layout/Navbar.svelte';

  import { config as wconfig, modal, getUSDTBalance, tranUsdt } from '$lib/utils/wallet/bnb/index';
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
  let messages = [];
  let history = {
    messages: {},
    currentId: null,
  };
  let firstResAlready = false; // 已经有了第一个响应

  let chatInputPlaceholder = '';

  $: if (history.currentId !== null) {
    let _messages = [];

    let currentMessage = history.messages[history.currentId];
    while (currentMessage !== null) {
      _messages.unshift({ ...currentMessage });
      currentMessage = currentMessage.parentId !== null ? history.messages[currentMessage.parentId] : null;
    }

    // _messages.pop()
    // console.log("messages = _messages;", _messages);

    messages = _messages;
  } else {
    messages = [];
  }

  $: if ($page.params.id) {
    (async () => {
      if (await loadChat()) {
        await tick();
        loaded = true;

        window.setTimeout(() => scrollToBottom(), 0);
        // const chatInput = document.getElementById('chat-textarea');
        // chatInput?.focus();
      } else {
        await goto('/creator');
      }
    })();
  }

  $: if ($chatsearch != '') {
    const resultIds = Object.values(history.messages) // 提取所有对象组成的数组
      .filter((item) => {
        // 注意：content 可能是字符串（user 角色）或数组（assistant 角色），需先判断类型
        const contentStr = typeof item.content === 'string' ? item.content : '';
        return contentStr.includes($chatsearch); // 包含「产品」关键词则保留
      })
      .map((item) => item.id);
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
        selectedModels = $settings?.models;
        history =
          (chatContent?.history ?? undefined) !== undefined
            ? chatContent.history
            : convertMessagesToHistory(chatContent.messages);
        title = chatContent.title;

        let _settings = JSON.parse(localStorage.getItem('settings') ?? '{}');
        await settings.set({
          ..._settings,
          system: chatContent.system ?? _settings.system,
          options: chatContent.options ?? _settings.options,
        });
        autoScroll = true;
        await tick();

        if (messages.length > 0) {
          history.messages[messages.at(-1).id].done = true;
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

    // 校验模型是否支持文件类型
    let currModel = $models.filter((item) => selectedModels.includes(item?.model));
    if (files.length > 0 && (files[0].type == 'image' || (files[0]?.image ?? []).length > 0)) {
      if (currModel[0]?.support == 'text') {
        let imageModels = $models.filter((item) => item?.type == currModel[0]?.type && item?.support == 'image');
        selectedModels = [imageModels[0]?.model];
      }
      fileFlag = true;
    } else {
      // 校验历史记录是否有图片
      let checkMessages = messages.filter((item) => item.role == 'user' && Array.isArray(item.files));
      if (checkMessages.length > 0) {
        if (currModel[0]?.support == 'text') {
          let imageModels = $models.filter((item) => item?.type == currModel[0]?.type && item?.support == 'image');
          selectedModels = [imageModels[0]?.model];
        }
        fileFlag = true;
      } else {
        fileFlag = false;
      }
    }

    firstResAlready = false; // 开始新对话的时候，也要还原firstResAlready为初始状态false
    await tick();

    if (selectedModels.includes('')) {
      toast.error($i18n.t('Model not selected'));
    } else if (messages.length != 0 && messages.at(-1).done != true) {
      // 响应未完成
      console.log('wait');
    } else if (files.length > 0 && files.filter((file) => file.upload_status === false).length > 0) {
      // 上传未完成
      toast.error(
        `Oops! Hold tight! Your files are still in the processing oven. We're cooking them up to perfection. Please be patient and we'll let you know once they're ready.`
      );
    } else {
      // 重置聊天消息文本区高度
      document.getElementById('chat-textarea').style.height = '';

      // 创建用户消息
      let userMessageId = uuidv4();
      let userMessage = {
        id: userMessageId,
        parentId: messages.length !== 0 ? messages.at(-1).id : null,
        childrenIds: [],
        role: 'user',
        user: _user ?? undefined,
        content: userPrompt,
        files: files.length > 0 ? files : undefined,
        toolInfo: videoInfo,
        timestamp: Math.floor(Date.now() / 1000), // Unix epoch
        models: selectedModels,
      };

      // 将消息添加到历史记录并设置 currentId 为 messageId
      history.messages[userMessageId] = userMessage;
      history.currentId = userMessageId;

      // 将 messageId 附加到父消息的 childrenIds 中
      if (messages.length !== 0) {
        history.messages[messages.at(-1).id].childrenIds.push(userMessageId);
      }

      // Create Simulate ResopnseMessage
      let responseMap: any = {};
      selectedModels.map(async (modelId) => {
        const model = $models.filter((m) => m.id === modelId).at(0);
        if (model) {
          // Create response message
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

          // Add message to history and Set currentId to messageId
          history.messages[responseMessageId] = responseMessage;
          history.currentId = responseMessageId;

          // Append messageId to childrenIds of parent message
          if (userMessageId !== null) {
            history.messages[userMessageId].childrenIds = [
              ...history.messages[userMessageId].childrenIds,
              responseMessageId,
            ];
          }
          responseMap[model?.id] = responseMessage;
        }
      });

      // 重置聊天输入文本区
      prompt = '';
      files = [];

      await tick();
      scrollToBottom();

      try {
        // 如果 messages 中只有一条消息，则创建新的聊天
        if (messages.length == 2) {
          if ($settings.saveChatHistory ?? true) {
            // 3\1. 创建新的会话
            chat = await createNewChat(localStorage.token, {
              id: $chatId,
              title: $i18n.t('New Chat'),
              models: selectedModels,
              system: $settings.system ?? undefined,
              options: {
                ...($settings.options ?? {}),
              },
              messages: messages,
              history: history,
              timestamp: Date.now(),
            });
            await chats.set(await getChatList(localStorage.token));
            await chatId.set(chat.id);
          } else {
            await chatId.set('local');
          }
          await tick();
        }

        // 更新消息到数据库
        const _chatId = JSON.parse(JSON.stringify($chatId));
        await updateChatMessage(_chatId);

        stopResponse();
      } catch (err) {
        const _chatId = JSON.parse(JSON.stringify($chatId));
        Object.keys(responseMap).map(async (modelId) => {
          const model = $models.filter((m) => m.id === modelId).at(0);
          let responseMessage = responseMap[model?.id];
          await handleOpenAIError(err, null, model, responseMessage);
          history.messages[responseMessageId] = responseMessage;

          // 更新消息到数据库
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

    try {
      let paymoney = messageinfo?.paymoney.toString();

      // --- 1. 预检查：先问后端这笔订单是不是已经付过了 ---
      let body = {
        hash: '',
        address: account?.address,
        messageid: messageinfo?.id,
        model: messageinfo?.model,
        size: messageinfo?.size,
        duration: messageinfo?.duration,
        amount: paymoney,
      };

      const preCheckResponse = await bnbpaycheck(localStorage.token, body);
      console.log('==============Pre-check result=============', preCheckResponse);

      if (preCheckResponse?.ok) {
        // 如果后端说已经付过了，直接成功
        $paystatus = false;
        await updatePayStatus(messageinfo, true, 'paying');

        let currResponseMap: any = {};
        currResponseMap[messageinfo?.model] = messageinfo;
        let currmessage = messages.filter((item) => item.id == messageinfo?.parentId);
        if (currmessage.length > 0) {
          await sendPrompt(currmessage[0].content, currResponseMap);
        }
        return;
      }

      // --- 2. 余额检查 (Gas费 和 USDT) ---

      // 2.1 检查 BNB (Gas费) - 关键修复
      // 如果没有 BNB，无法发起 USDT 转账，钱包会报错
      const bnbBalanceObj = await getBalance(wconfig, { address: account.address });
      if (bnbBalanceObj.value === 0n) {
        toast.error('BNB 余额不足，无法支付 Gas 费');
        $paystatus = false;
        return;
      }

      // 2.2 检查 USDT 余额
      const usdtBalance = await getUSDTBalance(account?.address);
      if (Number(paymoney) > Number(usdtBalance)) {
        $paystatus = false;
        toast.error($i18n.t('Insufficient USDT Balance'));
        return;
      }

      // --- 3. 发起支付 ---
      await updatePayStatus(messageinfo, false, 'paying');

      const txResponse = await tranUsdt(paymoney, messageinfo.id);

      if (txResponse && txResponse.hash) {
        // --- 4. 轮询验证 (关键修复：不再立即判死刑) ---
        console.log('Tx Hash:', txResponse.hash);
        toast.info('支付请求已发送，正在链上确认...');

        let retryCount = 0;
        const maxRetries = 5; // 最多重试 5 次

        // 定义轮询函数
        const checkLoop = async () => {
          let checkBody = {
            hash: txResponse.hash,
            address: account?.address,
            messageid: messageinfo?.id,
            model: messageinfo?.model,
            size: messageinfo?.size,
            duration: messageinfo?.duration,
            amount: paymoney,
          };

          const response = await bnbpaycheck(localStorage.token, checkBody);

          if (response?.ok) {
            // 验证成功！
            $paystatus = false;
            await updatePayStatus(messageinfo, true, 'paying');
            toast.success($i18n.t('Pay Success'));

            let currResponseMap: any = {};
            currResponseMap[messageinfo?.model] = messageinfo;
            let currmessage = messages.filter((item) => item.id == messageinfo?.parentId);
            if (currmessage.length > 0) {
              await sendPrompt(currmessage[0].content, currResponseMap);
            }
          } else {
            // 验证失败，准备重试
            retryCount++;
            if (retryCount < maxRetries) {
              console.log(`链上确认中... 第 ${retryCount} 次重试`);
              setTimeout(checkLoop, 3000); // 3秒后再次执行 checkLoop
            } else {
              // 超过重试次数，提示用户稍后查看
              toast.warning('支付已上链，后端同步稍有延迟，请稍后刷新页面查看');
              $paystatus = false;
              // 这里我们不再把状态改为 unpaid，防止用户以为没付钱又去付一次
            }
          }
        };

        // 延迟 2 秒后开始第一次检查
        setTimeout(checkLoop, 2000);
      } else {
        // txResponse 为空，通常意味着没拿到 Hash
        throw new Error('Transaction failed (No Hash)');
      }
    } catch (e: any) {
      console.error(e);
      $paystatus = false;
      await updatePayStatus(messageinfo, false, 'unpaid');

      // 智能区分错误类型
      if (e?.code === 4001 || (e?.message && e.message.includes('User rejected'))) {
        toast.info('用户取消支付');
      } else {
        toast.error($i18n.t('Pay Failed') + (e.message ? `: ${e.message}` : ''));
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
    history.messages[responseMessageId] = messageinfo;
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
            history.messages[responseMessageId] = responseMessage;
            history.currentId = responseMessageId;

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
    if (messages.length == 2) {
      window.history.replaceState(history.state, '', `/creator/c/${_chatId}`);
      const _title = await generateDeChatTitle(prompt);
      await setChatTitle(_chatId, _title);
    } else {
      await chats.set(await getChatList(localStorage.token));
    }
  };

  // 对话DeGpt
  const sendPromptDeOpenAI = async (model, responseMessageId, _chatId, reload) => {
    const responseMessage = history.messages[responseMessageId];

    scrollToBottom();

    // console.log("$settings.system", $settings.system, );

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
        ...messages,
      ].filter((message) => message);

      // 过滤掉error和 content为空数据
      send_message = send_message.filter((item) => !item.error).filter((item) => item.content != '');

      // 处理图片消息
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

      const [res, controller] = await getDeOpenAIChatCompletion(localStorage.token, {
        source: model.source,
        permodel: model.id,
        model: fileFlag ? model.imagemodel : model.textmodel,
        duration: responseMessage.duration,
        messageid: responseMessageId,
        messages: send_message,
        size: responseMessage.size,
      });

      // Wait until history/message have been updated
      await tick();

      scrollToBottom();

      // 6. 创建openai对话数据流
      if (res && res.ok && res.body) {
        // cancle reload fun
        if (reload) {
          responseMessage.reload = false;
        }
        const textStream = await createOpenAITextStream(res.body, true);
        for await (const update of textStream) {
          let { value, limit, createId, status, paystatus, paymoney, done, error } = update;
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
          messages = messages;

          if (error) {
            await handleOpenAIError(error, null, model, responseMessage);
            break;
          }
          // 第一次响应的时候，把当前的id设置为当前响应的id
          if (value && !firstResAlready) {
            firstResAlready = true;
            history.currentId = responseMessageId;
          }

          if (done || stopResponseFlag || _chatId !== $chatId) {
            responseMessage.done = true;
            messages = messages;
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
            history.currentId = responseMessageId;
            await tick();
          }

          if (responseMessage.content == '' && value == '') {
            continue;
          } else {
            responseMessage.content = value;
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
    if (messageinfo.createId) {
      scrollToBottom();

      let responseMessageId = messageinfo?.id;
      messageinfo.done = false;
      messageinfo.error = false;
      messageinfo.status = 'processing';
      history.messages[responseMessageId] = messageinfo;

      const responseMessage = history.messages[responseMessageId];

      try {
        const [res, controller] = await getDeOpenAIChatResult(localStorage.token, { requestId: messageinfo.createId });

        await tick();
        scrollToBottom();

        if (res && res.ok && res.body) {
          const textStream = await createOpenAITextStream(res.body, true);
          for await (const update of textStream) {
            let { value, status, done, error } = update;
            if (status) {
              responseMessage.status = status;
            }
            messages = messages;

            if (error) {
              await handleOpenAIError(error, null, null, responseMessage);
              break;
            }

            if (done || stopResponseFlag || _chatId !== $chatId) {
              responseMessage.done = true;
              messages = messages;
              if (stopResponseFlag) {
                controller.abort('User: Stop Response');
              }
              break;
            }

            if (responseMessage.content == '' && value == '') {
              continue;
            } else {
              responseMessage.content = value;
            }

            if (autoScroll) {
              scrollToBottom();
            }
          }
        }
      } catch (error) {
        await handleOpenAIError(error, null, null, responseMessage);
      }

      // 更新消息到数据库
      await updateChatMessage($chatId);

      await tick();

      if (autoScroll) {
        scrollToBottom();
      }
    } else {
      let currResponseMap: any = {};
      currResponseMap[messageinfo?.model] = messageinfo;
      let currmessage = messages.filter((item) => item.id == messageinfo?.parentId);
      await sendPrompt(currmessage[0].content, currResponseMap);
    }
  };

  // 更新消息到数据库
  const updateChatMessage = async (_chatId: string) => {
    messages = messages;

    stopResponseFlag = false;

    // 更新聊天记录
    if (_chatId === $chatId) {
      if ($settings.saveChatHistory ?? true) {
        await updateChatById(localStorage.token, _chatId, {
          messages: messages,
          history: history,
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
    messages = messages;
  };

  const stopResponse = () => {
    stopResponseFlag = true;
    console.log('stopResponse');
  };

  const regenerateResponse = async (message) => {
    console.log('regenerateResponse');

    if (messages.length != 0) {
      let userMessage = history.messages[message.parentId];
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

    if (messages.length != 0 && messages.at(-1).done == true) {
      const responseMessage = history.messages[history.currentId];
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
      shareEnabled={messages.length > 0}
      initNewChat={async () => {
        if (currentRequestId !== null) {
          await cancelOllamaRequest(localStorage.token, currentRequestId);
          currentRequestId = null;
        }
        prompt = '';
        goto('/creator');
      }}
    />
    <div class="flex flex-col flex-auto">
      <div
        class=" pb-2.5 flex flex-col justify-between w-full flex-auto overflow-auto h-0 max-w-full"
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
            bind:history
            bind:messages
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
  </div>

  <MessageInput
    bind:files
    bind:prompt
    bind:autoScroll
    bind:chatInputPlaceholder
    bind:selectedModel={atSelectedModel}
    bind:currentModel={selectedModels}
    {messages}
    {submitPrompt}
    {stopResponse}
  />
{/if}
