<script lang="ts">
  import { goto } from '$app/navigation';
  import {
    chats,
    chatsearch,
    settings,
    chatId,
    tags,
    showSidebar,
    mobile,
    showArchivedChats,
    pageUpdateNumber,
    showFollowTwitterModal,
    showFollowTGGroupModal,
    showWalletView,
  } from '$lib/stores';
  import { onMount, getContext } from 'svelte';

  const i18n = getContext('i18n');

  import {
    deleteChatById,
    getChatList,
    getChatListByTagName,
    updateChatById,
    getAllChatTags,
    archiveChatById,
  } from '$lib/apis/chats';
  import { toast } from 'svelte-sonner';
  import ChatMenu from './Sidebar/ChatMenu.svelte';
  import ShareChatModal from '../chat/ShareChatModal.svelte';
  import ArchivedChatsModal from './Sidebar/ArchivedChatsModal.svelte';
  import FollowTwitterModal from '../twitter/FollowTwitterModal.svelte';
  import FollowTgGroupModal from '../twitter/FollowTgGroupModal.svelte';

  const BREAKPOINT = 768;

  let navElement;

  let title: string = 'UI';

  let shareChatId: any = null;

  let selectedChatId: any = null;

  let chatDeleteId: any = null;
  let chatTitleEditId: any = null;
  let chatTitle = '';

  let showShareChatModal = false;

  let filteredChatList = [];

  $: filteredChatList = $chats?.filter((chat) => {
    if ($chatsearch === '') {
      return true;
    } else {
      let title = chat?.title.toLowerCase();
      const query = $chatsearch.toLowerCase();

      let contentMatches = false;
      // Access the messages within chat.chat.messages
      if (chat.chat && chat.chat.messages && Array.isArray(chat.chat.messages)) {
        contentMatches = chat.chat.messages.some((message) => {
          // Check if message.content exists and includes the search query
          return message.content && message.content.toString().toLowerCase().includes(query);
        });
      }

      return title.includes(query) || contentMatches;
    }
  });

  mobile;
  const onResize = () => {
    if ($showSidebar && window.innerWidth < BREAKPOINT) {
      showSidebar.set(false);
      showWalletView.set(false);
    }
  };

  $: $pageUpdateNumber, updateChats();

  async function updateChats() {
    if (localStorage.token) {
      const chatList = await getChatList(localStorage.token);
      chats.set(chatList);
      tags.set([]);
    }
  }

  $: if (!$showSidebar) {
    showWalletView.set(false);
  }

  onMount(async () => {
    // -----------------------原带的逻辑
    mobile.subscribe((e) => {
      if ($showSidebar && e) {
        showSidebar.set(false);
        showWalletView.set(false);
      }

      if (!$showSidebar && !e) {
        showSidebar.set(true);
      }
    });

    showSidebar.set(window.innerWidth > BREAKPOINT);

    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchend', onTouchEnd);

    // return () => {
    //   window.removeEventListener("touchstart", onTouchStart);
    //   window.removeEventListener("touchend", onTouchEnd);
    // };
  });

  let touchstart: any;
  let touchend: any;

  function checkDirection() {
    const screenWidth = window.innerWidth;
    const swipeDistance = Math.abs(touchend.screenX - touchstart.screenX);
    if (touchstart.clientX < 40 && swipeDistance >= screenWidth / 8) {
      if (touchend.screenX < touchstart.screenX) {
        showSidebar.set(false);
      }
      if (touchend.screenX > touchstart.screenX) {
        showSidebar.set(true);
      }
    }
  }

  const onTouchStart = (e: any) => {
    touchstart = e.changedTouches[0];
  };

  const onTouchEnd = (e: any) => {
    touchend = e.changedTouches[0];
    checkDirection();
  };

  const editChatTitle = async (id, _title) => {
    if (_title === '') {
      toast.error($i18n.t('Title cannot be an empty string.'));
    } else {
      title = _title;

      await updateChatById(localStorage.token, id, {
        title: _title,
      });
      await chats.set(await getChatList(localStorage.token));
    }
  };

  const deleteChat = async (id) => {
    const res = await deleteChatById(localStorage.token, id).catch((error) => {
      toast.error(error);
      chatDeleteId = null;

      return null;
    });

    if (res) {
      if ($chatId === id) {
        goto('/creator');
      }

      await chats.set(await getChatList(localStorage.token));
    }
  };

  const saveSettings = async (updated) => {
    await settings.set({ ...$settings, ...updated });
    localStorage.setItem('settings', JSON.stringify($settings));
    location.href = '/';
  };

  const archiveChatHandler = async (id) => {
    await archiveChatById(localStorage.token, id);
    await chats.set(await getChatList(localStorage.token));
  };

  const showWalletFun = () => {
    $showWalletView = true;
  };
  const closeWalletFun = () => {
    $showWalletView = false;
  };
</script>

<ShareChatModal bind:show={showShareChatModal} chatId={shareChatId} />
<ArchivedChatsModal
  bind:show={$showArchivedChats}
  on:change={async () => {
    await chats.set(await getChatList(localStorage.token));
  }}
/>

<!-- 关注推特弹窗 -->
{#if showFollowTwitterModal}
  <FollowTwitterModal bind:show={$showFollowTwitterModal} />
{/if}
<!-- 关注TG群弹窗 -->
{#if showFollowTGGroupModal}
  <FollowTgGroupModal bind:show={$showFollowTGGroupModal} />
{/if}

<!-- svelte-ignore a11y-no-static-element-interactions -->

{#if $showSidebar}
  <div
    class=" fixed md:hidden z-40 top-0 right-0 left-0 bottom-0 bg-black/10 w-full min-h-screen h-screen flex justify-center overflow-hidden overscroll-contain"
    on:mousedown={() => {
      showSidebar.set(!$showSidebar);
    }}
  />
{/if}

<div
  bind:this={navElement}
  id="sidebar"
  class="h-[calc(100dvh-30px)] max-h-[calc(100dvh-30px)] min-h-[calc(100dvh-30px)] select-none md:mx-[30px] md:my-[10px] {$showSidebar
    ? 'md:relative w-[280px]'
    : '-translate-x-[280px] w-[0px]'} bg-gray-100 text-gray-900 dark:bg-gray-850 dark:text-gray-200 text-sm transition fixed z-50 top-0 left-0
    {$mobile ? 'mt-[60px]' : 'rounded-3xl'}"
  data-state={$showSidebar}
>
  <div
    class="p-2.5 my-auto flex flex-col justify-between h-[calc(100dvh-30px)] max-h-[calc(100dvh-30px)] w-[280px] z-50 {$showSidebar
      ? ''
      : 'invisible'}"
  >
    {#if !$mobile}
      <div
        class="p-2.5 flex justify-between space-x-1 text-gray-600 dark:text-gray-400 border-b border-gray-300 dark:border-gray-700"
      >
        <a
          id="sidebar-new-chat-button"
          class="flex flex-1 justify-between rounded-xl px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-850 transition"
          href="/creator"
          draggable="false"
          on:click={async () => {
            selectedChatId = null;
            await goto('/creator');
            const newChatButton = document.getElementById('new-chat-button');
            setTimeout(() => {
              newChatButton?.click();
              if ($mobile) {
                showSidebar.set(false);
              }
            }, 0);
          }}
        >
          <div class="self-center mx-1.5">
            <img src="/creator/static/favicon2.png" class="h-5" alt="logo" />
          </div>
        </a>

        <button
          class=" cursor-pointer px-2 py-2 flex rounded-xl hover:bg-[#9903E6] hover:text-white transition"
          on:click={() => {
            showSidebar.set(!$showSidebar);
          }}
        >
          <div class=" m-auto self-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="size-5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
            </svg>
          </div>
        </button>
      </div>
    {/if}

    <div class="relative flex flex-col flex-1 overflow-y-auto">
      <div class="flex items-center p-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          data-spm-anchor-id="a313x.search_index.0.i0.36643a81ufw80h"
          viewBox="0 0 1024 1024"
          version="1.1"
          fill="#9802E5"
          class="size-6"
        >
          <path
            d="M810.666667 981.333333l-53.717334-117.248L640 810.666667l116.906667-53.76L810.666667 640l53.333333 116.906667L981.333333 810.666667l-117.333333 53.333333L810.666667 981.333333zM384 853.333333l-106.666667-234.666666L42.666667 512l234.666666-106.666667L384 170.666667l106.666667 234.666666L725.333333 512l-234.666666 106.666667L384 853.333333zM384 341.333333l-53.76 117.290667L213.333333 512l116.906667 53.76L384 682.666667l53.290667-116.949334L554.666667 512l-117.333334-53.333333z m426.666667 42.666667l-53.717334-116.864L640 213.333333l116.906667-53.290666L810.666667 42.666667l53.333333 117.333333L981.333333 213.333333l-117.333333 53.76L810.666667 384z"
          />
        </svg>
        <span class="ml-2 font-bold text-sm">{$i18n.t('Chats')}</span>
      </div>
      {#if !($settings.saveChatHistory ?? true)}
        <div class="absolute z-40 w-full h-full bg-gray-50/90 dark:bg-black/90 flex justify-center">
          <div class=" text-left px-5 py-2">
            <div class=" font-medium">
              {$i18n.t('Chat History is off for this browser.')}
            </div>
            <div class="text-xs mt-2">
              {$i18n.t(
                "When history is turned off, new chats on this browser won't appear in your history on any of your devices."
              )}
              <span class=" font-semibold">{$i18n.t('This setting does not sync across browsers or devices.')}</span>
            </div>

            <div class="mt-3">
              <button
                class="flex justify-center items-center space-x-1.5 px-3 py-2.5 rounded-lg text-xs bg-gray-100 hover:bg-gray-200 transition text-gray-800 font-medium w-full"
                type="button"
                on:click={() => {
                  saveSettings({
                    saveChatHistory: true,
                  });
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3">
                  <path
                    fill-rule="evenodd"
                    d="M8 1a.75.75 0 0 1 .75.75v6.5a.75.75 0 0 1-1.5 0v-6.5A.75.75 0 0 1 8 1ZM4.11 3.05a.75.75 0 0 1 0 1.06 5.5 5.5 0 1 0 7.78 0 .75.75 0 0 1 1.06-1.06 7 7 0 1 1-9.9 0 .75.75 0 0 1 1.06 0Z"
                    clip-rule="evenodd"
                  />
                </svg>

                <div>{$i18n.t('Enable Chat History')}</div>
              </button>
            </div>
          </div>
        </div>
      {/if}

      {#if $tags?.length > 0}
        <div class="px-2.5 mb-2 flex gap-1 flex-wrap">
          <button
            class="px-2.5 text-xs font-medium bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 transition rounded-full"
            on:click={async () => {
              await chats.set(await getChatList(localStorage.token));
            }}
          >
            {$i18n.t('all')}
          </button>
          {#each $tags as tag}
            <button
              class="px-2.5 text-xs font-medium bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 transition rounded-full"
              on:click={async () => {
                let chatIds = await getChatListByTagName(localStorage.token, tag.name);
                if (chatIds.length === 0) {
                  await tags.set(await getAllChatTags(localStorage.token));
                  chatIds = await getChatList(localStorage.token);
                }
                await chats.set(chatIds);
              }}
            >
              {tag.name}
            </button>
          {/each}
        </div>
      {/if}

      <div class="pl-2 my-2 flex-1 flex flex-col space-y-1 overflow-y-auto scrollbar-hidden">
        {#if filteredChatList?.length > 0}
          {#each filteredChatList as chat, idx}
            {#if idx === 0 || (idx > 0 && chat.time_range !== filteredChatList[idx - 1].time_range)}
              <div
                class="w-full pl-2.5 text-xs text-gray-500 dark:text-gray-500 font-medium {idx === 0
                  ? ''
                  : 'pt-5'} pb-0.5"
              >
                {$i18n.t(chat.time_range)}
              </div>
            {/if}

            <div class=" w-full pr-2 relative group">
              {#if chatTitleEditId === chat.id}
                <div
                  class=" w-full flex justify-between rounded-xl px-3 py-2 {chat.id === $chatId ||
                  chat.id === chatTitleEditId ||
                  chat.id === chatDeleteId
                    ? 'bg-gray-200 dark:bg-gray-900'
                    : chat.id === selectedChatId
                    ? 'bg-gray-100 dark:bg-gray-850'
                    : 'group-hover:bg-[#9903E6CC] dark:group-hover:bg-[#9903E6CC]'}  whitespace-nowrap text-ellipsis"
                >
                  <input bind:value={chatTitle} class=" bg-transparent w-full outline-none mr-10" />
                </div>
              {:else}
                <a
                  class=" w-full flex justify-between rounded-xl px-3 py-2 {chat.id === $chatId ||
                  chat.id === chatTitleEditId ||
                  chat.id === chatDeleteId
                    ? 'bg-[#9903E6] text-white'
                    : chat.id === selectedChatId
                    ? 'bg-gray-100 dark:bg-gray-850'
                    : ' group-hover:bg-[#9903E6CC] group-hover:text-white'}  whitespace-nowrap text-ellipsis"
                  href="/creator/c/{chat.id}"
                  on:click={() => {
                    selectedChatId = chat.id;
                    if ($mobile) {
                      showSidebar.set(false);
                    }
                  }}
                  draggable="false"
                >
                  <div class=" flex self-center flex-1 w-full">
                    <div class=" text-left self-center overflow-hidden w-full h-[20px]">
                      {chat.title}
                    </div>
                  </div>
                </a>
              {/if}

              <div
                class="
                {chat.id === $chatId || chat.id === chatTitleEditId || chat.id === chatDeleteId
                  ? 'text-white'
                  : chat.id === selectedChatId
                  ? 'from-gray-100 dark:from-gray-950'
                  : 'invisible group-hover:visible text-white from-gray-100 dark:from-gray-950'}
                  absolute right-[10px] top-[10px] pr-2 pl-5"
              >
                {#if chatTitleEditId === chat.id}
                  <div class="flex self-center space-x-1.5 z-10">
                    <button
                      class=" self-center hover:text-white transition"
                      on:click={() => {
                        editChatTitle(chat.id, chatTitle);
                        chatTitleEditId = null;
                        chatTitle = '';
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                        <path
                          fill-rule="evenodd"
                          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    </button>
                    <button
                      class=" self-center dark:hover:text-white transition"
                      on:click={() => {
                        chatTitleEditId = null;
                        chatTitle = '';
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                        <path
                          d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
                        />
                      </svg>
                    </button>
                  </div>
                {:else if chatDeleteId === chat.id}
                  <div class="flex self-center space-x-1.5 z-10">
                    <button
                      class=" self-center dark:hover:text-white transition"
                      on:click={() => {
                        deleteChat(chat.id);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                        <path
                          fill-rule="evenodd"
                          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    </button>
                    <button
                      class=" self-center dark:hover:text-white transition"
                      on:click={() => {
                        chatDeleteId = null;
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                        <path
                          d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
                        />
                      </svg>
                    </button>
                  </div>
                {:else}
                  <div class="flex self-center space-x-1 z-10">
                    <ChatMenu
                      chatId={chat.id}
                      shareHandler={() => {
                        shareChatId = selectedChatId;
                        showShareChatModal = true;
                      }}
                      archiveChatHandler={() => {
                        archiveChatHandler(chat.id);
                      }}
                      renameHandler={() => {
                        chatTitle = chat.title;
                        chatTitleEditId = chat.id;
                      }}
                      deleteHandler={() => {
                        chatDeleteId = chat.id;
                      }}
                      onClose={() => {
                        selectedChatId = null;
                      }}
                    >
                      <button
                        aria-label="Chat Menu"
                        class="self-center hover:text-white transition"
                        on:click={() => {
                          selectedChatId = chat.id;
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
                          <path
                            d="M2 8a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM6.5 8a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM12.5 6.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"
                          />
                        </svg>
                      </button>
                    </ChatMenu>

                    {#if chat.id === $chatId}
                      <button
                        id="delete-chat-button"
                        class="hidden"
                        on:click={() => {
                          chatDeleteId = chat.id;
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
                          <path
                            d="M2 8a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM6.5 8a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM12.5 6.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"
                          />
                        </svg>
                      </button>
                    {/if}
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        {/if}
      </div>
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
</style>
