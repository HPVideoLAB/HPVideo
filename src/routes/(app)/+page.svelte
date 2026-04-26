<script lang="ts">
  // Studio is now the default landing experience for /creator/.
  // The legacy chat-style UI is preserved at /creator/chat for users who prefer it.
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  onMount(() => {
    const target = $page.url.searchParams.get('mode') === 'chat' ? '/creator/chat' : '/creator/pro';
    goto(target, { replaceState: true });
  });
</script>

<div class="flex items-center justify-center w-full h-screen text-gray-500 dark:text-gray-400 text-sm">
  Loading HPVideo Studio...
</div>
