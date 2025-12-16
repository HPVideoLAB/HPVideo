<script lang="ts">
  import { toast } from 'svelte-sonner';
  import dayjs from 'dayjs';
  import { marked } from 'marked';
  import tippy from 'tippy.js';
  import auto_render from 'katex/dist/contrib/auto-render.mjs';
  import 'katex/dist/katex.min.css';

  import { createEventDispatcher } from 'svelte';
  import { onMount, tick, getContext } from 'svelte';

  const i18n = getContext('i18n');

  const dispatch = createEventDispatcher();

  import { config, settings, models, theme, paystatus } from '$lib/stores';
  import { imageGenerations } from '$lib/apis/images';
  import { approximateToHumanReadable, sanitizeResponseContent } from '$lib/utils';
  import { WEBUI_BASE_URL } from '$lib/constants';

  import Name from './Name.svelte';
  import ProfileImage from './ProfileImage.svelte';
  import VideoGen from './VideoGen.svelte';
  import Image from '$lib/components/common/Image.svelte';
  import Tooltip from '$lib/components/common/Tooltip.svelte';
  import RateComment from './RateComment.svelte';
  import CitationsModal from '$lib/components/chat/Messages/CitationsModal.svelte';
  import VideoLoading from './VideoLoading.svelte';
  import VideoError from './VideoError.svelte';
  import VideoPlay from './VideoPlay.svelte';

  export let modelfiles = [];
  export let message;
  export let siblings;

  export let isLastMessage = true;

  export let readOnly = false;

  // Regain the session
  export let resentMessage: Function;

  export let updateChatMessages: Function;
  export let confirmEditResponseMessage: Function;
  export let showPreviousMessage: Function;
  export let showNextMessage: Function;
  export let rateMessage: Function;
  export let handlePay: Function;

  export let copyToClipboard: Function;
  export let continueGeneration: Function;
  export let regenerateResponse: Function;

  let edit = false;
  let editedContent = '';
  let editTextAreaElement: HTMLTextAreaElement;
  let tooltipInstance: any = null;
  let generatingImage = false;

  let showRateComment = false;
  let showCitationModal = false;

  let selectedCitation: any = null;

  $: tokens = marked.lexer(sanitizeResponseContent('' + message?.content));

  const renderer = new marked.Renderer();

  // For code blocks with simple backticks
  renderer.codespan = (code) => {
    return `<code>${code.replaceAll('&amp;', '&')}</code>`;
  };

  const { extensions, ...defaults } = marked.getDefaults() as marked.MarkedOptions & {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extensions: any;
  };

  $: if (message) {
    renderStyling();
  }

  const renderStyling = async () => {
    await tick();

    if (tooltipInstance) {
      tooltipInstance[0]?.destroy();
    }

    renderLatex();

    if (message.info) {
      tooltipInstance = tippy(`#info-${message.id}`, {
        content: `<span class="text-xs" id="tooltip-${message.id}">response_token/s: ${
          `${
            Math.round(((message.info.eval_count ?? 0) / (message.info.eval_duration / 1000000000)) * 100) / 100
          } tokens` ?? 'N/A'
        }<br/>
					prompt_token/s: ${
            Math.round(
              ((message.info.prompt_eval_count ?? 0) / (message.info.prompt_eval_duration / 1000000000)) * 100
            ) / 100 ?? 'N/A'
          } tokens<br/>
                    total_duration: ${
                      Math.round(((message.info.total_duration ?? 0) / 1000000) * 100) / 100 ?? 'N/A'
                    }ms<br/>
                    load_duration: ${
                      Math.round(((message.info.load_duration ?? 0) / 1000000) * 100) / 100 ?? 'N/A'
                    }ms<br/>
                    prompt_eval_count: ${message.info.prompt_eval_count ?? 'N/A'}<br/>
                    prompt_eval_duration: ${
                      Math.round(((message.info.prompt_eval_duration ?? 0) / 1000000) * 100) / 100 ?? 'N/A'
                    }ms<br/>
                    eval_count: ${message.info.eval_count ?? 'N/A'}<br/>
                    eval_duration: ${
                      Math.round(((message.info.eval_duration ?? 0) / 1000000) * 100) / 100 ?? 'N/A'
                    }ms<br/>
                    approximate_total: ${approximateToHumanReadable(message.info.total_duration)}</span>`,
        allowHTML: true,
      });
    }
  };

  const renderLatex = () => {
    let chatMessageElements = document
      .getElementById(`message-${message.id}`)
      ?.getElementsByClassName('chat-assistant');

    if (chatMessageElements) {
      for (const element of chatMessageElements) {
        auto_render(element, {
          // customised options
          // • auto-render specific keys, e.g.:
          delimiters: [
            { left: '$$', right: '$$', display: false },
            { left: '$ ', right: ' $', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: false },
            { left: '[ ', right: ' ]', display: false },
          ],
          // • rendering keys, e.g.:
          throwOnError: false,
        });
      }
    }
  };

  const resentMessageHandler = async () => {
    await resentMessage(message);
  };

  const editMessageConfirmHandler = async () => {
    if (editedContent === '') {
      editedContent = ' ';
    }

    confirmEditResponseMessage(message.id, editedContent);

    edit = false;
    editedContent = '';

    await tick();
    renderStyling();
  };

  const cancelEditMessage = async () => {
    edit = false;
    editedContent = '';
    await tick();
    renderStyling();
  };

  const generateImage = async (message) => {
    generatingImage = true;
    const res = await imageGenerations(localStorage.token, message.content).catch((error) => {
      toast.error(error);
    });
    console.log(res);

    if (res) {
      message.files = res.map((image) => ({
        type: 'image',
        url: `${image.url}`,
      }));

      dispatch('save', message);
    }

    generatingImage = false;
  };

  // 格式化模型名字
  const formatModelName = (model) => {
    // console.log("models", $models);
    const modelName = $models.filter((item) => item.model === model)?.[0]?.name || model;

    return modelName;
  };

  // 校验图片模型
  const checkModelImage = (model) => {
    // console.log("models", $models);
    const checkModel = $models.filter((item) => item?.model === model);
    if (checkModel.length > 0 && checkModel[0]?.support === 'image') {
      return true;
    } else {
      return false;
    }
  };

  // 监听主题变化
  let currentTheme = $theme;
  $: {
    currentTheme = $theme === 'system' || $theme === 'light' ? 'light' : 'dark';
  }

  let reqeuestErr = 'Video Generation Failed';
  let internetErr = 'It seems that you are offline, Please check your network and try generating again';

  onMount(async () => {
    await tick();
    renderStyling();
  });

  // ⚠️ 慎用：Svelte 会尽量优化避免死循环，但逻辑依然很怪
  // $: if (message && message.paymoney !== 0.0001) {
  //   message.paymoney = 0.0001; // 只在不相等时修改，防止死循环
  //   console.log('已强制修正 paymoney 为 0.0001');
  // }
</script>

<CitationsModal bind:show={showCitationModal} citation={selectedCitation} />
{#key message.id}
  <div class=" flex w-full message-{message.id}" id="message-{message.id}" dir={$settings.chatDirection}>
    <ProfileImage
      src={modelfiles[message.model]?.imageUrl ?? ($i18n.language === 'dg-DG' ? `/doge.png` : `/favicon.png`)}
    />

    <div class="w-full overflow-hidden pl-1">
      <!-- {console.log("modelfiles", modelfiles, message)} -->
      <Name>
        {#if message.model in modelfiles}
          {modelfiles[message.model]?.title}
        {:else}
          {message.model ? ` ${formatModelName(message.model)}` : ''}
        {/if}
        {#if message.content == '' && !message?.done}
          <VideoGen />
        {:else}
          <!-- {#if message?.replytime && checkModelImage(message.model)}
						<span class="text-xs">{ $i18n.t("Last for {{ time }} seconds", {time:(message?.replytime - message?.timestamp) % 60}) }</span>
					{/if}	 -->
        {/if}
        {#if message.timestamp}
          <span class=" self-center invisible group-hover:visible text-gray-400 text-xs font-medium uppercase">
            {dayjs(message.timestamp * 1000).format($i18n.t('h:mm a'))}
          </span>
        {/if}
      </Name>

      {#if message.files}
        <div class="my-2.5 w-full flex overflow-x-auto gap-2 flex-wrap">
          {#each message.files as file}
            <div>
              {#if file.type === 'image'}
                <Image src={file.url} />
              {/if}
            </div>
          {/each}
        </div>
      {/if}

      <!-- video output -->
      <div
        class="prose chat-{message.role} w-full max-w-full dark:prose-invert prose-headings:my-0 prose-p:m-0 prose-p:-mb-6 prose-pre:my-0 prose-table:my-0 prose-blockquote:my-0 prose-img:my-0 prose-ul:-my-4 prose-ol:-my-4 prose-li:-my-3 prose-ul:-mb-6 prose-ol:-mb-8 prose-ol:p-0 prose-li:-mb-4 whitespace-pre-line"
      >
        <div>
          {#if edit === true}
            <div class="w-full bg-gray-50 dark:bg-gray-800 rounded-3xl px-5 py-3 my-2">
              <textarea
                id="message-edit-{message.id}"
                bind:this={editTextAreaElement}
                class=" bg-transparent outline-none w-full resize-none"
                bind:value={editedContent}
                on:input={(e) => {
                  e.target.style.height = '';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
              />

              <div class=" mt-2 mb-1 flex justify-end space-x-1.5 text-sm font-medium">
                <button
                  id="close-edit-message-button"
                  class=" px-4 py-2 bg-gray-900 hover:bg-gray-850 text-gray-100 transition rounded-3xl"
                  on:click={() => {
                    cancelEditMessage();
                  }}
                >
                  {$i18n.t('Cancel')}
                </button>

                <button
                  id="save-edit-message-button"
                  class="px-4 py-2 bg-white hover:bg-gray-100 text-gray-800 transition rounded-3xl"
                  on:click={() => {
                    editMessageConfirmHandler();
                  }}
                >
                  {$i18n.t('Save')}
                </button>
              </div>
            </div>
          {:else}
            <div class="w-full">
              {#if message?.error === true}
                {#if message.paymoney}
                  <div class="max-w-[600px]">
                    {$i18n.t(
                      'This generation uses the {{model}} high-quality model, which will consume {{paymoney}} USDT, The expected wait time is 1-5 minutes.',
                      { model: formatModelName(message.model), paymoney: message?.paymoney }
                    )}
                    {#if message.paystatus}
                      {$i18n.t('Paid')}
                    {:else}
                      {$i18n.t('Unpaid')}
                    {/if}
                    {#if isLastMessage && !message.paystatus}
                      <button
                        class="primaryButton rounded-lg py-1 px-2 text-sm text-white ml-1"
                        disabled={$paystatus}
                        on:click={async () => {
                          $paystatus = true;
                          await handlePay(message);
                        }}>{$i18n.t(message.paytype == 'unpaid' ? 'Pay' : $paystatus ? 'Paying' : 'Pay Verify')}</button
                      >
                    {/if}
                  </div>
                {/if}
                <VideoError
                  bind:videosize={message.size}
                  bind:isLastMessage
                  bind:errtip={internetErr}
                  {resentMessageHandler}
                />
              {:else if message.content === '' && !message?.done}
                {#if message.paymoney}
                  <div class="max-w-[600px]">
                    {$i18n.t(
                      'This generation uses the {{model}} high-quality model, which will consume {{paymoney}} USDT, The expected wait time is 1-5 minutes.',
                      { model: formatModelName(message.model), paymoney: message?.paymoney }
                    )}
                    {#if message.paystatus}
                      {$i18n.t('Paid')}
                    {:else}
                      {$i18n.t('Unpaid')}
                    {/if}
                    {#if isLastMessage && !message.paystatus}
                      <button
                        class="primaryButton rounded-lg py-1 px-2 text-sm text-white ml-1"
                        disabled={$paystatus}
                        on:click={async () => {
                          $paystatus = true;
                          await handlePay(message);
                        }}>{$i18n.t(message.paytype == 'unpaid' ? 'Pay' : $paystatus ? 'Paying' : 'Pay Verify')}</button
                      >
                    {/if}
                  </div>
                {/if}
                {#if message.paystatus}
                  <VideoLoading bind:videosize={message.size} />
                {/if}
              {:else}
                {#each tokens as token, tokenIdx}
                  {#if !message?.paystatus}
                    <div class="max-w-[600px]">
                      {$i18n.t(
                        'This generation uses the {{model}} high-quality model, which will consume {{paymoney}} USDT, The expected wait time is 1-5 minutes.',
                        { model: formatModelName(message.model), paymoney: message?.paymoney }
                      )}
                      {#if message.paystatus}
                        {$i18n.t('Paid')}
                      {:else}
                        {$i18n.t('Unpaid')}
                      {/if}
                      {#if isLastMessage && !message.paystatus}
                        <button
                          class="primaryButton rounded-lg py-1 px-2 text-sm text-white ml-1"
                          disabled={$paystatus}
                          on:click={async () => {
                            $paystatus = true;
                            await handlePay(message);
                          }}
                          >{$i18n.t(message.paytype == 'unpaid' ? 'Pay' : $paystatus ? 'Paying' : 'Pay Verify')}</button
                        >
                      {/if}
                    </div>
                  {:else if message.status == 'completed'}
                    <div class="max-w-[600px]">
                      {$i18n.t(
                        'This generation uses the {{model}} high-quality model, which will consume {{paymoney}} USDT, The expected wait time is 1-5 minutes.',
                        { model: formatModelName(message.model), paymoney: message?.paymoney }
                      )}
                      {#if message.paystatus}
                        {$i18n.t('Paid')}
                      {:else}
                        {$i18n.t('Unpaid')}
                      {/if}
                      {#if isLastMessage && !message.paystatus}
                        <button
                          class="primaryButton rounded-lg py-1 px-2 text-sm text-white ml-1"
                          disabled={$paystatus}
                          on:click={async () => {
                            $paystatus = true;
                            await handlePay(message);
                          }}
                          >{$i18n.t(message.paytype == 'unpaid' ? 'Pay' : $paystatus ? 'Paying' : 'Pay Verify')}</button
                        >
                      {/if}
                    </div>
                    <VideoPlay bind:videourl={token.raw} bind:videosize={message.size} />
                  {:else if message.status == 'failed' || message.status == 'timeout'}
                    <div>
                      {$i18n.t(
                        'This generation uses the {{model}} high-quality model, which will consume {{paymoney}} USDT, The expected wait time is 1-5 minutes.',
                        { model: formatModelName(message.model), paymoney: message?.paymoney }
                      )}
                      {#if message.paystatus}
                        {$i18n.t('Paid')}
                      {:else}
                        {$i18n.t('Unpaid')}
                      {/if}
                      {#if isLastMessage && !message.paystatus}
                        <button
                          class="primaryButton rounded-lg py-1 px-2 text-sm text-white ml-1"
                          disabled={$paystatus}
                          on:click={async () => {
                            $paystatus = true;
                            await handlePay(message);
                          }}
                          >{$i18n.t(message.paytype == 'unpaid' ? 'Pay' : $paystatus ? 'Paying' : 'Pay Verify')}</button
                        >
                      {/if}
                    </div>
                    <VideoError
                      bind:videosize={message.size}
                      bind:isLastMessage
                      bind:errtip={reqeuestErr}
                      {resentMessageHandler}
                    />
                  {:else}
                    <div class="max-w-[600px]">
                      {$i18n.t(
                        'This generation uses the {{model}} high-quality model, which will consume {{paymoney}} USDT, The expected wait time is 1-5 minutes.',
                        { model: formatModelName(message.model), paymoney: message?.paymoney }
                      )}
                      {#if message.paystatus}
                        {$i18n.t('Paid')}
                      {:else}
                        {$i18n.t('Unpaid')}
                      {/if}
                      {#if isLastMessage && !message.paystatus}
                        <button
                          class="primaryButton rounded-lg py-1 px-2 text-sm text-white ml-1"
                          disabled={$paystatus}
                          on:click={async () => {
                            $paystatus = true;
                            await handlePay(message);
                          }}
                          >{$i18n.t(message.paytype == 'unpaid' ? 'Pay' : $paystatus ? 'Paying' : 'Pay Verify')}</button
                        >
                      {/if}
                    </div>
                    {#if message.paystatus}
                      {#if message.done}
                        <VideoError
                          bind:videosize={message.size}
                          bind:isLastMessage
                          bind:errtip={reqeuestErr}
                          {resentMessageHandler}
                        />
                      {:else}
                        <VideoLoading bind:videosize={message.size} />
                      {/if}
                    {/if}
                  {/if}
                {/each}
              {/if}

              {#if message.citations}
                <div class="mt-1 mb-2 w-full flex gap-1 items-center">
                  {#each message.citations.reduce((acc, citation) => {
                    citation.document.forEach((document, index) => {
                      const metadata = citation.metadata?.[index];
                      const id = metadata?.source ?? 'N/A';

                      const existingSource = acc.find((item) => item.id === id);

                      if (existingSource) {
                        existingSource.document.push(document);
                        existingSource.metadata.push(metadata);
                      } else {
                        acc.push( { id: id, source: citation?.source, document: [document], metadata: metadata ? [metadata] : [] } );
                      }
                    });
                    return acc;
                  }, []) as citation, idx}
                    <div class="flex gap-1 text-xs font-semibold">
                      <button
                        class="flex dark:text-gray-300 py-1 px-1 bg-gray-50 hover:bg-gray-100 dark:bg-gray-850 dark:hover:bg-gray-800 transition rounded-xl"
                        on:click={() => {
                          showCitationModal = true;
                          selectedCitation = citation;
                        }}
                      >
                        <div class="bg-white dark:bg-gray-700 rounded-full size-4">
                          {idx + 1}
                        </div>
                        <div class="flex-1 mx-2 line-clamp-1">
                          {citation.source.name}
                        </div>
                      </button>
                    </div>
                  {/each}
                </div>
              {/if}

              {#if message.done || siblings.length > 1}
                <div class=" flex flex-col overflow-x-auto buttons text-gray-600 dark:text-gray-500">
                  {#if siblings.length > 1}
                    <div class="flex justify-start min-w-fit mr-4" dir="ltr">
                      <button
                        class="self-center p-1 hover:bg-black/5 dark:hover:bg-white/5 dark:hover:text-white hover:text-black rounded-md transition"
                        on:click={() => {
                          showPreviousMessage(message);
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          stroke-width="2.5"
                          class="size-3.5"
                        >
                          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                        </svg>
                      </button>

                      <div class="text-sm tracking-widest font-semibold self-center dark:text-gray-100 min-w-fit">
                        {siblings.indexOf(message.id) + 1}/{siblings.length}
                      </div>

                      <button
                        class="self-center p-1 hover:bg-black/5 dark:hover:bg-white/5 dark:hover:text-white hover:text-black rounded-md transition"
                        on:click={() => {
                          showNextMessage(message);
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          stroke-width="2.5"
                          class="size-3.5"
                        >
                          <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                      </button>
                      {#if message.done}
                        <div class="truncate">
                          {$i18n.t('Generated by')}
                          {siblings.length}
                          {siblings.length > 1 ? 'LLMs' : 'LLM'}
                        </div>
                      {:else}
                        <div class="truncate">
                          {$i18n.t('Generating by')}
                          {siblings.length}
                          {siblings.length > 1 ? 'LLMs' : 'LLM'}
                        </div>
                      {/if}
                    </div>
                  {/if}

                  {#if message.done}
                    <div class="flex justify-start min-w-fit mr-4">
                      {#if $config.images && !readOnly}
                        <Tooltip content="Generate Image" placement="bottom">
                          <button
                            class="{isLastMessage
                              ? 'visible'
                              : 'invisible group-hover:visible'}  p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg dark:hover:text-white hover:text-black transition"
                            on:click={() => {
                              if (!generatingImage) {
                                generateImage(message);
                              }
                            }}
                          >
                            {#if generatingImage}
                              <svg
                                class=" w-4 h-4"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                                ><style>
                                  .spinner_S1WN {
                                    animation: spinner_MGfb 0.8s linear infinite;
                                    animation-delay: -0.8s;
                                  }
                                  .spinner_Km9P {
                                    animation-delay: -0.65s;
                                  }
                                  .spinner_JApP {
                                    animation-delay: -0.5s;
                                  }
                                  @keyframes spinner_MGfb {
                                    93.75%,
                                    100% {
                                      opacity: 0.2;
                                    }
                                  }
                                </style><circle class="spinner_S1WN" cx="4" cy="12" r="3" /><circle
                                  class="spinner_S1WN spinner_Km9P"
                                  cx="12"
                                  cy="12"
                                  r="3"
                                /><circle class="spinner_S1WN spinner_JApP" cx="20" cy="12" r="3" /></svg
                              >
                            {:else}
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke-width="2.3"
                                stroke="currentColor"
                                class="w-4 h-4"
                              >
                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                                />
                              </svg>
                            {/if}
                          </button>
                        </Tooltip>
                      {/if}

                      {#if message.info}
                        <Tooltip content={$i18n.t('Generation Info')} placement="bottom">
                          <button
                            class=" {isLastMessage
                              ? 'visible'
                              : 'invisible group-hover:visible'} p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg dark:hover:text-white hover:text-black transition whitespace-pre-wrap"
                            on:click={() => {
                              console.log(message);
                            }}
                            id="info-{message.id}"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke-width="2.3"
                              stroke="currentColor"
                              class="w-4 h-4"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                              />
                            </svg>
                          </button>
                        </Tooltip>
                      {/if}

                      {#if !readOnly}
                        <Tooltip content={$i18n.t('Good Response')} placement="bottom">
                          <button
                            class="{isLastMessage
                              ? 'visible'
                              : 'invisible group-hover:visible'} p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg {message
                              ?.annotation?.rating === 1
                              ? 'bg-gray-100 dark:bg-gray-800'
                              : ''} dark:hover:text-white hover:text-black transition"
                            on:click={() => {
                              rateMessage(message.id, 1);
                              showRateComment = true;

                              window.setTimeout(() => {
                                document.getElementById(`message-feedback-${message.id}`)?.scrollIntoView();
                              }, 0);
                            }}
                          >
                            <svg
                              stroke="currentColor"
                              fill="none"
                              stroke-width="2.3"
                              viewBox="0 0 24 24"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              class="w-4 h-4"
                              xmlns="http://www.w3.org/2000/svg"
                              ><path
                                d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"
                              /></svg
                            >
                          </button>
                        </Tooltip>
                        <Tooltip content={$i18n.t('Bad Response')} placement="bottom">
                          <button
                            class="{isLastMessage
                              ? 'visible'
                              : 'invisible group-hover:visible'} p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg {message
                              ?.annotation?.rating === -1
                              ? 'bg-gray-100 dark:bg-gray-800'
                              : ''} dark:hover:text-white hover:text-black transition"
                            on:click={() => {
                              rateMessage(message.id, -1);
                              showRateComment = true;
                              window.setTimeout(() => {
                                document.getElementById(`message-feedback-${message.id}`)?.scrollIntoView();
                              }, 0);
                            }}
                          >
                            <svg
                              stroke="currentColor"
                              fill="none"
                              stroke-width="2.3"
                              viewBox="0 0 24 24"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              class="w-4 h-4"
                              xmlns="http://www.w3.org/2000/svg"
                              ><path
                                d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"
                              /></svg
                            >
                          </button>
                        </Tooltip>
                      {/if}
                      {#if message.status == 'failed'}
                        {#if isLastMessage && !readOnly}
                          <Tooltip content={$i18n.t('Regenerate')} placement="bottom">
                            <button
                              type="button"
                              class="{isLastMessage
                                ? 'visible'
                                : 'invisible group-hover:visible'} p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg dark:hover:text-white hover:text-black transition regenerate-response-button"
                              on:click={() => {
                                resentMessage(message?.parentId, false);
                              }}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke-width="2.3"
                                stroke="currentColor"
                                class="w-4 h-4"
                              >
                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                                />
                              </svg>
                            </button>
                          </Tooltip>
                        {/if}
                      {/if}
                    </div>
                  {/if}
                </div>
              {/if}

              {#if message.done && showRateComment}
                <RateComment
                  messageId={message.id}
                  bind:show={showRateComment}
                  bind:message
                  on:submit={() => {
                    updateChatMessages();
                  }}
                />
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/key}

<style>
  .buttons::-webkit-scrollbar {
    display: none; /* for Chrome, Safari and Opera */
  }

  .buttons {
    -ms-overflow-style: none; /* IE and Edge */
    scrollbar-width: none; /* Firefox */
  }

  .drag-none {
    -webkit-user-drag: none;
    -moz-user-drag: none;
    -ms-user-drag: none;
    user-drag: none;
  }
</style>
