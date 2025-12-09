<script lang="ts">
  import { toast } from 'svelte-sonner';
  import { onMount, tick, getContext } from 'svelte';
  import { mobile, modelfiles, settings, showSidebar, config, threesideAccount } from '$lib/stores';
  import { findWordIndices } from '$lib/utils';

  import { WEBUI_BASE_URL } from '$lib/constants';

  import AddFilesPlaceholder from '../AddFilesPlaceholder.svelte';
  import Tools from './MessageInput/Tools.svelte';
  import Tooltip from '../common/Tooltip.svelte';
  import XMark from '$lib/components/icons/XMark.svelte';

  import { fade } from 'svelte/transition';
  import Suggestions from './MessageInput/Suggestions.svelte';

  const i18n = getContext('i18n');

  export let submitPrompt: Function;
  export let stopResponse: Function;

  export let autoScroll = true;
  export let selectedModel = '';
  export let currentModel: any = [];

  let chatTextAreaElement: HTMLTextAreaElement;
  let filesInputElement: any;
  let urlPromptElement: any;

  let inputFiles: any;
  let dragged = false;

  let user: any = null;

  // 文件选择
  export let files: any[] = [];

  export let fileUploadEnabled = true;

  export let prompt = '';
  let videodura = 8;
  let videosize = '720*1280';
  let videomoney = '$0.01';
  export let messages: any[] = [];

  const getVideoInfo = () => {
    return { duration: videodura, size: videosize, amount: videomoney };
  };

  $: if (prompt) {
    if (chatTextAreaElement) {
      chatTextAreaElement.style.height = '';
      chatTextAreaElement.style.height = Math.min(chatTextAreaElement.scrollHeight, 200) + 'px';
    }
  }

  $: if (videosize) {
    if (chatTextAreaElement) {
      chatTextAreaElement.style.height = '';
      chatTextAreaElement.style.height = Math.min(chatTextAreaElement.scrollHeight, 200) + 'px';
    }
  }

  const scrollToBottom = () => {
    const element = document.getElementById('messages-container');
    element.scrollTop = element.scrollHeight;
  };

  onMount(() => {
    const dropZone = document.querySelector('body');

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        console.log('Escape');
        dragged = false;
      }
    };

    const onDragOver = (e) => {
      e.preventDefault();
      dragged = true;
    };

    const onDragLeave = () => {
      dragged = false;
    };

    const onDrop = async (e) => {
      e.preventDefault();
      console.log(e);

      if (e.dataTransfer?.files) {
        const inputFiles = Array.from(e.dataTransfer?.files);

        if (inputFiles && inputFiles.length > 0) {
          inputFiles.forEach((file) => {
            if (['image/gif', 'image/webp', 'image/jpeg', 'image/png'].includes(file['type'])) {
              let reader = new FileReader();
              reader.onload = (event) => {
                const img = new Image();
                img.onload = function () {
                  const canvas = document.createElement('canvas');
                  let ctx = canvas.getContext('2d');
                  canvas.width = img.width;
                  canvas.height = img.height;
                  ctx?.drawImage(img, 0, 0);
                  let compressedDataUrl;
                  let quality = 1; // 初始质量为 1，表示无损
                  while (true) {
                    compressedDataUrl = canvas.toDataURL(file?.type, quality);
                    if (compressedDataUrl.length <= 300 * 1024) {
                      break;
                    }
                    quality -= 0.1; // 逐渐降低质量
                    if (quality < 0) {
                      break; // 防止质量过低
                    }
                  }
                  files = [
                    ...files,
                    {
                      type: 'image',
                      url: compressedDataUrl,
                    },
                  ];
                };
                img.src = event.target.result;
              };
              reader.readAsDataURL(file);
            } else {
              toast.error(
                $i18n.t(`Unknown File Type {{file_type}}, but accepting and treating as plain text`, {
                  file_type: file['type'],
                })
              );
            }
          });
        } else {
          toast.error($i18n.t(`File not found.`));
        }
      }

      dragged = false;
    };

    window.addEventListener('keydown', handleKeyDown);

    dropZone?.addEventListener('dragover', onDragOver);
    dropZone?.addEventListener('drop', onDrop);
    dropZone?.addEventListener('dragleave', onDragLeave);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);

      dropZone?.removeEventListener('dragover', onDragOver);
      dropZone?.removeEventListener('drop', onDrop);
      dropZone?.removeEventListener('dragleave', onDragLeave);
    };
  });
  const know_ext = 'image/*';
</script>

{#if dragged}
  <div
    class="fixed {$showSidebar
      ? 'left-0 md:left-[310px] md:w-[calc(100%-310px)]'
      : 'left-0'}  w-full h-full flex z-50 touch-none pointer-events-none"
    id="dropzone"
    role="region"
    aria-label="Drag and Drop Container"
  >
    <div class="absolute w-full h-full backdrop-blur bg-gray-800/40 flex justify-center">
      <div class="m-auto pt-64 flex flex-col justify-center">
        <div class="max-w-md">
          <AddFilesPlaceholder />
        </div>
      </div>
    </div>
  </div>
{/if}

<div class="fixed bottom-0 {$showSidebar ? 'left-0 md:left-[310px]' : 'left-0'} right-0">
  <div class="w-full">
    <div class="px-2.5 md:px-16 -mb-0.5 mx-auto inset-x-0 bg-transparent flex justify-center">
      <div class="flex flex-col w-full">
        <div class="relative">
          {#if autoScroll === false && messages.length > 0}
            <div class=" absolute -top-12 left-0 right-0 flex justify-center z-30">
              <button
                class=" bg-white border border-gray-100 dark:border-none dark:bg-white/20 p-1.5 rounded-full"
                on:click={() => {
                  autoScroll = true;
                  scrollToBottom();
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
                  <path
                    fill-rule="evenodd"
                    d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
            </div>
          {/if}
        </div>

        <div class="w-full relative">
          {#if selectedModel !== ''}
            <div
              class="px-3 py-2.5 text-left w-full flex justify-between items-center absolute bottom-0 left-0 right-0 bg-gradient-to-t from-50% from-white dark:from-gray-900"
            >
              <div class="flex items-center gap-2 text-sm dark:text-gray-500">
                <img
                  crossorigin="anonymous"
                  alt="model profile"
                  class="size-5 max-w-[28px] object-cover rounded-full"
                  src={$modelfiles.find((modelfile) => modelfile.tagName === selectedModel.id)?.imageUrl ??
                    ($i18n.language === 'dg-DG' ? `/doge.png` : `/favicon.png`)}
                />
                <div>
                  Talking to <span class=" font-medium">{selectedModel.name} </span>
                </div>
              </div>
              <div>
                <button
                  class="flex items-center"
                  on:click={() => {
                    selectedModel = '';
                  }}
                >
                  <XMark />
                </button>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <div class="bg-white dark:bg-gray-900">
      <div class="px-5 md:px-20 mx-auto inset-x-0">
        <div class="pb-[30px]">
          <input
            bind:this={filesInputElement}
            bind:files={inputFiles}
            type="file"
            accept={know_ext}
            hidden
            on:change={() => {
              if (inputFiles && inputFiles.length > 0) {
                const _inputFiles = Array.from(inputFiles);
                _inputFiles.forEach((file) => {
                  if (['image/gif', 'image/webp', 'image/jpeg', 'image/png'].includes(file['type'])) {
                    let reader = new FileReader();
                    reader.onload = (event) => {
                      const img = new Image();
                      img.onload = function () {
                        const canvas = document.createElement('canvas');
                        let ctx = canvas.getContext('2d');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx?.drawImage(img, 0, 0);
                        let compressedDataUrl;
                        let quality = 1; // 初始质量为 1，表示无损
                        while (true) {
                          compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                          if (compressedDataUrl.length <= 200 * 1024) {
                            break;
                          }
                          quality -= 0.1; // 逐渐降低质量
                          if (quality < 0.1) {
                            break; // 防止质量过低
                          }
                        }
                        files = [
                          // ...files,
                          {
                            type: 'image',
                            url: compressedDataUrl,
                          },
                        ];
                      };
                      img.src = event.target.result;
                      inputFiles = null;
                      filesInputElement.value = '';
                    };
                    reader.readAsDataURL(file);
                  } else {
                    toast.error(
                      $i18n.t(`Unknown File Type {{file_type}}, but accepting and treating as plain text`, {
                        file_type: file['type'],
                      })
                    );
                    filesInputElement.value = '';
                  }
                });
              } else {
                toast.error($i18n.t(`File not found.`));
              }
            }}
          />
          <form
            dir={$settings?.chatDirection ?? 'LTR'}
            class=" flex flex-col relative w-full rounded-3xl bg-gray-100 dark:bg-gray-850 dark:text-gray-100 button-select-none p-3 border border-gray-300 dark:border-gray-800 p-1"
            on:submit|preventDefault={() => {
              if ($threesideAccount?.address) {
                submitPrompt(prompt, getVideoInfo(), user);
              } else {
                document.getElementById('connect-wallet-btn')?.click();
              }
            }}
          >
            {#if files.length > 0}
              <div class="mx-2 mt-2 mb-1 flex flex-wrap gap-2">
                {#each files as file, fileIdx}
                  <div class=" relative group">
                    {#if file.type === 'image'}
                      <img src={file.url} alt="input" class=" h-16 w-16 rounded-xl object-cover" />
                    {/if}

                    <div class=" absolute -top-1 -right-1">
                      <button
                        class=" bg-gray-400 text-white border border-white rounded-full group-hover:visible invisible transition"
                        type="button"
                        on:click={() => {
                          files.splice(fileIdx, 1);
                          files = files;
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                          <path
                            d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
            <div class="flex flex-col rounded-3xl border border-gray-300 dark:border-gray-800 p-1">
              <textarea
                id="chat-textarea"
                bind:this={chatTextAreaElement}
                class="scrollbar-hidden text-sm bg-gray-100 dark:bg-gray-850 dark:text-gray-100 outline-none w-full py-3 px-3 {fileUploadEnabled
                  ? ''
                  : ' pl-4'} rounded-xl resize-none h-[48px]"
                placeholder={$i18n.t('Send a Message')}
                bind:value={prompt}
                on:keypress={(e) => {
                  if (
                    !$mobile ||
                    !('ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0)
                  ) {
                    if (e.keyCode == 13 && !e.shiftKey) {
                      e.preventDefault();
                    }
                    if (prompt !== '' && e.keyCode == 13 && !e.shiftKey) {
                      submitPrompt(prompt, getVideoInfo(), user);
                    }
                  }
                }}
                on:keydown={async (e) => {
                  const isCtrlPressed = e.ctrlKey || e.metaKey; // metaKey is for Cmd key on Mac

                  // Check if Ctrl + R is pressed
                  if (prompt === '' && isCtrlPressed && e.key.toLowerCase() === 'r') {
                    e.preventDefault();
                    console.log('regenerate');

                    const regenerateButton = [...document.getElementsByClassName('regenerate-response-button')]?.at(-1);

                    regenerateButton?.click();
                  }

                  if (prompt === '' && e.key == 'ArrowUp') {
                    e.preventDefault();
                    const userMessageElement = [...document.getElementsByClassName('user-message')]?.at(-1);
                    userMessageElement?.scrollIntoView({ block: 'center' });
                    // editButton?.click();
                    const textarea = document.getElementById('chat-textarea');
                    if (textarea) {
                      textarea.value = userMessageElement?.innerText ?? '';
                    }
                  }
                  if (e.key === 'Tab') {
                    const words = findWordIndices(prompt);
                    if (words.length > 0) {
                      const word = words.at(0);
                      const fullPrompt = prompt;

                      prompt = prompt.substring(0, word?.endIndex + 1);
                      await tick();

                      e.target.scrollTop = e.target.scrollHeight;
                      prompt = fullPrompt;
                      await tick();

                      e.preventDefault();
                      e.target.setSelectionRange(word?.startIndex, word.endIndex + 1);
                    }

                    e.target.style.height = '';
                    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                  }

                  if ((prompt.startsWith('https://') || prompt.startsWith('http://')) && e.key === 'ArrowUp') {
                    e.preventDefault();

                    urlPromptElement.selectUp();
                    const commandOptionButton = [
                      ...document.getElementsByClassName('selected-command-option-button'),
                    ]?.at(-1);
                    commandOptionButton.scrollIntoView({ block: 'center' });
                  }
                  if ((prompt.startsWith('https://') || prompt.startsWith('http://')) && e.key === 'ArrowDown') {
                    e.preventDefault();

                    urlPromptElement.selectDown();
                    const commandOptionButton = [
                      ...document.getElementsByClassName('selected-command-option-button'),
                    ]?.at(-1);
                    commandOptionButton.scrollIntoView({ block: 'center' });
                  }

                  if (e.key === 'Escape') {
                    console.log('Escape');
                    selectedModel = '';
                  }
                }}
                rows="1"
                on:input={(e) => {
                  e.target.style.height = '';
                  e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                  user = null;
                }}
                on:focus={(e) => {
                  e.target.style.height = '';
                  e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                }}
                on:paste={async (e) => {
                  const clipboardData = e.clipboardData || window.clipboardData;

                  if (clipboardData && clipboardData.items) {
                    for (const item of clipboardData.items) {
                      if (item.type.indexOf('image') !== -1) {
                        const blob = item.getAsFile();
                        const reader = new FileReader();

                        reader.onload = function (e) {
                          files = [
                            // ...files,
                            {
                              type: 'image',
                              url: `${e.target.result}`,
                            },
                          ];
                        };

                        reader.readAsDataURL(blob);
                      }
                    }
                  }
                }}
              />
              <div class="flex justify-between">
                <div class="flex flex-row">
                  <!-- upload image -->
                  {#if fileUploadEnabled}
                    <div class="self-star mb-2 ml-1 mr-1">
                      <button
                        class="text-gray-800 dark:text-white transition p-1.5"
                        type="button"
                        on:click={() => {
                          filesInputElement.click();
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 1024 1024"
                          version="1.1"
                          fill="currentColor"
                          class="w-[1.2rem] h-[1.2rem]"
                        >
                          <path
                            d="M625.925953 518.096372l-168.436093 168.436093a47.651721 47.651721 0 0 1-67.298232-0.047628 47.651721 47.651721 0 0 1-0.047628-67.298232l235.781953-235.805768a47.627907 47.627907 0 1 0-67.34586-67.34586l-235.805767 235.781953a142.907535 142.907535 0 0 0 0.047627 202.013768 142.907535 142.907535 0 0 0 202.013768 0.071442l168.459907-168.459907 218.850232-218.850233c83.706047-83.682233 83.658419-219.564651 0.047628-303.151628-83.682233-83.682233-219.421767-83.658419-303.151628 0.023814l-218.850232 218.874047-235.75814 235.758139c-111.592186 111.592186-111.616 292.530605 0 404.122791 111.616 111.616 292.530605 111.639814 404.122791 0L861.707907 619.162791a47.627907 47.627907 0 1 0-67.369674-67.369675L491.210419 854.873302a190.487814 190.487814 0 0 1-269.407256 0 190.511628 190.511628 0 0 1 0-269.431069l235.758139-235.75814 218.850233-218.850233a119.117395 119.117395 0 0 1 168.436093-0.047627 119.212651 119.212651 0 0 1-0.047628 168.436093l-218.850233 218.850232z"
                          />
                        </svg>
                      </button>
                    </div>
                  {/if}

                  <!-- Video Resolution -->
                  <div class="self-star flex gap-x-1 mb-2 ml-1 mr-1">
                    <Tools bind:videosize bind:videodura bind:videomoney bind:selectedModel={currentModel} />
                  </div>
                </div>

                <div class="self-end mb-2 flex space-x-1 mr-1">
                  {#if messages.length == 0 || messages.at(-1).done == true}
                    <Tooltip content={$i18n.t('Send message')}>
                      <button
                        id="send-message-button"
                        class="{prompt !== ''
                          ? ''
                          : 'disabled'} transition rounded-lg px-4 py-1.5 self-center primaryButton"
                        type="submit"
                        disabled={prompt === ''}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 16 16"
                          fill="#ffffff"
                          class="w-5 h-5 rotate-90"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M8 14a.75.75 0 0 1-.75-.75V4.56L4.03 7.78a.75.75 0 0 1-1.06-1.06l4.5-4.5a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1-1.06 1.06L8.75 4.56v8.69A.75.75 0 0 1 8 14Z"
                            clip-rule="evenodd"
                          />
                        </svg>
                      </button>
                    </Tooltip>
                  {:else}
                    <button
                      class="bg-white hover:bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-800 transition rounded-full p-1.5"
                      on:click={stopResponse}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
                        <path
                          fill-rule="evenodd"
                          d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm6-2.438c0-.724.588-1.312 1.313-1.312h4.874c.725 0 1.313.588 1.313 1.313v4.874c0 .725-.588 1.313-1.313 1.313H9.564a1.312 1.312 0 01-1.313-1.313V9.564z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    </button>
                  {/if}
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {#if messages.length == 0}
        <div class="m-auto w-full px-5 md:px-20 pb-[30px]">
          <div class="flex justify-start">
            <div class="flex space-x-4 mb-1" in:fade={{ duration: 200 }}></div>
          </div>
          <div class="w-full bg-1e1e1e padding-10" in:fade={{ duration: 200, delay: 300 }}>
            <Suggestions
              suggestionPrompts={$config?.default_prompt_suggestions}
              submitPrompt={async (p) => {
                let text = p;
                prompt = text;
                await tick();
                const chatInputElement = document.getElementById('chat-textarea');
                if (chatInputElement) {
                  prompt = text;
                  chatInputElement.style.height = '';
                  chatInputElement.style.height = Math.min(chatInputElement.scrollHeight, 200) + 'px';
                  chatInputElement.focus();

                  const words = findWordIndices(prompt);

                  if (words.length > 0) {
                    const word = words.at(0);
                    chatInputElement.setSelectionRange(word?.startIndex, word.endIndex + 1);
                  }
                }
                await tick();
              }}
            />
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .scrollbar-hidden:active::-webkit-scrollbar-thumb,
  .scrollbar-hidden:focus::-webkit-scrollbar-thumb,
  .scrollbar-hidden:hover::-webkit-scrollbar-thumb {
    visibility: visible;
  }
  .scrollbar-hidden::-webkit-scrollbar-thumb {
    visibility: hidden;
  }
  .button-select-none {
    -webkit-touch-callout: none; /* 禁止系统默认菜单 */
    -webkit-user-select: none; /* Safari 浏览器禁止选择 */
    -khtml-user-select: none; /* 早期浏览器 */
    -moz-user-select: none; /* Firefox 浏览器禁止选择 */
    -ms-user-select: none; /* IE 浏览器禁止选择 */
    user-select: none; /* 标准语法，禁止选择 */
  }
</style>
