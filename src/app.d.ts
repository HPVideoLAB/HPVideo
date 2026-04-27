// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
	}

	// Vite `define` injection — see vite.config.ts. The JSON-stringified
	// value is the package.json version at build time, used by
	// $lib/constants.ts for WEBUI_VERSION.
	const APP_VERSION: string;
}

export {};
