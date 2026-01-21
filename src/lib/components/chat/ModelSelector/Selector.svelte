<script lang="ts">
  import { DropdownMenu } from 'bits-ui';

  import { flyAndScale } from '$lib/utils/transitions';
  import { createEventDispatcher, getContext } from 'svelte';

  import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
  import Check from '$lib/components/icons/Check.svelte';

  import { mobile } from '$lib/stores';

  const dispatch = createEventDispatcher();

  const i18n = getContext('i18n');

  export let value = '';
  export let placeholder = 'Select a model';

  export let items = [{ value: 'mango', label: 'Mango', info: { tip: 'mango', desc: 'desc' } }];

  export let selectedList: any = [];

  export let selectedModelIdx = 0;

  let show = false;

  let selectedModel = '';
  $: selectedModel = items.find((item) => item.value === value) ?? '';

  function changeModel(val: string) {
    selectedList = [];
    selectedList.push(val);
    dispatch('childEvent', selectedList);
    show = false;
  }

  let seltype = 1;
  $: {
    if (show) {
      let checkModels = items.filter((item) => selectedList.includes(item.value));
      if (checkModels.length > 0) {
        seltype = checkModels[0]?.info?.type;
      } else {
        seltype = 1;
      }
    }
  }
</script>

<DropdownMenu.Root bind:open={show}>
  <DropdownMenu.Trigger class="relative w-full" aria-label={placeholder}>
    <div
      class="flex flex-row items-center w-full text-left px-0.5 outline-none bg-transparent truncate text-lg font-semibold placeholder-gray-400 focus:outline-none"
    >
      {#if selectedModel}
        <img src={selectedModel?.info?.modelicon} class="w-6 h-6" alt="model-icon" />
        <span class="text-ellipsis overflow-hidden text-sm px-2">{selectedModel?.label}</span>
      {:else}
        <span class="text-ellipsis overflow-hidden">{placeholder}</span>
      {/if}
      {#if selectedModelIdx == 0}
        <ChevronDown className="self-center ml-0.5 size-4" />
      {/if}
    </div>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content
    class=" z-[90]  justify-start rounded-md  bg-white dark:bg-gray-850 dark:text-white shadow-lg border border-gray-300/30 dark:border-gray-700/50  outline-none mt-2"
    transition={flyAndScale}
    side={$mobile ? 'bottom' : 'bottom-start'}
    align="start"
    alignOffset={-8}
    sideOffset={8}
  >
    <slot>
      <div class="w-full px-1 my-2 max-h-88 overflow-y-auto max-h-[calc(100vh-200px)]">
        <div class="px-2 w-full">
          <div class="transition ease-in-out delay-150 py-1 {seltype == 1 ? '' : 'hidden'}">
            {#each items as item (item.value)}
              {#if item?.info?.type == 1}
                <button
                  aria-label="model-item"
                  class="flex item-center w-full text-left font-medium line-clamp-1 select-none items-center rounded-button py-1 pl-2 pr-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg cursor-pointer data-[highlighted]:bg-muted"
                  on:click={() => {
                    changeModel(item.value);
                  }}
                >
                  <div class="flex items-center gap-2 mr-1">
                    <div class="flex flex-col line-clamp-1">
                      <div class="flex items-center text-sm text-gray-900 dark:text-gray-100">
                        {item?.info?.tip}
                        {#if !item?.info?.audio}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 1024 1024"
                            version="1.1"
                            fill="currentColor"
                            class="size-4 ml-2"
                          >
                            <path
                              d="M251.264 701.653333H85.333333a42.666667 42.666667 0 0 1-42.666666-42.666666v-256a42.666667 42.666667 0 0 1 42.666666-42.666667h165.930667l225.877333-184.832A21.333333 21.333333 0 0 1 512 192v677.973333a21.333333 21.333333 0 0 1-34.858667 16.512L251.306667 701.653333z m619.733333-170.666666l150.869334 150.826666-60.373334 60.373334L810.666667 591.317333l-150.869334 150.869334-60.330666-60.373334 150.869333-150.826666-150.869333-150.869334 60.330666-60.330666L810.666667 470.656l150.826666-150.869333L1021.866667 380.16l-150.869334 150.869333z"
                            />
                          </svg>
                        {/if}
                      </div>
                      <span class="text-xs mt-0.5 primaryText">{$i18n.t(item?.info?.desc)}</span>
                    </div>
                  </div>
                  <div class="ml-auto">
                    <Check checkFlag={selectedList.find((sitem) => sitem === item.value) ?? ''} />
                  </div>
                </button>
              {/if}
            {/each}
          </div>
        </div>
      </div>
      <div class="hidden w-[42rem]" />
      <div class="hidden w-[32rem]" />
    </slot>
  </DropdownMenu.Content>
</DropdownMenu.Root>

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
