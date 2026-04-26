<script lang="ts">
  // Three rows of one-click prompt-token chips: Camera, Style, Motion.
  // Solves the cold-start "I don't know what to type" problem that
  // kills 60%+ of free-tier first sessions on AI-video tools.
  // Pattern borrowed from Higgsfield/Kling.
  import { getContext } from 'svelte';

  export let prompt: string = '';

  const i18n: any = getContext('i18n');

  // (label key, English token to append to the prompt). The label is
  // localized for display; the token is intentionally kept English
  // because the underlying T2V models all train on English captions.
  type Chip = { label: string; token: string };
  type Group = { titleKey: string; chips: Chip[] };

  const groups: Group[] = [
    {
      titleKey: 'chips_camera',
      chips: [
        { label: 'chip_dolly_in', token: 'slow dolly-in shot' },
        { label: 'chip_orbit', token: 'orbit shot, smooth circular motion' },
        { label: 'chip_crash_zoom', token: 'crash zoom' },
        { label: 'chip_static', token: 'static locked-off shot' },
        { label: 'chip_handheld', token: 'handheld shaky cam' },
        { label: 'chip_drone', token: 'aerial drone shot' },
      ],
    },
    {
      titleKey: 'chips_style',
      chips: [
        { label: 'chip_cinematic', token: 'cinematic, anamorphic lens, film grain' },
        { label: 'chip_anime', token: 'anime style, cel-shaded' },
        { label: 'chip_ghibli', token: 'Studio Ghibli style, hand-drawn' },
        { label: 'chip_photoreal', token: 'photorealistic, 35mm film' },
        { label: 'chip_cyberpunk', token: 'cyberpunk neon, rain reflections' },
        { label: 'chip_oilpaint', token: 'oil painting style, brushwork visible' },
      ],
    },
    {
      titleKey: 'chips_motion',
      chips: [
        { label: 'chip_motion_subtle', token: 'subtle motion' },
        { label: 'chip_motion_moderate', token: 'moderate motion' },
        { label: 'chip_motion_dramatic', token: 'dramatic motion' },
      ],
    },
  ];

  function appendToken(token: string) {
    const trimmed = (prompt || '').trim();
    // Toggle behavior: if the token is anywhere in the prompt, remove it
    // (with surrounding ", " separators); otherwise append it.
    // Pattern with the leading comma-space catches the typical insertion case;
    // the second pattern handles the very-first-token case.
    const withSep = `, ${token}`;
    if (trimmed.includes(withSep)) {
      prompt = trimmed.split(withSep).join('').trim();
      return;
    }
    if (trimmed.startsWith(token)) {
      prompt = trimmed.slice(token.length).replace(/^,\s*/, '').trim();
      return;
    }
    prompt = trimmed ? `${trimmed}, ${token}` : token;
  }

  // Chip is "selected" when the prompt currently contains its token.
  // Lets us highlight the chip and gives the user a visible toggle affordance.
  $: tokenInPrompt = (token: string) => {
    const t = (prompt || '').trim();
    return t === token || t.startsWith(`${token}`) || t.includes(`, ${token}`);
  };
</script>

<div class="space-y-2 text-[11px]">
  {#each groups as g (g.titleKey)}
    <div>
      <div class="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
        {$i18n.t(g.titleKey)}
      </div>
      <div class="flex flex-wrap gap-1.5">
        {#each g.chips as c (c.label)}
          {@const selected = tokenInPrompt(c.token)}
          <button
            type="button"
            aria-pressed={selected}
            class="px-2 py-0.5 rounded-full border text-[10px] transition
              {selected
                ? 'border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-300'
                : 'border-border-light dark:border-border-dark text-gray-600 dark:text-gray-300 hover:border-primary-500/60 hover:text-primary-600 dark:hover:text-primary-300'}"
            on:click={() => appendToken(c.token)}
          >
            {$i18n.t(c.label)}
          </button>
        {/each}
      </div>
    </div>
  {/each}
</div>
