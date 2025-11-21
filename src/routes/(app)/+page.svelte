<script lang="ts">
  import { toast } from "svelte-sonner";
  import { v4 as uuidv4 } from "uuid";
  import { page } from "$app/stores";
  import { onMount, getContext, tick } from "svelte";

  import {
    WEBUI_NAME,
    tags as _tags,
    chatId,
    chats,
    config,
    inviterId,
    channel,
    modelfiles,
    models,
    pageUpdateNumber,
    settings,
    showSidebar,
    user,
    switchModel
  } from "$lib/stores";

  import {
    createNewChat,
    getChatList,
    updateChatById
  } from "$lib/apis/chats";

  import {
    getDeOpenAIChatCompletion,
    getDeOpenAIChatResult,
    generateDeTitle
  } from "$lib/apis/de";
  import { DEGPT_TOKEN } from "$lib/constants"

  import { queryMemory } from "$lib/apis/memories";
  import { createOpenAITextStream } from "$lib/apis/streaming";
  import MessageInput from "$lib/components/chat/MessageInput.svelte";
  import Messages from "$lib/components/chat/Messages.svelte";
  import Navbar from "$lib/components/layout/Navbar.svelte";

  let inviter: any = "";
  let channelName: any = "";

  const i18n = getContext("i18n");

  let stopResponseFlag = false;
  let autoScroll = true;
  let processing = "";
  let messagesContainerElement: HTMLDivElement;
  let currentRequestId: any = null;

  let showModelSelector = true;

  let selectedModels = [""];
  let atSelectedModel = "";

  let selectedModelfile = null;
  $: selectedModelfile =
    selectedModels.length === 1 &&
    $modelfiles.filter((modelfile) => modelfile.tagName === selectedModels[0])
      .length > 0
      ? $modelfiles.filter(
          (modelfile) => modelfile.tagName === selectedModels[0]
        )[0]
      : null;

  let selectedModelfiles = {};
  $: selectedModelfiles = selectedModels.reduce((a, tagName, i, arr) => {
    const modelfile =
      $modelfiles.filter((modelfile) => modelfile.tagName === tagName)?.at(0) ??
      undefined;

    return {
      ...a,
      ...(modelfile && { [tagName]: modelfile }),
    };
  }, {});

  let chat: any = null;
  let title = "";
  let prompt = "";
  let files: any[] = [];
  let fileFlag = false;
  let messages: any[] = [];
  let history = {
    messages: {},
    currentId: null,
  };

  let videodura = 8;
  let videosize = "1280*720";

  let chatInputPlaceholder = "";

  // 触发当前组件初始化
  $: $pageUpdateNumber, initNewChat();
  let firstResAlready = false; // 已经有了第一个响应

  $: if (history.currentId !== null) {
    let _messages = [];

    let currentMessage = history.messages[history.currentId];

    while (currentMessage !== null) {
      _messages.unshift({ ...currentMessage }); // _messages开头添加元素
      currentMessage = currentMessage.parentId !== null ? history.messages[currentMessage.parentId] : null;
    }

    // console.log("_messages", _messages);

    messages = _messages;
  } else {
    messages = [];
  }

  onMount(async () => {
    const queryParams = new URLSearchParams($page.url.search);
    inviter = queryParams.get("inviter");
    channelName = queryParams.get("channel");
    if (inviter) {
      $inviterId = inviter;
    }
    if (channelName) {
      await channel.set(channelName);
    }

    await initNewChat();

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
    window.history.replaceState(history.state, "", `/creator`);
    await chatId.set("");

    autoScroll = true;

    title = "";
    prompt = "";
    messages = [];
    history = {
      messages: {},
      currentId: null,
    };

    if ($page.url.searchParams.get("models")) {
      selectedModels = $page.url.searchParams.get("models")?.split(",");
    } else if ($settings?.models) {
      selectedModels = $settings?.models;
    } else if ($config?.default_models) {
      selectedModels = $config?.default_models.split(",");
    } else {
      selectedModels = [""];
    }

    if ($page.url.searchParams.get("q")) {
      prompt = $page.url.searchParams.get("q") ?? "";
      if (prompt) {
        await tick();
        submitPrompt(prompt);
      }
    }

    selectedModels = selectedModels.map((modelId) =>
      $models.map((m) => m.id).includes(modelId) ? modelId : ""
    );

    let _settings = JSON.parse(localStorage.getItem("settings") ?? "{}");
    settings.set({
      ..._settings,
    });

    // const chatInput = document.getElementById("chat-textarea");
    // setTimeout(() => chatInput?.focus(), 0);
  };

  const scrollToBottom = async () => {
    await tick();
    if (messagesContainerElement) {
      messagesContainerElement.scrollTop =
        messagesContainerElement.scrollHeight;
    }
  };

  //////////////////////////
  // Ollama functions
  //////////////////////////
  const submitPrompt = async (userPrompt: string, userToolInfo: any, _user = null) => {
    console.log("submitPrompt", $chatId, userPrompt);

    selectedModels = selectedModels.map((modelId) =>
      $models.map((m) => m.id).includes(modelId) ? modelId : ""
    );
    
    // 校验模型是否支持文件类型
    let currModel = $models.filter(item => selectedModels.includes(item?.model));
    if (files.length > 0 && (files[0].type == "image" || (files[0]?.image??[]).length > 0)) {
      if (currModel[0]?.support == "text") {
        let imageModels = $models.filter(item => item?.type == currModel[0]?.type && item?.support == "image");
        selectedModels = [imageModels[0]?.model];
      }
      fileFlag = true;
    } else {
      // 校验历史记录是否有图片
      let checkMessages = messages.filter(item => item.role == "user" && Array.isArray(item.files));
      if (checkMessages.length > 0) {
        if (currModel[0]?.support == "text") {
          let imageModels = $models.filter(item => item?.type == currModel[0]?.type && item?.support == "image");
          selectedModels = [imageModels[0]?.model];
        }
        fileFlag = true;
      } else{
        fileFlag = false;
      }
    }

    // console.log("selectedModels", selectedModels);
    if (selectedModels.length < 1) {
      toast.error($i18n.t("Model not selected"));
    } else if (messages.length != 0 && messages.at(-1).done != true) {
      // Response not done
      console.log("wait");
    } else if (files.length > 0 && files.filter((file) => file.upload_status === false).length > 0) {
      // Upload not done
      toast.error(
        $i18n.t(
          `Oops! Hold tight! Your files are still in the processing oven. We're cooking them up to perfection. Please be patient and we'll let you know once they're ready.`
        )
      );
    } else {
      // Reset chat message textarea height
      document.getElementById("chat-textarea").style.height = "";

      // Create user message
      let userMessageId = uuidv4();
      let userMessage = {
        id: userMessageId,
        parentId: messages.length !== 0 ? messages.at(-1).id : null,
        childrenIds: [],
        role: "user",
        user: _user ?? undefined,
        imageinfo: "",
        content: userPrompt,
        files: files.length > 0 ? files : undefined,
        toolInfo: userToolInfo, // video param
        models: selectedModels.filter(
          (m, mIdx) => selectedModels.indexOf(m) === mIdx
        ),
        timestamp: Math.floor(Date.now() / 1000), // Unix epoch
      };

      // Add message to history and Set currentId to messageId
      history.messages[userMessageId] = userMessage;
      history.currentId = userMessageId;

      // Append messageId to childrenIds of parent message
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
            role: "assistant",
            status: "processing",
            size: videosize,
            content: "",
            model: model.id,
            userContext: null,
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

      // Reset chat input textarea
      prompt = "";
      files = [];

      await tick()
      scrollToBottom();

      // 代码有调用接口，放到try中可方便捕获异常
      try {
        // Create new chat if only one message in messages
        if (messages.length == 2) {
          if ($settings.saveChatHistory ?? true) {
            chat = await createNewChat(localStorage.token, {
              id: $chatId,
              title: $i18n.t("New Chat"),
              models: selectedModels,
              system: $settings.system ?? undefined,
              options: {
                ...($settings.options ?? {}),
              },
              messages: messages,
              history: history,
              tags: [],
              timestamp: Date.now(),
            });
            await chats.set(await getChatList(localStorage.token));
            await chatId.set(chat.id);
          } else {
            await chatId.set("local");
          }
          await tick();
        }

        // Send prompt
        await sendPrompt(userPrompt, responseMap);

      } catch (err) {
        const _chatId = JSON.parse(JSON.stringify($chatId));
        Object.keys(responseMap).map(async (modelId) => {
          const model = $models.filter((m) => m.id === modelId).at(0);
          let responseMessage = responseMap[model?.id];
          await handleOpenAIError(err, null, model, responseMessage);

          // 更新消息到数据库
          await updateChatMessage(responseMessage, _chatId);

          await tick();
          
          if (autoScroll) {
            scrollToBottom();
          }
        })  
      }  
    }
  };

  const sendPrompt = async (prompt, responseMap = null, modelId = null, reload = false) => {
    const _chatId = JSON.parse(JSON.stringify($chatId));
    await Promise.all(
      (modelId ? [modelId] : atSelectedModel !== '' ? [atSelectedModel.id] : Object.keys(responseMap)).map(
        async (modelId) => {
          const model = $models.filter((m) => m.id === modelId).at(0);
          if (model) {
            // 创建响应消息
            let responseMessage = responseMap[model?.id];
            let responseMessageId = responseMessage?.id;

            let userContext = null;
            if ($settings?.memory ?? false) {
              if (userContext === null) {
                const res = await queryMemory(localStorage.token, prompt).catch(
                  (error) => {
                    toast.error(error);
                    return null;
                  }
                );

                if (res) {
                  if (res.documents[0].length > 0) {
                    userContext = res.documents.reduce((acc, doc, index) => {
                      const createdAtTimestamp =
                        res.metadatas[index][0].created_at;
                      const createdAtDate = new Date(createdAtTimestamp * 1000)
                        .toISOString()
                        .split("T")[0];
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
            await sendPromptDeOpenAI(model, responseMessageId, _chatId, reload);
          } else {
            console.error($i18n.t(`Model {{modelId}} not found`, {}));
          }
      })
    );

    // 所有模型响应结束后，还原firstResAlready为初始状态false
    firstResAlready = false;

    // 加载聊天列表（赋值聊天title）
    if (messages.length == 2) {
      window.history.replaceState(history.state, "", `/creator/c/${_chatId}`);
      const _title = await generateDeChatTitle(prompt);
      await setChatTitle(_chatId, _title);
    } else {
      await chats.set(await getChatList(localStorage.token));
    }

  };

  // AI Video Request
  const sendPromptDeOpenAI = async (model, responseMessageId, _chatId, reload) => {
    const responseMessage = history.messages[responseMessageId];    
    scrollToBottom();
    try {
      let send_message = [
        $settings.system || (responseMessage?.userContext ?? null)
          ? {
              role: "system",
              content: `${$settings?.system ?? ""}${
              responseMessage?.userContext ?? null
                ? `\n\nUser Context:\n${(responseMessage?.userContext ?? []).join("\n")}` : ""}`,
            } : undefined,
            ...messages,
        ].filter((message) => message);

			// Filter out error data and data with empty content
			send_message = send_message.filter(item =>!item.error).filter(item=> item.content != "");

      // Process image file messages
      send_message = send_message.map((message, idx, arr) => ({
        role: message.role,
        ...((message.files?.filter((file) => file.type === "image").length > 0 ?? false) &&
        message.role === "user"
          ? {
              content: [
                {
                  type: "text",
                  text:
                    arr.length - 1 !== idx
                      ? message.content
                      : message?.raContent ?? message.content,
                },
                ...message.files
                  .filter((file) => file.type === "image" || file.type === "doc")
                    .map((file) => (
                      file.type === "image" ?
                      {
                        type: "image_url",
                        image_url: {
                          url: file.url,
                        },
                      } : {
                        type: "file",
                        file: {
                          filename: file.name,
                          file_data: file.url,
                        },
                      }
                    )),
              ],
            }
          : {
            content:
              arr.length - 1 !== idx
                ? message.content
                : message?.raContent ?? message.content,
          }),
      }));

      const [res, controller] = await getDeOpenAIChatCompletion(
        localStorage.token,
        {
          source: model.source,
          permodel: model.id,
          model: fileFlag ? model.imagemodel : model.textmodel,
          duration: videodura,
          messageid: responseMessageId,
          messages: send_message,
          size: videosize
        }
      );

      await tick();

      scrollToBottom();

      if (res && res.ok && res.body) {
        // cancle reload fun
        if (reload) {
          responseMessage.reload = false;
        }
        const textStream = await createOpenAITextStream(res.body, true);

        // let errornum = 0;
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
            responseMessage.createId = createId;
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
              controller.abort("User: Stop Response");
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

          if (responseMessage.content == "" && value == "") {
            continue;
          } else {
            responseMessage.content = value;
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

  const getVideoResult = async (responseMessage: any, _chatId: string) => {  
    scrollToBottom();
    try {
      const [res, controller] = await getDeOpenAIChatResult(
        localStorage.token,
        { requestId: responseMessage.createId}
      );

      // reset responsemessage
      history.messages[responseMessage?.id] = responseMessage;
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
              controller.abort("User: Stop Response");
            }
            break;
          }

          if (responseMessage.content == "" && value == "") {
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
  }

  const resentVideoResult = async (prompt: string, model: string, responseMessage: any, _chatId: string) => {
    if (responseMessage.createId) {
      await getVideoResult(responseMessage, _chatId);
    } else {

    }
  }

  // 更新消息到数据库
  const updateChatMessage = async (_chatId: string) => {
    messages = messages;

    stopResponseFlag = false;
    
    // 更新聊天记录
    if (_chatId === $chatId) {  
      if ($settings.saveChatHistory ?? true) {
        await updateChatById(localStorage.token, _chatId, {
          messages: messages,
          history: history
        });
      }
    }
  }

  const handleOpenAIError = async (
    error: any,
    res: Response | null,
    model: any,
    responseMessage: any
  ) => {
    responseMessage.error = true;
    responseMessage.errmsg = "It seems that you are offline. Please reconnect to send messages.";
    responseMessage.done = true;
    messages = messages;
  };

  const stopResponse = () => {
    stopResponseFlag = true;
    console.log("stopResponse");
  };

  const regenerateResponse = async (message) => {
    console.log("regenerateResponse");

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
    console.log("continueGeneration");
    const _chatId = JSON.parse(JSON.stringify($chatId));

    if (messages.length != 0 && messages.at(-1).done == true) {
      const responseMessage = history.messages[history.currentId];
      responseMessage.done = false;
      await tick();

      const model = $models.filter((m) => m.id === responseMessage.model).at(0);

      if (model) {
        await sendPromptDeOpenAI(model, responseMessage.id, _chatId, false);
      }
    } else {
      console.error($i18n.t(`Model {{modelId}} not found`, {}));
      // toast.error($i18n.t(`Model {{modelId}} not found`, { modelId }));
    }
  };

  const generateDeChatTitle = async (userPrompt) => {
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
          ) + " {{prompt}}",
        titleModelId,
        userPrompt
      );

      return title;
    } else {
      return `${userPrompt}`;
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
</script>

<svelte:head>
  <title>
    {title
      ? `${
          title.length > 30 ? `${title.slice(0, 30)}...` : title
        } | ${$WEBUI_NAME}`
      : `${$WEBUI_NAME}`}
  </title>
</svelte:head>

<div
  class="min-h-screen max-h-screen {$showSidebar
    ? 'md:max-w-[calc(100%-246px)]'
    : ''} w-full max-w-full flex flex-col"
>
  <Navbar
    {title}
    bind:selectedModels
    bind:showModelSelector
    shareEnabled={messages.length > 0}
    {chat}
    {initNewChat}
  />
  <div class="flex flex-col flex-auto">
    <div
      class=" pb-2.5 flex flex-col justify-between w-full flex-auto overflow-auto h-0 max-w-full"
      id="messages-container"
      bind:this={messagesContainerElement}
      on:scroll={(e) => {
        autoScroll =
          messagesContainerElement.scrollHeight -
            messagesContainerElement.scrollTop <=
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
          bind:history
          bind:messages
          bind:autoScroll
          bind:prompt
          bind:chatInputPlaceholder
          bottomPadding={files.length > 0}
          suggestionPrompts={selectedModelfile?.suggestionPrompts ?? $config?.default_prompt_suggestions}
          {sendPrompt}
          {resentVideoResult}
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
  bind:selectedModel={atSelectedModel}
  bind:currentModel = {selectedModels}
  bind:videodura
  bind:videosize
  {messages}
  {submitPrompt}
  {stopResponse}
/>