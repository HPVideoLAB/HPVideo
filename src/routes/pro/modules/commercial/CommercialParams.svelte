<script lang="ts">
  import { createEventDispatcher, getContext } from 'svelte';
  import MySelect from '$lib/components/common/MySelect.svelte';
  import { ASIAN_MARKET_VOICES } from '../../../../constants/commercial-voices';
  import MyButton from '$lib/components/common/MyButton.svelte';
  import { mediaQuery } from 'svelte-legos';

  export let globalPrompt = '';
  export let voiceId = 'fresh_youth';
  export let duration = 15;
  export let enableSmartEnhance = true;
  // 🔥🔥🔥 修改点 1：类型扩展，直接包含所有档位
  export let enableUpscale: '720p' | '1080p' | '2k' | '4k' = '720p';

  export let taskStatus = 'idle';
  export let errors: any = {};
  export let costUsd: number | null = null;

  // 📱 定义你心中的 "Mobile" (比如小于 768px)
  const isMobile = mediaQuery('(max-width: 768px)');
  const i18n: any = getContext('i18n');
  const dispatch = createEventDispatcher<{ generate: void }>();
  $: isLoading = taskStatus === 'submitting' || taskStatus === 'processing';

  // ==========================
  // Select options（最小入侵桥接）
  // ==========================

  // 1) voice options：直接映射
  $: voiceOptions = ASIAN_MARKET_VOICES.map((v) => ({
    value: v.id,
    label: $i18n.t(v.name),
    desc: $i18n.t(v.description),
    gender: v.gender,
    hasAudio: false,
    icon: undefined,
  }));

  // 2) duration options：string 桥接
  $: durationValue = String(duration);
  const durationOptions = [5, 10, 15].map((d) => ({
    value: String(d),
    label: `${d}s`,
    desc: undefined,
  }));

  // 🔥🔥🔥 修改点 2：Quality Options 直接对应你的四个档位
  // value 直接就是发给后端的 enableUpscale
  const qualityOptions = [
    { value: '720p', label: '720p', desc: undefined }, // ✅ 明确传 '720p'
    { value: '1080p', label: '1080p', desc: undefined }, // ✅ 明确传 '1080p'
    { value: '2k', label: '2K', desc: undefined },
    { value: '4k', label: '4K', desc: undefined },
  ];
</script>

<section
  class="flex flex-col h-full gap-3 rounded-2xl border border-border-light bg-bg-light p-3 shadow-sm dark:border-border-dark dark:bg-bg-dark"
>
  <form class="flex flex-col gap-3 h-full" on:submit={() => !isLoading && dispatch('generate')}>
    <!-- ✅ 三个手写 dropdown 替换成 MySelect -->

    <div class="grid grid-cols-1 md:grid-cols-12 gap-2 relative">
      <!-- 人物音色 -->
      <div class="md:col-span-6 flex flex-col gap-1">
        <div class="flex items-center justify-between px-1">
          <span class="text-[10px] font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400">
            {$i18n.t('Select voice')}
          </span>
        </div>

        <MySelect
          bind:value={voiceId}
          showTriggerDesc={false}
          showTriggerMedia={false}
          options={voiceOptions}
          placeholder={$i18n.t('Select voice')}
          on:change={(e) => (voiceId = e.detail.value)}
        />
      </div>

      <div class="grid grid-cols-2 col-span-1 md:col-span-6 gap-2">
        <!-- 视频时长 -->
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between px-1">
            <span class="text-[10px] font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400">
              {$i18n.t('Video duration')}
            </span>
          </div>

          <MySelect
            value={durationValue}
            showTriggerDesc={false}
            options={durationOptions}
            placeholder={$i18n.t('Select duration')}
            on:change={(e) => (duration = Number(e.detail.value))}
          />
        </div>

        <!-- 视频画质 -->
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between px-1">
            <span class="text-[10px] font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400">
              {$i18n.t('Video quality')}
            </span>
          </div>

          <MySelect
            value={enableUpscale}
            showTriggerDesc={false}
            options={qualityOptions}
            placeholder={$i18n.t('Select quality')}
            on:change={(e) => {
              enableUpscale = e.detail.value;
            }}
          />
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <div class="flex flex-col">
        <div
          class={`flex flex-col gap-2 pb-2 w-full rounded-2xl border transition-all duration-300
        bg-bg-light dark:bg-bg-dark 
        shadow-sm dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]
        ${
          errors.globalPrompt
            ? 'border-error-500 focus-within:ring-2 focus-within:ring-error-500/20'
            : 'border-border-light dark:border-border-dark focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
        >
          <!-- 输入框 -->
          <textarea
            bind:value={globalPrompt}
            rows={$isMobile ? 6 : 3}
            placeholder={$i18n.t(
              'Use quotes for dialogue and follow the character immediately with @Voice. E.g.: Host @Narrator says Look at the stars.'
            )}
            class="w-full resize-none bg-transparent px-4 py-3 text-sm text-text-light dark:text-text-dark outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
          />
          <!-- 按钮 -->
          <div class="flex items-center justify-end px-2 pb-1.5 mt-[-4px]">
            <div class="flex items-center gap-3">
              <MyButton
                circle
                size="small"
                type={enableSmartEnhance ? 'primary' : 'default'}
                htmlType="button"
                tooltip={'When enabled, AI automatically optimizes prompts, adds camera movements, lighting details, and micro-expressions.'}
                on:click={() => {
                  enableSmartEnhance = !enableSmartEnhance;
                }}
                class={!enableSmartEnhance
                  ? 'bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
                  : ''}
              >
                <iconify-icon class="text-lg" icon="mdi:movie-open-star" />
              </MyButton>

              <MyButton
                round
                size={$isMobile ? 'small' : 'large'}
                disabled={isLoading}
                type="primary"
                htmlType="submit"
                class="!px-3 shadow-[0_0_15px_rgba(194,19,242,0.4)] hover:shadow-[0_0_20px_rgba(194,19,242,0.6)] transition-all duration-300 active:scale-95"
              >
                <span class="flex items-center gap-1.5">
                  {#if isLoading}
                    <iconify-icon icon="eos-icons:loading" class="text-lg animate-spin" />
                  {:else}
                    <iconify-icon icon="mdi:sparkles" class="text-lg text-white" />

                    {#if costUsd !== null}
                      <span class="w-[1px] h-3 bg-white/30 mx-0.5" />
                      <span class="text-sm font-bold font-mono">
                        {costUsd === 0 ? 'FREE' : `$${costUsd.toFixed(3)}`}
                      </span>
                    {/if}
                  {/if}
                </span>
              </MyButton>
            </div>
          </div>

          <!-- 错误 -->
          {#if errors.globalPrompt}
            <div class="min-h-[20px] flex items-center px-2">
              <div
                class="text-[10px] text-error-500 font-medium flex items-center gap-1 animate-in fade-in slide-in-from-left-1"
              >
                <iconify-icon icon="mdi:alert-circle" />
                <span>{errors.globalPrompt}</span>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </form>
</section>
