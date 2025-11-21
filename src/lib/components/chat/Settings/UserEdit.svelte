<script lang="ts">
	import { onMount, getContext } from "svelte";
	import { user, theme } from "$lib/stores";
	import { generateInitialsImage, canvasPixelTest } from "$lib/utils";
	import { DropdownMenu } from "bits-ui";
	import ChevronDown from "$lib/components/icons/ChevronDown.svelte";
	import { getLanguages } from "$lib/i18n";
	import { toast } from "svelte-sonner";
	import { updateUserProfile } from "$lib/apis/auths";
	import { updateUserLanguage } from "$lib/apis/users";

	const i18n = getContext("i18n");

	export let saveHandler: Function;

	let profileImageInputElement: HTMLInputElement;
	let profileImageUrl = "";
	let name = "";

	// General
	let themes = [
		"dark",
		"light",
		"rose-pine dark",
		"rose-pine-dawn light",
		"oled-dark",
	];
	let selectedTheme = "light";
	let themeshow = false;
	const themeChangeHandler = (_theme: string) => {
		theme.set(_theme);
		localStorage.setItem("theme", _theme);
		if (_theme.includes("oled")) {
			document.documentElement.style.setProperty("--color-gray-900", "#000000");
			document.documentElement.style.setProperty("--color-gray-950", "#000000");
			document.documentElement.classList.add("dark");
		}
		applyTheme(_theme);
		selectedTheme = localStorage.theme ?? "light";
		themeshow = false;
	};
	const applyTheme = (_theme: string) => {
		let themeToApply = _theme === "oled-dark" ? "dark" : _theme;

		if (_theme === "system") {
			themeToApply = window.matchMedia("(prefers-color-scheme: dark)").matches
				? "dark"
				: "light";
		}

		if (themeToApply === "dark" && !_theme.includes("oled")) {
			document.documentElement.style.setProperty("--color-gray-900", "#171717");
			document.documentElement.style.setProperty("--color-gray-950", "#0d0d0d");
		}

		themes
			.filter((e) => e !== themeToApply)
			.forEach((e) => {
				e.split(" ").forEach((e) => {
					document.documentElement.classList.remove(e);
				});
			});

		themeToApply.split(" ").forEach((e) => {
			document.documentElement.classList.add(e);
		});

		console.log(_theme);
	};

	let languages: any[] = [];
	let lang = $i18n.language;
	let languageshow = false;
	let langmt = 0;
	let langselView: any;
	$: if (languageshow) {
		if (langselView) {
			const rect = langselView.getBoundingClientRect();
			if (rect.top < 380) {
				langmt = 400 - rect.top;
			} else {
				langmt = 0;
			}
		}
	}

	const submitHandler = async () => {
		if (name !== $user.name) {
			if (name.length < 3) {
				toast.error(
					$i18n.t("The length of the name cannot be less than 3 characters")
				);
				return false;
			}
			if (name.length > 12) {
				toast.error(
					$i18n.t("The length of the name cannot exceed 12 characters")
				);
				return false;
			}
			profileImageUrl = generateInitialsImage(name);
		}

		const updatedUser = await updateUserProfile(
			localStorage.token,
			name,
			profileImageUrl
		).catch((error) => {
			toast.error(error);
		});

		if (updatedUser) {
			// await user.set(updatedUser);
			return true;
		}
		return false;
	};

	onMount(async () => {
		name = $user.name;
		profileImageUrl = $user.profile_image_url;
		languages = await getLanguages();
		selectedTheme = $theme;
	});
</script>

<div>
	<div class=" space-y-3 pr-1.5 overflow-y-scroll max-h-[25rem]">
		<input
			id="profile-image-input"
			bind:this={profileImageInputElement}
			type="file"
			hidden
			accept="image/*"
			on:change={(e) => {
				const files = profileImageInputElement.files ?? [];
				let reader = new FileReader();
				reader.onload = (event) => {
					let originalImageUrl = `${event.target.result}`;

					const img = new Image();
					img.src = originalImageUrl;

					img.onload = function () {
						const canvas = document.createElement("canvas");
						const ctx = canvas.getContext("2d");

						// Calculate the aspect ratio of the image
						const aspectRatio = img.width / img.height;

						// Calculate the new width and height to fit within 100x100
						let newWidth, newHeight;
						if (aspectRatio > 1) {
							newWidth = 100 * aspectRatio;
							newHeight = 100;
						} else {
							newWidth = 100;
							newHeight = 100 / aspectRatio;
						}

						// Set the canvas size
						canvas.width = 100;
						canvas.height = 100;

						// Calculate the position to center the image
						const offsetX = (100 - newWidth) / 2;
						const offsetY = (100 - newHeight) / 2;

						// Draw the image on the canvas
						ctx.drawImage(img, offsetX, offsetY, newWidth, newHeight);

						// Get the base64 representation of the compressed image
						const compressedSrc = canvas.toDataURL("image/jpeg");

						// Display the compressed image
						profileImageUrl = compressedSrc;

						profileImageInputElement.files = null;
					};
				};

				if (
					files.length > 0 &&
					["image/gif", "image/webp", "image/jpeg", "image/png"].includes(
						files[0]["type"]
					)
				) {
					reader.readAsDataURL(files[0]);
				}
			}}
		/>

		<div class="space-y-1">
			<!-- <div class=" text-sm font-medium">{$i18n.t('Account')}</div> -->

			<div class="flex space-x-2 items-center">
				<div class="flex flex-col">
					<div class="self-center mt-2">
						<button
							class="relative rounded-full dark:bg-gray-700"
							type="button"
						>
							<img
								src={profileImageUrl == ""
									? generateInitialsImage(name)
									: profileImageUrl}
								alt="profile"
								class=" rounded-full size-10 object-cover"
							/>
						</button>
					</div>
				</div>

				<div class="flex-1 flex flex-col self-center gap-0.5">
					<div class=" mb-0.5 text-sm font-medium">
						{$i18n.t("Profile Image")}
					</div>
					<div>
						<button
							class=" text-xs text-center text-gray-800 dark:text-gray-400 rounded-md pr-4 py-0.5 bg-gray-100 dark:bg-gray-850"
							on:click={async () => {
								if (canvasPixelTest()) {
									profileImageUrl = generateInitialsImage(name);
								} else {
									toast.info(
										$i18n.t(
											"Fingerprint spoofing detected: Unable to use initials as avatar. Defaulting to default profile image."
										),
										{
											duration: 1000 * 10,
										}
									);
								}
							}}>{$i18n.t("Use Initials")}</button
						>

						<button
							class=" text-xs text-center text-gray-800 dark:text-gray-400 rounded-md pr-4 py-0.5 bg-gray-100 dark:bg-gray-850"
							on:click={async () => {
								const url = "/creator/static/default_headimg.jpg";

								profileImageUrl = url;
							}}>{$i18n.t("Use Gravatar")}</button
						>
					</div>
				</div>

				<div class="flex justify-center py-5 text-sm font-medium">
					<button
						class="px-6 w-full py-1.5 primaryButton text-gray-100 transition rounded-lg"
						on:click={async () => {
							const res = await submitHandler();
							if (res) {
								saveHandler();
								user.set({
									...$user,
									name: name,
									profile_image_url: profileImageUrl,
								});
							}
						}}
					>
						{$i18n.t("Save")}
					</button>
				</div>
			</div>

			<hr class=" dark:border-gray-800 my-4" />

			<div class="pt-2 pb-0">
				<div class="flex flex-row items-center w-full bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg">
					<div class="text-sm font-medium mx-2">{$i18n.t("Name")}:</div>
					<div class="flex-1">
						<input
							class="w-full rounded-lg py-1 px-4 text-sm dark:text-gray-300 dark:bg-gray-850 outline-none"
							type="text"
							bind:value={name}
							required
						/>
					</div>
				</div>
			</div>
			
			<div class="py-1">
				<div class="flex w-full justify-between bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg h-[30px]">
					<div class=" self-center text-sm font-medium mx-2">
						{$i18n.t("Theme")}
					</div>
					<div class="flex items-center">
						<DropdownMenu.Root bind:open={themeshow}>
							<DropdownMenu.Trigger>
								<div class="flex flex-row justify-end mr-1">
									<span class="text-sm overflow-hidden">
										{#if selectedTheme == "system"}
											⚙️ {$i18n.t("System")}
										{:else if selectedTheme == "dark"}
											🌑 {$i18n.t("Dark")}
										{:else if selectedTheme == "oled-dark"}
											🌃 {$i18n.t("OLED Dark")}
										{:else}
											☀️ {$i18n.t("Light")}
										{/if}
									</span>
									<ChevronDown
										className=" self-center ml-2 size-3"
										strokeWidth="2.5"
									/>
								</div>
							</DropdownMenu.Trigger>
							<DropdownMenu.Content
								class="z-[10000] rounded-md  bg-white dark:bg-gray-850 dark:text-white 
								shadow-lg border border-gray-300/30 dark:border-gray-700/50  outline-none mt-2"
								side="bottom-end"
							>
								<slot>
									<div class="flex flex-col px-1 py-2">
										<button
											class="flex justify-between items-center cursor-pointer w-full hover:bg-gray-100 dark:hover:bg-gray-800 py-1 px-6 rounded-lg"
											on:click={() => {
												themeChangeHandler("system");
											}}
										>
											<span class="text-sm">⚙️ {$i18n.t("System")}</span>
										</button>
										<button
											class="flex justify-between items-center cursor-pointer w-full hover:bg-gray-100 dark:hover:bg-gray-800 py-1 px-6 rounded-lg"
											on:click={() => {
												themeChangeHandler("dark");
											}}
										>
											<span class="text-sm">🌑 {$i18n.t("Dark")}</span>
										</button>
										<button
											class="flex justify-between items-center cursor-pointer w-full hover:bg-gray-100 dark:hover:bg-gray-800 py-1 px-6 rounded-lg"
											on:click={() => {
												themeChangeHandler("oled-dark");
											}}
										>
											<span class="text-sm">🌃 {$i18n.t("OLED Dark")}</span>
										</button>
										<button
											class="flex justify-between items-center cursor-pointer w-full hover:bg-gray-100 dark:hover:bg-gray-800 py-1 px-6 rounded-lg"
											on:click={() => {
												themeChangeHandler("light");
											}}
										>
											<span class="text-sm">☀️ {$i18n.t("Light")}</span>
										</button>
									</div>
									<div class="hidden w-[42rem]" />
									<div class="hidden w-[32rem]" />
								</slot>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</div>
				</div>
			</div>

			<div class="pb-2">
				<div class=" flex w-full justify-between bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg h-[30px]">
					<div class=" self-center text-xs font-medium mx-2">
						{$i18n.t("Language")}
					</div>
					<div bind:this={langselView} class="flex items-center">
						<DropdownMenu.Root bind:open={languageshow}>
							<DropdownMenu.Trigger>
								<div class="flex flex-row justify-end mr-1">
									<span class="text-sm overflow-hidden">
										{#each languages as language}
											{#if language["code"] == lang}
												{language["title"]}
											{/if}
										{/each}
									</span>
									<ChevronDown
										className=" self-center ml-2 size-3"
										strokeWidth="2.5"
									/>
								</div>
							</DropdownMenu.Trigger>
							<DropdownMenu.Content
								class="z-[10000] rounded-md  bg-white dark:bg-gray-850 dark:text-white 
								shadow-lg border border-gray-300/30 dark:border-gray-700/50  outline-none mt-2"
								avoidCollisions={true}
								collisionPadding={10}
								side="bottom-end"
							>
								<slot>
									<div class="flex flex-col px-1 py-2">
										{#each languages as language}
											<button
												class="flex justify-between items-center cursor-pointer w-full hover:bg-gray-100 dark:hover:bg-gray-800 py-1 px-6 rounded-lg"
												on:click={() => {
													lang = language["code"];
													$i18n.changeLanguage(lang);
													updateUserLanguage(localStorage.token, lang);
													languageshow = false;
												}}
											>
												<span class="text-sm">{language["title"]}</span>
											</button>
										{/each}
									</div>
									<div class="hidden w-[42rem]" />
									<div class="hidden w-[32rem]" />
								</slot>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
