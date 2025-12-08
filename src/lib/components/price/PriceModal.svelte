<script lang="ts">
	import { getContext } from "svelte";
	import Modal from "../common/Modal.svelte";
	import { models } from "$lib/stores";

	const i18n = getContext("i18n");

	export let show = false;
</script>

<Modal size="lg" bind:show>
	<div class="max-h-[80vh] xs:h-auto flex flex-col">
		<div class=" flex justify-between dark:text-gray-300 px-5 pt-6 pb-2">
			<div class=" text-base font-bold self-center">{$i18n.t("Pricing")}</div>
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

		<div class="flex flex-col h-1/3 overflow-y-auto pb-6 md:px-8 px-4 mt-4">
			<div
				class="flex flex-row justify-center items-center border-t border-l border-r border-gray-600 dark:border-gray-100 rounded-t-lg"
			>
				<div
					class="text-center font-bold text-sm py-2 md:w-[150px] w-[100px] px-1 border-r border-gray-600 dark:border-gray-100"
				>
					{$i18n.t("Model")}
				</div>
				<div
					class="flex-1 text-center font-bold text-sm py-2 border-l border-gray-600 dark:border-gray-100"
				>
					{$i18n.t("Size")}
				</div>
				<div
					class="flex-1 text-center font-bold text-sm py-2 border-l border-gray-600 dark:border-gray-100"
				>
					{$i18n.t("Duration")}
				</div>
				<div
					class="flex-1 text-center font-bold text-sm py-2 border-l border-gray-600 dark:border-gray-100"
				>
					{$i18n.t("Price")}
				</div>
			</div>
			{#each $models as item, index}
				<div
					class="flex flex-row justify-center items-center border-t border-l border-r border-gray-600 dark:border-gray-100
					{index == $models.length - 1 ? 'border-b rounded-b-lg' : ''}"
				>
					<div
						class="flex flex-col justify-center items-center text-sm py-2 md:w-[150px] w-[100px] px-1"
					>
						<div class="text-center">{item.name}</div>
						<div>
							{#if item?.audio}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 1024 1024"
									version="1.1"
									fill="currentColor"
									class="size-5 ml-1"
								>
									<path
										d="M85.333333 701.653333h165.930667l225.877333 184.832A21.333333 21.333333 0 0 0 512 869.973333V192a21.333333 21.333333 0 0 0-34.858667-16.512L251.306667 360.32H85.333333a42.666667 42.666667 0 0 0-42.666666 42.666667v256a42.666667 42.666667 0 0 0 42.666666 42.666666z m896-170.666666c0 140.458667-61.696 266.496-159.488 352.512l-60.501333-60.501334A383.146667 383.146667 0 0 0 896 530.986667 383.146667 383.146667 0 0 0 761.386667 238.933333l60.458666-60.458666A468.224 468.224 0 0 1 981.333333 530.986667z m-213.333333 0a255.573333 255.573333 0 0 0-97.578667-201.088L609.450667 390.826667A170.496 170.496 0 0 1 682.666667 530.986667c0 58.026667-28.970667 109.269333-73.216 140.117333l61.013333 60.970667A255.573333 255.573333 0 0 0 768 530.986667z"
									/>
								</svg>
							{:else}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 1024 1024"
									version="1.1"
									fill="currentColor"
									class="size-5 ml-1"
								>
									<path
										d="M251.264 701.653333H85.333333a42.666667 42.666667 0 0 1-42.666666-42.666666v-256a42.666667 42.666667 0 0 1 42.666666-42.666667h165.930667l225.877333-184.832A21.333333 21.333333 0 0 1 512 192v677.973333a21.333333 21.333333 0 0 1-34.858667 16.512L251.306667 701.653333z m619.733333-170.666666l150.869334 150.826666-60.373334 60.373334L810.666667 591.317333l-150.869334 150.869334-60.330666-60.373334 150.869333-150.826666-150.869333-150.869334 60.330666-60.330666L810.666667 470.656l150.826666-150.869333L1021.866667 380.16l-150.869334 150.869333z"
									/>
								</svg>
							{/if}
						</div>
					</div>
					<div class="flex-1 flex flex-col w-full">
						{#each item?.size as sitem, sindex}
							<div
								class="flex flex-row w-full items-center border-b border-l border-gray-600 dark:border-gray-100
								{sindex == item.size.length - 1 ? 'border-b-0' : ''}"
							>
								<div class="flex-1 flex justify-center">{sitem}</div>
								<div class="flex-1">
									{#each item?.duration as ditem, dindex}
										<div
											class="flex justify-center {dindex ==
											item?.duration.length - 1
												? ''
												: 'border-b'} border-l border-gray-600 dark:border-gray-100 py-1"
										>
											{ditem}s
										</div>
									{/each}
								</div>
								<div class="flex-1">
									{#each Object.entries(item?.amount) as [key, avals]}
										{#if sitem.includes(key) || key == "*"}
											{#each avals as aitem, aindex}
												<div
													class="flex justify-center {aindex == avals.length - 1
														? ''
														: 'border-b'} border-l border-gray-600 dark:border-gray-100 py-1"
												>
													${aitem}
												</div>
											{/each}
										{/if}
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
</Modal>
