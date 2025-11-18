<script lang="ts">
	import { getContext } from 'svelte';
	import { getModels as _getModels } from "$lib/utils";
	import Modal from "../common/Modal.svelte";
	import { toast } from 'svelte-sonner';
	import UserEdit from "./Settings/UserEdit.svelte";

	const i18n = getContext('i18n');

	export let show = false;
	let modelsize = "sm"
</script>

<Modal bind:size={modelsize} bind:show>
	<div class="text-gray-700 dark:text-gray-100">
		<div class="flex justify-between dark:text-gray-300 px-5 pt-4 pb-2">
			<div></div>
			<button
				class="self-center"
				on:click={() => {
					show = false;
				}}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
					class="w-5 h-5"
				>
					<path
						d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
					/>
				</svg>
			</button>
		</div>

		<div class="flex flex-col md:flex-col w-full px-4 py-2 md:space-x-4">
			<div class="flex-1 md:mt-3 md:min-h-[10rem]">
				<UserEdit saveHandler={() => {
					toast.success($i18n.t("Settings saved successfully!"));
					show = false;
				}}/>
			</div>
		</div>
	</div>
</Modal>

<style>
	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
		/* display: none; <- Crashes Chrome on hover */
		-webkit-appearance: none;
		margin: 0; /* <-- Apparently some margin are still there even though it's hidden */
	}

	.tabs::-webkit-scrollbar {
		display: none; /* for Chrome, Safari and Opera */
	}

	.tabs {
		-ms-overflow-style: none; /* IE and Edge */
		scrollbar-width: none; /* Firefox */
	}

	input[type="number"] {
		-moz-appearance: textfield; /* Firefox */
	}
</style>
