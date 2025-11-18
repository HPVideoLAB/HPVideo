<script lang="ts">
  import { DropdownMenu } from "bits-ui";
  import ChevronDown from "$lib/components/icons/ChevronDown.svelte";
  import { models } from "$lib/stores";
  import { onMount, getContext } from "svelte";

  const i18n = getContext("i18n");

  let sizeshow = false;
  let durashow = false;
  let button: HTMLElement;
  let buttonWidth: number;
  let resizeObserver: ResizeObserver;
  let seldura = ["Short", "Medium", "Long"];
  let amount: any[] = [];

  export let videodura = 10;
  export let videosize = "720*1280";
  export let selectedModel: any = [];
  let modelObj: any = [];

  $: if (selectedModel && selectedModel.length > 0) {
    if (modelObj.length > 0) {
      if (modelObj[0].id != selectedModel[0]) {
        modelObj = $models.filter((item) => selectedModel.includes(item.id));
        if (modelObj.length > 0) {
          videodura = modelObj[0].duration[0];
          videosize = modelObj[0].size[0];
          if (modelObj[0].duration.length > 2) {
            seldura = ["Short", "Medium", "Long"];
          } else {
            seldura = ["Short", "Long"];
          }
          checkmoney(modelObj[0].amount);
        }
      }
    } else {
      modelObj = $models.filter((item) => selectedModel.includes(item.id));
      if (modelObj.length > 0) {
        videodura = modelObj[0].duration[0];
        videosize = modelObj[0].size[0];
        if (modelObj[0].duration.length > 2) {
          seldura = ["Short", "Medium", "Long"];
        } else {
          seldura = ["Short", "Long"];
        }
        checkmoney(modelObj[0].amount);
      }
    }
    
  } else {
    modelObj = [];
  }

  const checkmoney = (amounts: any) => {
    const keys = Object.keys(amounts);
    if (keys.length == 1) {
      amount = amounts[keys[0]];
    } else {
      keys.forEach((item: string) => {
        if (videosize.includes(item)) {
          amount = amounts[item];
        }
      })
    }
  }

  onMount(() => {
    resizeObserver = new ResizeObserver((entries) => {
      buttonWidth = entries[0].contentRect.width;
    });
    if (button) {
      resizeObserver.observe(button);
    }
    return () => {
      if (resizeObserver) resizeObserver.disconnect();
    };
  });
</script>

<DropdownMenu.Root bind:open={sizeshow}>
  <DropdownMenu.Trigger>
    <div class="flex flex-row">
      <button
        bind:this={button}
        class="flex flex-row items-center bg-gray-50 dark:bg-gray-800 rounded-lg px-2 py-0.5"
        on:click={(e) => {
          e.preventDefault();
        }}
      >
        <span class="text-xs ml-1 py-0.5">{videosize}</span>
        <ChevronDown className="self-center ml-1 size-3"/>
      </button>
    </div>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content side="right">
    <slot>
      <div
        class="flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
        dark:text-gray-300 text-gray-700 shadow-lg px-3 py-5 rounded-2xl mb-16"
        style="margin-left:-{Math.trunc(buttonWidth + 50)}px;"
      >
        {#if modelObj.length > 0}
          {#each modelObj[0].size as item}
            <button
              aria-label="model-item"
              class="flex item-center w-full text-left font-medium line-clamp-1 select-none items-center rounded-button p-2
                hover:bg-gray-100 dark:hover:bg-gray-850 rounded-xl cursor-pointer data-[highlighted]:bg-muted"
              on:click={(e) => {
                e.preventDefault();
                videosize = item;
                checkmoney(modelObj[0].amount);
                sizeshow = false;
              }}
            >
              <div class="flex flex-row items-center gap-2 mr-1">
                {#if Number(item.split("*")[0]) < Number(item.split("*")[1])}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 1024 1024"
                    class="w-[1rem] h-[1rem]"
                    fill="currentColor"
                  >
                    <path
                      d="M689.5366769 68.15830653l-355.0733538 0a88.76833845 88.76833845 0 0 0-88.76833845 88.76833845L245.69498465 867.07335502a88.76833845 88.76833845 0 0 0 88.76833845 88.76833845l355.0733538 0a88.76833845 88.76833845 0 0 0 88.76833845-88.76833845l0-710.14671004a88.76833845 88.76833845 0 0 0-88.76833845-88.76833845z m-355.0733538 55.48021199l355.0733538 0a33.28812646 33.28812646 0 0 1 33.28812768 33.28812646L722.82480458 867.07335502a33.28812646 33.28812646 0 0 1-33.28812768 33.28812646l-355.0733538 0A33.28812646 33.28812646 0 0 1 301.17519542 867.07335502l0-710.14671004a33.28812646 33.28812646 0 0 1 33.28812768-33.28812646z"
                    />
                  </svg>
                {:else}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 1024 1024"
                    class="w-[1rem] h-[1rem]"
                    fill="currentColor"
                  >
                    <path
                      d="M832 256a128 128 0 0 1 128 128v256a128 128 0 0 1-128 128H192a128 128 0 0 1-128-128V384a128 128 0 0 1 128-128h640z m0 64H192a64 64 0 0 0-63.552 56.512L128 384v256a64 64 0 0 0 56.512 63.552L192 704h640a64 64 0 0 0 63.552-56.512L896 640V384a64 64 0 0 0-56.512-63.552L832 320z"
                    />
                  </svg>
                {/if}
                <span class="text-sm ml-1">{item}</span>
              </div>
            </button>
          {/each}
        {/if}
      </div>
    </slot>
  </DropdownMenu.Content>
</DropdownMenu.Root>

<DropdownMenu.Root bind:open={durashow}>
  <DropdownMenu.Trigger>
    <div class="flex flex-row">
      <button
        bind:this={button}
        class="flex flex-row items-center bg-gray-50 dark:bg-gray-800 rounded-lg px-2 py-0.5"
        on:click={(e) => {
          e.preventDefault();
        }}> 
        <div class="flex flex-row items-center">
          {#if modelObj.length > 0}
            <span class="text-xs ml-1 py-0.5">{$i18n.t(seldura[modelObj[0].duration.indexOf(videodura)])}</span>
          {:else}
            <span class="text-xs ml-1 py-0.5">{$i18n.t(seldura[1])}</span>
          {/if}
          <ChevronDown className="self-center ml-1 size-3"/>
        </div>   
      </button>
    </div>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content side="right">
    <slot>
      <div
        class="flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
        dark:text-gray-300 text-gray-700 shadow-lg px-3 py-5 rounded-2xl mb-16"
        style="margin-left:-{Math.trunc(buttonWidth + 20)}px;"
      >
        {#if modelObj.length > 0}
          {#each modelObj[0].duration as item, index}
            <button
              aria-label="model-item"
              class="flex item-center w-full text-left font-medium line-clamp-1 select-none items-center rounded-button p-2
                hover:bg-gray-100 dark:hover:bg-gray-850 rounded-xl cursor-pointer data-[highlighted]:bg-muted"
              on:click={(e) => {
                e.preventDefault();
                videodura = item;
                durashow = false;
              }}
            >
              <div class="flex flex-row items-center gap-2 mr-1">
                <svg xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 1024 1024"
                  class="w-[1rem] h-[1rem]"
                  fill="currentColor">
                  <path d="M512 0C230.4 0 0 230.4 0 512s230.4 512 512 512 512-230.4 512-512S793.6 0 512 0z m42.666667 934.4V853.333333c0-25.6-17.066667-42.666667-42.666667-42.666666s-42.666667 17.066667-42.666667 42.666666v81.066667c-200.533333-21.333333-362.666667-179.2-379.733333-379.733333H170.666667c25.6 0 42.666667-17.066667 42.666666-42.666667s-17.066667-42.666667-42.666666-42.666667H89.6c17.066667-200.533333 179.2-362.666667 379.733333-379.733333V170.666667c0 25.6 17.066667 42.666667 42.666667 42.666666s42.666667-17.066667 42.666667-42.666666V89.6c200.533333 21.333333 362.666667 179.2 379.733333 379.733333H853.333333c-25.6 0-42.666667 17.066667-42.666666 42.666667s17.066667 42.666667 42.666666 42.666667h81.066667c-17.066667 200.533333-179.2 362.666667-379.733333 379.733333z"/>
                  <path d="M704 580.266667l-153.6-89.6-46.933333-174.933334c-4.266667-21.333333-29.866667-38.4-51.2-29.866666-25.6 8.533333-38.4 34.133333-34.133334 55.466666l51.2 192c0 4.266667 4.266667 8.533333 8.533334 12.8l4.266666 4.266667 8.533334 8.533333 170.666666 98.133334c8.533333 4.266667 12.8 4.266667 21.333334 4.266666 12.8 0 29.866667-8.533333 38.4-21.333333 8.533333-21.333333 4.266667-46.933333-17.066667-59.733333z"/>
                </svg>
                <span class="text-sm ml-1">{$i18n.t(seldura[index])} { "(" + item + "s - $" + amount[index] + ")"}</span>
              </div>
            </button>
          {/each}
        {/if}
      </div>
    </slot>
  </DropdownMenu.Content>
</DropdownMenu.Root>
