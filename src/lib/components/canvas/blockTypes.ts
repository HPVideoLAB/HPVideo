/**
 * Single source of truth for block types displayed in the canvas.
 * Used by:
 *   - Palette.svelte (the draggable list on the left)
 *   - +page.svelte (creating new nodes from drop events)
 *   - Inspector.svelte (showing the right config UI per type)
 *   - BlockCard.svelte (color tokens via typeKey)
 *
 * Adding a new block type means:
 *   1. Add an entry below
 *   2. Wire its config schema into Inspector.svelte
 *   3. (Eventually) wire its execution into the canvas.py runner
 */

export type TypeKey = 'imageref' | 'prompt' | 'imagegen' | 'videogen' | 'voice' | 'stitcher';

export type BlockTypeDef = {
	key: TypeKey;
	name: string;        // shown in palette + new-block title
	desc: string;        // shown in palette item subtitle
	icon: string;        // emoji used in BlockCard header
	color: string;       // hex
	costEstimate: number; // credits, 0 for free
	hasIn: boolean;
	hasOut: boolean;
	locked?: boolean;    // greyed out in palette (e.g. v1.0 only)
};

export const BLOCK_TYPES: BlockTypeDef[] = [
	{
		key: 'imageref',
		name: 'Image Reference',
		desc: 'Upload a photo',
		icon: '📷',
		color: '#4ec3d9',
		costEstimate: 0,
		hasIn: false,
		hasOut: true,
	},
	{
		key: 'prompt',
		name: 'Text Prompt',
		desc: 'Free-text input',
		icon: '📝',
		color: '#e5b53c',
		costEstimate: 0,
		hasIn: false,
		hasOut: true,
	},
	{
		key: 'imagegen',
		name: 'Image Gen',
		desc: 'Flux Dev · 100 cr',
		icon: '🎨',
		color: '#f06fb5',
		costEstimate: 100,
		hasIn: true,
		hasOut: true,
	},
	{
		key: 'videogen',
		name: 'Video Gen',
		desc: '9 models · 450+ cr',
		icon: '🎬',
		color: '#c213f2',
		costEstimate: 1500,
		hasIn: true,
		hasOut: true,
	},
	{
		key: 'voice',
		name: 'Voice (TTS)',
		desc: 'v1.0',
		icon: '🎙',
		color: '#36c47b',
		costEstimate: 200,
		hasIn: true,
		hasOut: true,
		locked: true,
	},
	{
		key: 'stitcher',
		name: 'Stitcher',
		desc: 'Concat clips → MP4',
		icon: '⏯',
		color: '#ff8a3d',
		costEstimate: 0,
		hasIn: true,
		hasOut: false,
	},
];

export const BLOCK_TYPE_BY_KEY = Object.fromEntries(
	BLOCK_TYPES.map((t) => [t.key, t])
) as Record<TypeKey, BlockTypeDef>;

/**
 * Build a fresh node-data object for a given type. The numbering is
 * deduped against existing nodes so the second imagegen becomes #2.
 */
export function makeNodeData(typeKey: TypeKey, existingNodes: Array<any>) {
	const def = BLOCK_TYPE_BY_KEY[typeKey];
	const num =
		existingNodes.filter((n) => n.data?.typeKey === typeKey).length + 1;
	return {
		title: def.name,
		num,
		typeKey,
		icon: def.icon,
		state: 'ready' as const,
		cost: def.costEstimate,
		hasIn: def.hasIn,
		hasOut: def.hasOut,
		// Per-type config defaults (filled out as Inspector handles each type).
		config: defaultConfig(typeKey),
	};
}

export function defaultConfig(typeKey: TypeKey): Record<string, any> {
	switch (typeKey) {
		case 'imagegen':
			return { model: 'flux-dev', aspect: '16:9', seed: 'random' };
		case 'videogen':
			return { model: 'wan-2.7', duration: 5, resolution: '720p', seed: 'random' };
		case 'prompt':
			return { text: '' };
		case 'voice':
			return { model: 'eleven-rachel', text: '' };
		case 'stitcher':
			return { transitions: 'cut' };
		default:
			return {};
	}
}
