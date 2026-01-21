<script lang="ts">
  import { getContext } from 'svelte';
  import { DropdownMenu } from 'bits-ui';
  import { flyAndScale } from '$lib/utils/transitions';
  import { mobile, threesideAccount } from '$lib/stores';

  import UserEdit from '$lib/components/chat/Settings/UserEdit.svelte';
  import { toast } from 'svelte-sonner';

  const i18n = getContext('i18n');

  let show = false;

  function formatWalletAddress(address: any, { prefixLen, suffixLen } = {}) {
    if (!address || typeof address !== 'string' || address.length < 10) return address;

    // 自动适配 EVM 链（0x开头，42位）和 Solana 链（44位）
    const defaultPrefixLen = address.startsWith('0x') ? 6 : 4;
    const finalPrefixLen = prefixLen ?? defaultPrefixLen;
    const finalSuffixLen = suffixLen ?? 4;

    // 校验长度（避免越界）
    if (finalPrefixLen + finalSuffixLen >= address.length) return address;

    // 截取前缀和后缀，中间用...连接
    const prefix = address.slice(0, finalPrefixLen);
    const suffix = address.slice(-finalSuffixLen);
    return `${prefix}...${suffix}`;
  }
</script>

<DropdownMenu.Root bind:open={show}>
  <DropdownMenu.Trigger>
    <button
      class="relative primaryButton flex rounded-xl transition pl-3 pr-2 py-1 text-sm text-white ml-2 whitespace-nowrap"
      aria-label="User Menu"
      on:click={(e) => {
        e.preventDefault();
      }}
    >
      {formatWalletAddress($threesideAccount?.address, { prefixLen: 3, suffixLen: 3 })}
    </button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content
    class="z-[999999999999]  justify-start rounded-2xl   dark:text-white shadow-lg 
      border border-gray-300/30 dark:border-gray-700/50  outline-none"
    transition={flyAndScale}
    side="bottom"
    sideOffset={12}
    align="end"
    alignOffset={10}
  >
    <slot>
      <div class="text-gray-700 dark:text-gray-100">
        <div class="flex flex-col md:flex-col md:space-x-4">
          <div class="flex-1 md:min-h-[10rem]">
            <UserEdit
              saveHandler={() => {
                toast.success($i18n.t('Settings saved successfully!'));
                show = false;
              }}
            />
          </div>
        </div>
      </div>
    </slot>
  </DropdownMenu.Content>
</DropdownMenu.Root>
