<script lang="ts">
  import { getContext, onMount } from "svelte";

  import {
    mobile,
    chats,
    chatsearch,
    chatId,
    showSidebar,
    user,
    initPageFlag
  } from "$lib/stores";

  import ShareChatModal from "../chat/ShareChatModal.svelte";
  import ModelSelector from "../chat/ModelSelector.svelte";
  import Menu from "./Navbar/Menu.svelte";
  import MenuLines from "../icons/MenuLines.svelte";
  import { generateInitialsImage } from "$lib/utils";
  import { getChatById } from "$lib/apis/chats";
  import Setting from "$lib/components/layout/Navbar/Setting.svelte"

  import { getLanguages } from "$lib/i18n";
    import Tooltip from "../common/Tooltip.svelte";

  const i18n = getContext("i18n");

  export let initNewChat: Function;
  export let shareEnabled: boolean = false;

  export let chat;
  export let selectedModels: any;

  export let showModelSelector = true;

  let showShareChatModal = false;
  let showDownloadChatModal = false;

  let isMobile = false;
  let languages = [];

  let search = "";
  $: if (search) {
    chatsearch.set(search);
  } else {
    chatsearch.set("");
  }
  // Helper function to fetch and add chat content to each chat
  const enrichChatsWithContent = async (chatList: any) => {
    const enrichedChats: any = await Promise.all(
      chatList.map(async (chat: any) => {
        const chatDetails = await getChatById(
          localStorage.token,
          chat.id
        ).catch((error) => null); // Handle error or non-existent chat gracefully
        if (chatDetails) {
          chat.chat = chatDetails.chat; // Assuming chatDetails.chat contains the chat content
        }
        return chat;
      })
    );
    chats.set(enrichedChats);
  };

  onMount(async () => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    // 检查是否为移动端设备
    isMobile = /android|iPad|iPhone|iPod|IEMobile|Opera Mini/i.test(userAgent);
    languages = await getLanguages();
  });
</script>

<ShareChatModal bind:show={showShareChatModal} chatId={$chatId} />
<nav id="nav" class=" sticky py-2.5 top-0 flex flex-row justify-center z-30">
  <div class=" flex max-w-full w-full mx-auto px-5 pt-0.5 md:px-[1rem]">
    <div class="flex items-center w-full max-w-full">
      <div
        class="{$showSidebar
          ? 'md:hidden'
          : ''} mr-3 self-start flex flex-none items-center text-gray-600 dark:text-gray-400"
      >
        <button
          id="sidebar-toggle-button"
          class="cursor-pointer px-2 py-2 flex rounded-xl hover:bg-[#9903E6] hover:text-white transition"
          on:click={() => {
            showSidebar.set(!$showSidebar);
          }}
        >
          <div class=" m-auto self-center">
            <MenuLines />
          </div>
        </button>
      </div>

      <div class="overflow-hidden bg-gray-100 dark:bg-gray-850 rounded-full p-2">
        {#if showModelSelector}
          <ModelSelector bind:selectedModels />
        {/if}
      </div>

      <div class="flex-1"></div>

      <div
        class="self-start flex flex-none items-center text-gray-600 dark:text-gray-400"
      >
        <!-- <div class="md:hidden flex self-center w-[1px] h-5 mx-2 bg-gray-300 dark:bg-stone-700" /> -->

        {#if shareEnabled}
          <Menu
            {chat}
            {shareEnabled}
            shareHandler={() => {
              showShareChatModal = !showShareChatModal;
            }}
            downloadHandler={() => {
              showDownloadChatModal = !showDownloadChatModal;
            }}
          >
            <button
              class="hidden md:flex cursor-pointer px-2 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-850 transition"
              id="chat-context-menu-button"
            >
              <div class=" m-auto self-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="size-5"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
                  />
                </svg>
              </div>
            </button>
          </Menu>
        {/if}

        <Tooltip content={$i18n.t("New Chat")}>
          <button
            id="new-chat-button"
            class=" flex cursor-pointer p-2 rounded-xl hover:bg-[#9903E6] hover:text-white transition mr-1"
            on:click={() => {
              initNewChat();
            }}
          >
            <div class=" m-auto self-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="size-6"
              >
                <path
                  d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z"
                />
                <path
                  d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z"
                />
              </svg>
            </div>
          </button>
        </Tooltip>
        
        {#if $initPageFlag}
          <div class="flex items-center bg-gray-100 dark:bg-gray-850 rounded-full p-1">
            {#if !$mobile}
              <div class="px-2 flex justify-center space-x-2 rounded-full bg-gray-50 dark:bg-gray-800">
                <div class="flex w-full rounded-xl" id="chat-search">
                  <div class="self-center pl-1 py-2.5 rounded-l-xl bg-transparent">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      class="w-4 h-4"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </div>

                  <input
                    class="w-full rounded-r-xl py-1.5 pl-2 pr-4 text-sm bg-transparent dark:text-gray-300 outline-none"
                    placeholder={$i18n.t("Search")}
                    bind:value={search}
                    on:focus={() => {
                      enrichChatsWithContent($chats);
                    }}
                  />
                </div>
              </div>
            {/if}

            <Setting/>

            <div class=" self-center">
              <div class="size-9 object-cover rounded-full bg-primary">
                <img
                  src={$user.profile_image_url == ""
                    ? generateInitialsImage($user.name)
                    : $user.profile_image_url}
                  alt="profile"
                  class=" rounded-full size-9 object-cover"/>
              </div>
            </div>
          </div>   
        {/if}
      </div>
    </div>
  </div>
</nav>
