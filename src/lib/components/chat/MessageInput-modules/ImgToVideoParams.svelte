<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  type Resolution = '720p' | '1080p';
  type Transition = { duration: number; prompt?: string };
  type TaskStatus = 'idle' | 'submitting' | 'processing' | 'completed' | 'failed';

  export let globalPrompt = '';
  export let negativePrompt = '';
  export let resolution: Resolution = '720p';
  export let seed = -1;
  export let transitions: Transition[] = [];

  export let taskStatus: TaskStatus = 'idle';
  export let outputUrl = '';
  export let requestId = '';

  const dispatch = createEventDispatcher<{ generate: void }>();

  function totalDuration() {
    return transitions.reduce((sum, t) => sum + (Number(t.duration) || 0), 0);
  }
</script>

<section class="rounded-2xl border border-gray-200 bg-transparent p-3 sm:p-4 dark:border-gray-850">
  <div class="mb-3 flex items-center justify-between">
    <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">生成参数</h2>
    <div class="text-xs text-gray-600 dark:text-gray-400">
      总时长：{totalDuration()}s / 25s
    </div>
  </div>

  <div class="space-y-3">
    <div>
      <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">提示词（Prompt）</label>
      <textarea
        bind:value={globalPrompt}
        rows={4}
        placeholder="全局描述：内容、运动、风格（例如：温暖电影光，轻微手持镜头，屏幕闪烁…）"
        class="w-full resize-y rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-sm
               text-gray-900 placeholder:text-gray-500
               focus:border-primary-500 focus:outline-none
               dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
      />
    </div>

    <!-- 文档没有 negative，这里保留给你内部拼接/未来扩展 -->
    <div>
      <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">反向提示词（Negative，可选）</label
      >
      <textarea
        bind:value={negativePrompt}
        rows={2}
        placeholder="例如：低清晰度，噪点，模糊，水印，畸变"
        class="w-full resize-y rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-sm
               text-gray-900 placeholder:text-gray-500
               focus:border-primary-500 focus:outline-none
               dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
      />
    </div>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">分辨率（resolution）</label>
        <select
          bind:value={resolution}
          class="w-full rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-sm
                 text-gray-900 focus:border-primary-500 focus:outline-none
                 dark:border-gray-700 dark:text-gray-100"
        >
          <option value="720p">720p</option>
          <option value="1080p">1080p</option>
        </select>
      </div>

      <div>
        <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Seed（-1 随机）</label>
        <input
          type="number"
          bind:value={seed}
          class="w-full rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-sm
                 text-gray-900 placeholder:text-gray-500 focus:border-primary-500 focus:outline-none
                 dark:border-gray-700 dark:text-gray-100"
        />
      </div>
    </div>

    <!-- transitions：长度必须是 images-1，由父组件自动同步 -->
    {#if transitions.length > 0}
      <div class="pt-1">
        <div class="mb-2 flex items-center justify-between">
          <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">转场（transitions）</div>
          <div class="text-xs text-gray-600 dark:text-gray-400">
            数量：{transitions.length}（= 图片数 - 1）
          </div>
        </div>

        <div class="space-y-2">
          {#each transitions as t, i}
            <div class="rounded-2xl border border-gray-200 p-3 dark:border-gray-850">
              <div class="mb-2 flex items-center justify-between">
                <div class="text-xs font-medium text-gray-700 dark:text-gray-300">段 {i + 1}</div>
              </div>

              <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <label class="mb-1 block text-[11px] text-gray-600 dark:text-gray-400">duration（秒）</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    bind:value={t.duration}
                    class="w-full rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-sm
                           text-gray-900 focus:border-primary-500 focus:outline-none
                           dark:border-gray-700 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label class="mb-1 block text-[11px] text-gray-600 dark:text-gray-400">prompt（可选）</label>
                  <input
                    type="text"
                    bind:value={t.prompt}
                    placeholder="该段局部提示（可选）"
                    class="w-full rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-sm
                           text-gray-900 placeholder:text-gray-500 focus:border-primary-500 focus:outline-none
                           dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
                  />
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <div class="pt-1">
      <button
        class="w-full rounded-xl bg-primary-500 px-4 py-3 text-sm font-semibold text-white
               hover:bg-primary-600 active:bg-primary-700 disabled:opacity-50"
        on:click={() => dispatch('generate')}
        disabled={taskStatus === 'submitting' || taskStatus === 'processing'}
      >
        立即生成视频
      </button>

      <div class="mt-2 text-xs text-gray-600 dark:text-gray-400">
        状态：{taskStatus}
        {#if requestId}
          · Task: {requestId}{/if}
      </div>
    </div>

    {#if outputUrl}
      <div class="mt-3 rounded-2xl border border-gray-200 p-3 dark:border-gray-850">
        <div class="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">结果</div>
        <video class="w-full rounded-xl border border-gray-200 dark:border-gray-850" controls src={outputUrl} />
        <div class="mt-2 text-xs text-gray-600 dark:text-gray-400">输出：MP4</div>
      </div>
    {/if}
  </div>
</section>
