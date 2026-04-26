<script lang="ts">
  // Public share page for a generated video.
  // URL: /creator/v/[id]  (the /creator base prefix is enforced by svelte.config.js)
  // No auth required — relies on the Nest endpoint /large-language-model/:id
  // which is already public for status polling.
  import { onMount, getContext } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { NEST_API_BASE_URL } from '$lib/constants';
  import { initPageFlag } from '$lib/stores';
  import TemplateGallery from '../../pro/modules/TemplateGallery.svelte';

  const i18n: any = getContext('i18n');

  type Task = {
    requestId: string;
    modelName: string;
    status: 'processing' | 'completed' | 'failed';
    prompt?: string;
    outputUrl?: string;
    thumbUrl?: string;
    params?: Record<string, any>;
    createdAt?: string | number;
  };

  let task: Task | null = null;
  let loading = true;
  let errorMsg = '';
  let copied = false;

  // Only let https/http URLs through — the share page's og:image / og:video /
  // <video src> are otherwise reachable for arbitrary-scheme injection if
  // upstream provider data ever returns 'javascript:' / 'data:' etc.
  function safeUrl(u: string | undefined): string {
    if (!u) return '';
    try {
      const parsed = new URL(u, 'https://hpvideo.io');
      return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : '';
    } catch {
      return '';
    }
  }

  $: id = $page.params.id;
  $: shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  $: outputUrl = safeUrl(task?.outputUrl);
  $: thumbUrl = safeUrl(task?.thumbUrl);
  $: pageTitle = task?.prompt
    ? `${task.prompt.slice(0, 60)} | HPVideo`
    : 'AI-generated video | HPVideo';

  async function fetchTask() {
    loading = true;
    errorMsg = '';
    try {
      const res = await fetch(`${NEST_API_BASE_URL}/large-language-model/${id}`);
      if (!res.ok) {
        // Treat any 4xx as 'not found' for the public viewer — the
        // detailed status code is for ops, not for end users.
        errorMsg = res.status >= 400 && res.status < 500
          ? $i18n.t('Video not found')
          : $i18n.t('Could not load video. Please try again later.');
        return;
      }
      task = await res.json();
      if (!task || !task.requestId) {
        errorMsg = $i18n.t('Video not found');
        task = null;
      }
    } catch (e: any) {
      errorMsg = e?.message ?? 'Failed to load';
    } finally {
      loading = false;
    }
  }

  function copyLink() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      copied = true;
      setTimeout(() => (copied = false), 1800);
    });
  }

  function shareTo(platform: 'x' | 'telegram') {
    const text = task?.prompt
      ? `${task.prompt.slice(0, 100)} — Made with HPVideo`
      : 'Check out this AI-generated video on HPVideo';
    const u = encodeURIComponent(shareUrl);
    const t = encodeURIComponent(text);
    const url =
      platform === 'x'
        ? `https://twitter.com/intent/tweet?url=${u}&text=${t}`
        : `https://t.me/share/url?url=${u}&text=${t}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function remix() {
    if (!task?.params) return;
    // Stash for /creator/pro to pick up on mount.
    try {
      sessionStorage.setItem(
        'hpv:remix-params',
        JSON.stringify({ params: task.params, sourceId: task.requestId }),
      );
    } catch {
      /* sessionStorage unavailable */
    }
    goto('/creator/pro');
  }

  // Forward a template-gallery click into the same remix flow so a
  // dead share-link still produces a generation.
  function onTemplateSelect(e: CustomEvent) {
    const { params } = e.detail || {};
    if (!params) return;
    try {
      sessionStorage.setItem('hpv:remix-params', JSON.stringify({ params }));
    } catch {
      /* sessionStorage unavailable */
    }
    goto('/creator/pro');
  }

  onMount(() => {
    // Drop the root splash so the page actually renders.
    initPageFlag.set(true);
    fetchTask();
  });
</script>

<svelte:head>
  <title>{pageTitle}</title>
  <meta property="og:title" content={pageTitle} />
  <meta property="og:type" content="video.other" />
  <meta property="og:url" content={shareUrl} />
  {#if thumbUrl}<meta property="og:image" content={thumbUrl} />{/if}
  {#if outputUrl}<meta property="og:video" content={outputUrl} />{/if}
  <meta name="twitter:card" content={thumbUrl ? 'summary_large_image' : 'summary'} />
  <meta name="twitter:title" content={pageTitle} />
  {#if thumbUrl}<meta name="twitter:image" content={thumbUrl} />{/if}
</svelte:head>

<div class="min-h-screen bg-bg-light dark:bg-bg-dark text-text-light dark:text-text-dark">
  <!-- Top nav -->
  <nav
    class="w-full px-4 md:px-6 py-3 flex items-center justify-between border-b border-border-light dark:border-border-dark"
  >
    <a href="/creator" class="flex items-center gap-2">
      <span
        class="text-base md:text-xl font-bold tracking-tight bg-gradient-to-r from-primary-400 via-primary-500 to-violet-400 bg-clip-text text-transparent"
      >
        HPVideo Studio
      </span>
    </a>
    <a
      href="/creator/pro"
      class="text-xs md:text-sm px-3 py-1.5 rounded-full bg-primary-500 hover:bg-primary-600 text-white transition"
    >
      {$i18n.t('Create your own')}
    </a>
  </nav>

  <main class="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
    {#if loading}
      <div class="aspect-video w-full rounded-2xl bg-gray-100 dark:bg-gray-850 animate-pulse" />
    {:else if errorMsg}
      <div
        class="rounded-3xl border border-border-light dark:border-border-dark p-8 md:p-14 text-center"
      >
        <div
          class="mx-auto mb-5 w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500/15 to-violet-500/15 flex items-center justify-center"
        >
          <iconify-icon icon="mdi:movie-off-outline" class="text-5xl text-primary-500/80" />
        </div>
        <h2 class="text-lg md:text-xl font-bold text-text-light dark:text-text-dark mb-2">
          {errorMsg}
        </h2>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          {$i18n.t('This video may be private, deleted, or never existed.')}
        </p>
        <div class="mt-6 flex flex-wrap justify-center gap-2">
          <a
            href="/creator/pro"
            class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition"
          >
            <iconify-icon icon="mdi:plus" class="text-lg" />
            {$i18n.t('Make a video of your own')}
          </a>
          <a
            href="/creator"
            class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border-light dark:border-border-dark text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition"
          >
            <iconify-icon icon="mdi:image-multiple" class="text-lg" />
            {$i18n.t('Browse templates')}
          </a>
        </div>
      </div>
    {:else if task}
      <!-- Video -->
      <div class="rounded-2xl overflow-hidden border border-border-light dark:border-border-dark bg-black">
        {#if outputUrl}
          <video
            class="w-full max-h-[80vh] object-contain bg-black"
            src={outputUrl}
            poster={thumbUrl}
            controls
            autoplay
            muted
            loop
            playsinline
            preload="metadata"
          />
        {:else if task.status === 'processing'}
          <div class="aspect-video flex items-center justify-center text-gray-400 text-sm">
            {$i18n.t('Still rendering...')}
          </div>
        {:else}
          <div class="aspect-video flex items-center justify-center text-gray-400 text-sm">
            {$i18n.t('Generation failed')}
          </div>
        {/if}
      </div>

      <!-- Meta -->
      <section class="mt-5">
        {#if task.prompt}
          <p class="text-base md:text-lg leading-snug text-text-light dark:text-text-dark whitespace-pre-wrap">
            {task.prompt}
          </p>
        {/if}
        <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          {#if task.modelName}
            <span class="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 uppercase tracking-wide">
              {task.modelName}
            </span>
          {/if}
          {#if task.createdAt}
            <span>· {new Date(task.createdAt).toLocaleString()}</span>
          {/if}
        </div>
      </section>

      <!-- Actions -->
      <section class="mt-6 flex flex-wrap items-center gap-2">
        {#if task.params}
          <button
            type="button"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition"
            on:click={remix}
          >
            <iconify-icon icon="mdi:auto-fix" class="text-lg" />
            {$i18n.t('Remix this')}
          </button>
        {/if}

        <button
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border-light dark:border-border-dark text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition"
          on:click={() => shareTo('x')}
        >
          <iconify-icon icon="mdi:twitter" class="text-lg" />
          {$i18n.t('Share to X')}
        </button>

        <button
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border-light dark:border-border-dark text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition"
          on:click={() => shareTo('telegram')}
        >
          <iconify-icon icon="mdi:send" class="text-lg" />
          {$i18n.t('Share to Telegram')}
        </button>

        <button
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border-light dark:border-border-dark text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition"
          on:click={copyLink}
        >
          <iconify-icon icon={copied ? 'mdi:check' : 'mdi:link-variant'} class="text-lg" />
          {copied ? $i18n.t('Copied!') : $i18n.t('Copy link')}
        </button>
      </section>

      <!-- Attribution footer -->
      <footer class="mt-10 pt-6 border-t border-border-light dark:border-border-dark text-xs text-gray-500 dark:text-gray-400 text-center">
        {$i18n.t('Made with')}
        <a class="text-primary-500 hover:underline" href="/creator/pro">HPVideo Studio</a>
        ·
        {$i18n.t('AI video on BNB Chain')}
      </footer>
    {/if}

    {#if errorMsg}
      <!-- Don't waste the click: surface the template wall so a dead share
           link still has a chance to convert into a real session. -->
      <section class="mt-10 pt-8 border-t border-border-light dark:border-border-dark">
        <h3 class="text-base font-semibold text-text-light dark:text-text-dark mb-1">
          {$i18n.t('While you are here, try one of these')}
        </h3>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-4">
          {$i18n.t('Click any template to load its prompt, reference, and parameters. Edit then generate.')}
        </p>
        <div class="-mx-4 md:-mx-6 rounded-2xl overflow-hidden border border-border-light dark:border-border-dark">
          <TemplateGallery on:select={onTemplateSelect} />
        </div>
      </section>
    {/if}
  </main>
</div>
