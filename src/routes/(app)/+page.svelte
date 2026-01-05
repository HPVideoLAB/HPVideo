<script lang="ts">
  import { toast } from 'svelte-sonner';
  import { v4 as uuidv4 } from 'uuid';
  import { page } from '$app/stores';
  import { onMount, getContext, tick } from 'svelte';
  import ImgToVideo from '$lib/components/chat/MessageInput-modules/ImgToVideo.svelte';

  import {
    WEBUI_NAME,
    tags as _tags,
    chatId,
    chats,
    config,
    modelfiles,
    models,
    pageUpdateNumber,
    settings,
    showSidebar,
    user,
    switchModel,
    theme,
    paystatus,
    urlprompt,
    chatsearch,
    // 👇 引用 Store
    messages,
    history,
  } from '$lib/stores';

  import { createNewChat, getChatList, updateChatById } from '$lib/apis/chats';

  import { getDeOpenAIChatCompletion, getDeOpenAIChatResult, generateDeTitle } from '$lib/apis/de';
  import { DEGPT_TOKEN } from '$lib/constants';

  import { queryMemory } from '$lib/apis/memories';
  import { createOpenAITextStream } from '$lib/apis/streaming';
  import MessageInput from '$lib/components/chat/MessageInput.svelte';
  import Messages from '$lib/components/chat/Messages.svelte';
  import Navbar from '$lib/components/layout/Navbar.svelte';

  import { config as wconfig, modal, getUSDTBalance, tranUsdt } from '$lib/utils/wallet/bnb/index';
  import { getAccount } from '@wagmi/core';
  import { bnbpaycheck } from '$lib/apis/pay';

  const i18n: any = getContext('i18n');

  let stopResponseFlag = false;
  let autoScroll = true;
  let processing = '';
  let messagesContainerElement: HTMLDivElement;
  let currentRequestId: any = null;

  let showModelSelector = true;

  let selectedModels = [''];
  let atSelectedModel = '';

  let selectedModelfile = null;
  $: selectedModelfile =
    selectedModels.length === 1 &&
    $modelfiles.filter((modelfile: any) => modelfile.tagName === selectedModels[0]).length > 0
      ? $modelfiles.filter((modelfile: any) => modelfile.tagName === selectedModels[0])[0]
      : null;

  let selectedModelfiles = {};
  $: selectedModelfiles = selectedModels.reduce((a, tagName, i, arr) => {
    const modelfile = $modelfiles.filter((modelfile: any) => modelfile.tagName === tagName)?.at(0) ?? undefined;

    return {
      ...a,
      ...(modelfile && { [tagName]: modelfile }),
    };
  }, {});

  let chat: any = null;
  let title = '';
  let prompt = '';
  let files: any[] = [];
  let fileFlag = false;

  let chatInputPlaceholder = '';

  // 触发当前组件初始化
  $: $pageUpdateNumber, initNewChat();
  let firstResAlready = false; // 已经有了第一个响应

  // 👇 使用 $history 监听
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

  // 👇 使用 $history 监听
  $: if ($chatsearch != '') {
    const resultIds = Object.values($history.messages)
      .filter((item: any) => {
        const contentStr = typeof item.content === 'string' ? item.content : '';
        return contentStr.includes($chatsearch);
      })
      .map((item: any) => item.id);
    console.log('============resultIds========', resultIds);
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

  // assign urlprompt
  const assignUrlPrpmpt = async () => {
    if ($urlprompt) {
      prompt = $urlprompt;
      await urlprompt.set('');
    }
  };

  onMount(async () => {
    await initNewChat();
    await assignUrlPrpmpt();

    // 触发直接发送消息
    if ($switchModel.status) {
      prompt = $switchModel.content;
      await submitPrompt(prompt, null, $user);
    }
  });

  //////////////////////////
  // Web functions
  //////////////////////////
  const initNewChat = async () => {
    if (currentRequestId !== null) {
      currentRequestId = null;
    }
    // ⚠️ 修正：这里必须是 window.history，不能带 $
    window.history.replaceState(window.history.state, '', `/creator`);
    await chatId.set('');

    autoScroll = true;

    title = '';
    prompt = '';

    // ⚠️ 修正：赋值给 Store 必须加 $
    $messages = [];
    $history = {
      messages: {},
      currentId: null,
    };

    if ($page.url.searchParams.get('models')) {
      selectedModels = $page.url.searchParams.get('models')?.split(',');
    } else if ($settings?.models) {
      selectedModels = $settings?.models;
    } else if ($config?.default_models) {
      selectedModels = $config?.default_models.split(',');
    } else {
      selectedModels = [''];
    }

    if ($page.url.searchParams.get('q')) {
      prompt = $page.url.searchParams.get('q') ?? '';
      if (prompt) {
        await tick();
        submitPrompt(prompt);
      }
    }

    selectedModels = selectedModels.map((modelId) => ($models.map((m) => m.id).includes(modelId) ? modelId : ''));

    let _settings = JSON.parse(localStorage.getItem('settings') ?? '{}');
    settings.set({
      ..._settings,
    });
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
  const submitPrompt = async (userPrompt: string, videoInfo: any, _user = null) => {
    console.log('submitPrompt', $chatId, userPrompt);

    selectedModels = selectedModels.map((modelId) => ($models.map((m) => m.id).includes(modelId) ? modelId : ''));

    if (selectedModels.length < 1) {
      toast.error($i18n.t('Model not selected'));
    }
    // ⚠️ messages -> $messages
    else if ($messages.length != 0 && $messages.at(-1).done != true) {
      console.log('wait');
    } else if (files.length > 0 && files.filter((file) => file.upload_status === false).length > 0) {
      toast.error(
        $i18n.t(
          `Oops! Hold tight! Your files are still in the processing oven. We're cooking them up to perfection. Please be patient and we'll let you know once they're ready.`
        )
      );
    } else {
      document.getElementById('chat-textarea').style.height = '';

      // Create user message
      let userMessageId = uuidv4();
      let userMessage = {
        id: userMessageId,
        // ⚠️ messages -> $messages
        parentId: $messages.length !== 0 ? $messages.at(-1).id : null,
        childrenIds: [],
        role: 'user',
        user: _user ?? undefined,
        imageinfo: '',
        content: userPrompt,
        files: files.length > 0 ? files : undefined,
        toolInfo: videoInfo,
        models: selectedModels.filter((m, mIdx) => selectedModels.indexOf(m) === mIdx),
        timestamp: Math.floor(Date.now() / 1000),
      };

      // ⚠️ history -> $history
      $history.messages[userMessageId] = userMessage;
      $history.currentId = userMessageId;

      // ⚠️ messages -> $messages
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
            timestamp: Math.floor(Date.now() / 1000),
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
        // ⚠️ messages -> $messages
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
              // ⚠️ 传参给 API 时使用 Store
              messages: $messages,
              history: $history,
              tags: [],
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
        // ⚠️ messages -> $messages
        if ($messages.length == 2) {
          // ⚠️ 修正：window.history 不能带 $
          window.history.replaceState(window.history.state, '', `/creator/c/${_chatId}`);
          const _title = await generateDeChatTitle(userPrompt);
          await setChatTitle(_chatId, _title);
        }

        Object.keys(responseMap).map(async (modelId) => {
          await updateChatMessage(_chatId);
        });

        stopResponse();
      } catch (err) {
        const _chatId = JSON.parse(JSON.stringify($chatId));
        Object.keys(responseMap).map(async (modelId) => {
          const model = $models.filter((m) => m.id === modelId).at(0);
          let responseMessage = responseMap[model?.id];
          await handleOpenAIError(err, null, model, responseMessage);

          $history.messages[responseMessage.id] = responseMessage;
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
    // if ($theme === 'system' || $theme === 'light') {
    //   modal.setThemeMode('light');
    // } else {
    //   modal.setThemeMode('dark');
    // }
    modal.setThemeMode('dark');
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

      let currResponseMap: any = {};
      currResponseMap[messageinfo?.model] = messageinfo;
      let currmessage = $messages.filter((item: any) => item.id == messageinfo?.parentId);
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

            let currResponseMap: any = {};
            currResponseMap[messageinfo?.model] = messageinfo;
            let currmessage = $messages.filter((item: any) => item.id == messageinfo?.parentId);
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

  const updatePayStatus = async (messageinfo: any, paystatus: boolean, payval: string) => {
    let responseMessageId = messageinfo?.id;
    messageinfo.paystatus = paystatus;
    messageinfo.paytype = payval;
    messageinfo.status = payval;
    messageinfo.content = payval;
    $history.messages[responseMessageId] = messageinfo;
    await updateChatMessage($chatId);
  };

  const sendPrompt = async (prompt: string, responseMap: any = null, modelId = null, reload = false) => {
    const _chatId = JSON.parse(JSON.stringify($chatId));
    await Promise.all(
      (modelId ? [modelId] : atSelectedModel !== '' ? [atSelectedModel.id] : Object.keys(responseMap)).map(
        async (modelId) => {
          const model = $models.filter((m) => m.id === modelId).at(0);
          if (model) {
            let responseMessage = responseMap[model?.id];
            let responseMessageId = responseMessage?.id;

            responseMessage.content = '';
            responseMessage.done = false;
            responseMessage.error = false;
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
                }
              }
            }
            responseMessage.userContext = userContext;
            stopResponseFlag = false;
            await sendPromptDeOpenAI(model, responseMessageId, _chatId, reload);
          } else {
            console.error($i18n.t(`Model {{modelId}} not found`, {}));
          }
        }
      )
    );

    firstResAlready = false;
  };

  const checkImage = () => {
    const userMsgsa = $messages.filter((item: any) => item.role === 'user');
    const lastUserMsg = userMsgsa.length > 0 ? userMsgsa[userMsgsa.length - 1] : null;
    if (lastUserMsg && Array.isArray(lastUserMsg.files)) {
      return true;
    } else {
      return false;
    }
  };

  // 对话DeGpt
  const sendPromptDeOpenAI = async (model, responseMessageId, _chatId, reload) => {
    console.log('🔍 [Parent Debug] 进入 sendPromptDeOpenAI'); // 埋点 1
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
                  .filter((file) => file.type === 'image' || file.type === 'doc')
                  .map((file) =>
                    file.type === 'image'
                      ? {
                          type: 'image_url',
                          image_url: {
                            url: file.url,
                          },
                        }
                      : {
                          type: 'file',
                          file: {
                            filename: file.name,
                            file_data: file.url,
                          },
                        }
                  ),
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

      if (res && res.ok && res.body) {
        if (reload) {
          responseMessage.reload = false;
        }
        const textStream = await createOpenAITextStream(res.body, true);

        for await (const update of textStream) {
          let { value, limit, createId, status, paystatus, paymoney, done, error } = update;

          // 埋点 2: 打印流数据
          console.log('🔍 [Parent Debug] Stream Update:', { value, status, done, isArray: Array.isArray(value) });

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

          // 这里我们不需要手动更新 messages，因为后面我们会更新 history
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

            // ✨✨✨【关键点 1】任务完成时，强制刷新源头 history ✨✨✨
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
            console.log('🔍 [Parent Debug] 检测到数组，正在转换:', value);
            value = value[0];
          }

          // 2. 赋值保护 + 强制刷新
          if (value && value.length > 0) {
            responseMessage.content = value;

            // ✨✨✨【关键点 2】收到有效数据时，强制刷新源头 history ✨✨✨
            // 这会触发顶部的 $: 自动重新生成 $messages，界面就会更新了！
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
      console.error('🔍 [Parent Debug Error]', error);
      await handleOpenAIError(error, null, model, responseMessage);
    }

    await updateChatMessage(_chatId);
    await tick();
    if (autoScroll) {
      scrollToBottom();
    }
  };

  const refreshVideoResult = async (messageinfo: any, _chatId: string) => {
    console.log('🔍 [Parent Debug] 进入 refreshVideoResult', messageinfo.createId);

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

            // 埋点 2: 打印刷新流数据
            console.log('🔍 [Parent Debug Refresh Stream]:', { value, status, done, isArray: Array.isArray(value) });

            if (status) {
              responseMessage.status = status;
            }

            // 这里不需要更新 messages，下面会更新 history
            // $messages = $messages;

            if (error) {
              await handleOpenAIError(error, null, null, responseMessage);
              break;
            }

            if (done || stopResponseFlag || _chatId !== $chatId) {
              responseMessage.done = true;

              // ✨✨✨【关键点 1】任务完成时，强制刷新 history ✨✨✨
              $history = $history;

              if (stopResponseFlag) {
                controller.abort('User: Stop Response');
              }
              break;
            }

            // 1. 数组清洗
            if (Array.isArray(value) && value.length > 0) {
              console.log('🔍 [Parent Debug] Refresh 检测到数组，正在转换:', value);
              value = value[0];
            }

            // 2. 赋值保护 + 强制刷新
            if (value && value.length > 0) {
              responseMessage.content = value;

              // ✨✨✨【关键点 2】收到有效数据时，强制刷新 history ✨✨✨
              $history = $history;
            }

            if (autoScroll) {
              scrollToBottom();
            }
          }
        }
      } catch (error) {
        console.error('🔍 [Parent Debug Refresh Error]', error);
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

  const updateChatMessage = async (_chatId: string) => {
    // ⚠️ 修正：使用 $messages
    $messages = $messages;
    stopResponseFlag = false;

    if (_chatId === $chatId) {
      if ($settings.saveChatHistory ?? true) {
        await updateChatById(localStorage.token, _chatId, {
          messages: $messages,
          history: $history,
        });
      }
    }
  };

  const handleOpenAIError = async (error: any, res: Response | null, model: any, responseMessage: any) => {
    responseMessage.error = true;
    responseMessage.errmsg = 'It seems that you are offline. Please reconnect to send messages.';
    responseMessage.done = true;
    // ⚠️ 修正：使用 $messages
    $messages = $messages;
  };

  const stopResponse = () => {
    stopResponseFlag = true;
    console.log('stopResponse');
  };

  const regenerateResponse = async (message: any) => {
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
        await sendPromptDeOpenAI(model, responseMessage.id, _chatId, false);
      }
    } else {
      console.error($i18n.t(`Model {{modelId}} not found`, {}));
    }
  };

  const generateDeChatTitle = async (userPrompt: string) => {
    if ($settings?.title?.auto ?? true) {
      const model = $models.find((model) => model.id === selectedModels[0]);

      const titleModelId =
        model?.external ?? false
          ? $settings?.title?.modelExternal ?? selectedModels[0]
          : $settings?.title?.model ?? selectedModels[0];

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

  const setChatTitle = async (_chatId: string, _title: string) => {
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

  const allowModel = ['pika-v2.2-pikaframes', 'sam3-video', 'wan-2.1-v2v'];

  const getTags = async () => {
    return await getTagsById(localStorage.token, $chatId).catch(async (error) => {
      return [];
    });
  };

  // 👇👇👇 新增这一行：专门用来监听第一个模型的变化，强制触发 UI 更新
  $: currentModelId = selectedModels.length > 0 ? selectedModels[0] : '';
</script>

<svelte:head>
  <title>
    {title ? `${title.length > 30 ? `${title.slice(0, 30)}...` : title} | ${$WEBUI_NAME}` : `${$WEBUI_NAME}`}
  </title>
</svelte:head>

<div
  class="min-h-screen max-h-screen {$showSidebar ? 'md:max-w-[calc(100%-310px)]' : ''} w-full max-w-full flex flex-col"
>
  <Navbar {title} bind:selectedModels bind:showModelSelector shareEnabled={$messages.length > 0} {chat} {initNewChat} />

  {#if currentModelId && allowModel.includes(currentModelId)}
    <div class="flex flex-col items-stretch justify-between h-[calc(100vh-85px)] overflow-y-auto">
      <div class="flex flex-col flex-auto">
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
          <div class=" h-full w-full flex flex-col pt-2 pb-4">
            <Messages
              key={$chatId}
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
              suggestionPrompts={selectedModelfile?.suggestionPrompts ?? $config?.default_prompt_suggestions}
              {sendPrompt}
              {startPay}
              {refreshVideoResult}
              {continueGeneration}
              {regenerateResponse}
            />
          </div>
        </div>
      </div>

      <div class=" bg-white dark:bg-gray-900">
        <ImgToVideo />
      </div>
    </div>
  {:else}
    <div class="flex flex-col flex-auto">
      <div
        class=" pb-2.5 flex flex-col justify-between w-full flex-auto overflow-auto md:h-0 max-w-full"
        id="messages-container"
        bind:this={messagesContainerElement}
        on:scroll={(e) => {
          autoScroll =
            messagesContainerElement.scrollHeight - messagesContainerElement.scrollTop <=
            messagesContainerElement.clientHeight + 45;
        }}
      >
        <div class=" h-full w-full flex flex-col pt-2 pb-4">
          <Messages
            key={$chatId}
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
            suggestionPrompts={selectedModelfile?.suggestionPrompts ?? $config?.default_prompt_suggestions}
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

{#if !allowModel.includes(selectedModels[0])}
  <MessageInput
    bind:files
    bind:prompt
    bind:autoScroll
    bind:selectedModel={atSelectedModel}
    bind:currentModel={selectedModels}
    messages={$messages}
    {submitPrompt}
    {stopResponse}
  />
{/if}
