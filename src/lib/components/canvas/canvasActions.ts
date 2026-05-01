/**
 * Canvas inter-component action store.
 *
 * BlockCard nodes are mounted inside xyflow's SvelteFlow component, not
 * directly by the canvas page, so Svelte's `createEventDispatcher` doesn't
 * give us a clean parent listener. Instead, BlockCard writes an action
 * record here and the page subscribes — when an entry appears, the page
 * runs the action (retry, skip, re-run) and clears the slot.
 *
 * Single-slot is intentional. Two simultaneous block actions in flight
 * would race the executor; the page guards Run All concurrency, and the
 * same lock applies here.
 */
import { writable } from 'svelte/store';

export type CanvasAction =
	| { type: 'retry'; id: string }
	| { type: 'skip'; id: string }
	| { type: 'rerun'; id: string };

export const pendingAction = writable<CanvasAction | null>(null);
