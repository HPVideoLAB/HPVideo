<script lang="ts">
	import Bolt from '$lib/components/icons/Bolt.svelte';
	import { onMount, getContext } from 'svelte';

	const i18n = getContext('i18n');

	export let submitPrompt: Function;
	export let suggestionPrompts = [];

	let prompts = [];

	$: prompts = suggestionPrompts;

	onMount(() => {
		const containerElement = document.getElementById('suggestions-container');

		if (containerElement) {
			containerElement.addEventListener('wheel', function (event) {
				if (event.deltaY !== 0) {
					// If scrolling vertically, prevent default behavior
					event.preventDefault();
					// Adjust horizontal scroll position based on vertical scroll
					containerElement.scrollLeft += event.deltaY;
				}
			});
		}
	});
</script>

{#if prompts.length > 0}
	<div class="mb-2 flex gap-1 text-sm font-medium items-center text-gray-600 dark:text-gray-600">
		<Bolt />
		{$i18n.t('Suggested')}
	</div>
{/if}

<div class="w-full">
	<div
		class="relative w-full flex gap-2 snap-x snap-mandatory md:snap-none overflow-x-auto tabs"
		id="suggestions-container"
	>
		{#each prompts as prompt, promptIdx}
			<div class="snap-center shrink-0">
				<button
					class="flex flex-col flex-1 shrink-0 w-64 justify-between h-36 p-5 px-6 hover:bg-gradient-to-t from-[#9802E5] to-[#E0A3FF]
						hover:text-white rounded-3xl transition group bg-gray-50 dark:bg-gray-850"
					on:click={() => {
						submitPrompt($i18n.t(prompt.content), promptIdx);
					}}
				>
					<div class="flex flex-col text-left">
						{#if prompt.title && prompt.title[0] !== ''}
							<div
								class="font-medium dark:text-gray-300 group-hover:text-white transition"
							>
								{$i18n.t(prompt.title[0])}
							</div>
							<div class="text-sm text-gray-600 group-hover:text-white font-normal line-clamp-2">{$i18n.t(prompt.title[1])}</div>
						{:else}
							<div
								class=" self-center text-sm font-medium dark:text-gray-300 dark:group-hover:text-white transition line-clamp-2"
							>
								{$i18n.t(prompt.content)}
							</div>
						{/if}
					</div>

					<div class="w-full flex justify-between">
						<div
							class="text-xs text-gray-400 group-hover:text-white dark:text-gray-600 transition self-center"
						>
							{$i18n.t('Prompt')}
						</div>

						<div
							class="self-end p-1 rounded-lg text-gray-300 group-hover:text-white dark:text-gray-700 dark:group-hover:text-white transition"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 16 16"
								fill="currentColor"
								class="size-4"
							>
								<path
									fill-rule="evenodd"
									d="M8 14a.75.75 0 0 1-.75-.75V4.56L4.03 7.78a.75.75 0 0 1-1.06-1.06l4.5-4.5a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1-1.06 1.06L8.75 4.56v8.69A.75.75 0 0 1 8 14Z"
									clip-rule="evenodd"
								/>
							</svg>
						</div>
					</div>
				</button>
			</div>
		{/each}
	</div>
</div>

<style>
	.tabs::-webkit-scrollbar {
		display: none; /* for Chrome, Safari and Opera */
	}

	.tabs {
		-ms-overflow-style: none; /* IE and Edge */
		scrollbar-width: none; /* Firefox */
	}
</style>
