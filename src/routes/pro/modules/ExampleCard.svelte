<script lang="ts">
  let prompt = ''; // 当前显示的提示词

  // 示例卡片的图片和对应的提示词
  const examples = [
    {
      image:
        'https://p2-kling.klingai.com/bs2/upload-ylab-stunt/13efc772-b7f4-4676-9e77-63b12805e385-lcd12p6YQL6yH_7Oqpd06Q-output_ff.jpg?x-kcdn-pid=112452&x-oss-process=image%2Fresize%2Cw_128%2Ch_128%2Cm_mfit%2Fformat%2Cwebp',
      prompt: '蓝色的女孩跳舞',
    },
    {
      image:
        'https://p2-kling.klingai.com/bs2/upload-ylab-stunt/13efc772-b7f4-4676-9e77-63b12805e385-lcd12p6YQL6yH_7Oqpd06Q-output_ff.jpg?x-kcdn-pid=112452&x-oss-process=image%2Fresize%2Cw_128%2Ch_128%2Cm_mfit%2Fformat%2Cwebp',
      prompt: '坐着的女孩',
    },
    {
      image:
        'https://p2-kling.klingai.com/bs2/upload-ylab-stunt/13efc772-b7f4-4676-9e77-63b12805e385-lcd12p6YQL6yH_7Oqpd06Q-output_ff.jpg?x-kcdn-pid=112452&x-oss-process=image%2Fresize%2Cw_128%2Ch_128%2Cm_mfit%2Fformat%2Cwebp',
      prompt: '酒瓶',
    },
    {
      image:
        'https://p2-kling.klingai.com/bs2/upload-ylab-stunt/13efc772-b7f4-4676-9e77-63b12805e385-lcd12p6YQL6yH_7Oqpd06Q-output_ff.jpg?x-kcdn-pid=112452&x-oss-process=image%2Fresize%2Cw_128%2Ch_128%2Cm_mfit%2Fformat%2Cwebp',
      prompt: '接电话的女孩',
    },
  ];

  // 点击卡片时填充提示词
  const handleClick = (newPrompt: string) => {
    prompt = newPrompt;
  };
</script>

<div class="p-4">
  <h2 class="text-xl font-semibold mb-4">示例卡片</h2>
  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 md:gap-6">
    {#each examples as { image, prompt: examplePrompt }}
      <!-- 直接渲染优化后的卡片结构 -->
      <div
        class="cursor-pointer border rounded-lg overflow-hidden shadow-lg hover:scale-105 transition-transform"
        on:click={() => handleClick(examplePrompt)}
      >
        <img src={image} alt={examplePrompt} class="w-full md:h-24 object-cover rounded-t-lg" />
      </div>
    {/each}
  </div>
</div>
