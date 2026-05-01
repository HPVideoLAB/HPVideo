<!--
  Inspector.svelte — right sidebar showing config for the selected block.
  Edits the node.data.config in place via two-way binding through events.

  This is the v0.2 cut: simple selects + inputs, no advanced features
  like reference-image upload preview, prompt suggestions, etc.
-->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { BLOCK_TYPE_BY_KEY, type TypeKey } from './blockTypes';

	export let node: any | null = null;

	const dispatch = createEventDispatcher<{
		update: { id: string; config: Record<string, any> };
		runBlock: { id: string };
		duplicate: { id: string };
		delete: { id: string };
	}>();

	$: typeKey = (node?.data?.typeKey as TypeKey) || null;
	$: typeDef = typeKey ? BLOCK_TYPE_BY_KEY[typeKey] : null;
	$: config = (node?.data?.config as Record<string, any>) || {};

	function update(patch: Record<string, any>) {
		if (!node) return;
		dispatch('update', { id: node.id, config: { ...config, ...patch } });
	}

	// Helpers for input handlers — Svelte 4's parser rejects
	// `valueOf(e)` syntax inline in
	// attributes, so we keep the cast at function level.
	function valueOf(ev: Event): string {
		return (ev.currentTarget as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)?.value ?? '';
	}
	function numberValueOf(ev: Event): number {
		return Number(valueOf(ev));
	}

	const VIDEO_MODELS = [
		{ key: 'wan-2.7', label: 'WAN 2.7 — photoreal · $1.50' },
		{ key: 'seedance-2.0', label: 'Seedance 2.0 — fast · $0.60' },
		{ key: 'ovi', label: 'OVI — characters · $0.45' },
		{ key: 'hailuo-2.3', label: 'Hailuo 2.3 — motion · $0.69' },
		{ key: 'veo3.1', label: 'Veo 3.1 — flagship · $9.60' },
		{ key: 'pixverse-v6', label: 'Pixverse V6 — stylized · $1.20' },
		{ key: 'kling-3.0', label: 'Kling 3.0 — cinematic · $8.40' }
	];

	const VIDEO_RES_OPTIONS = [
		{ key: '480p', label: '480p — 750 cr' },
		{ key: '720p', label: '720p — 1,500 cr' },
		{ key: '1080p', label: '1080p — 4,500 cr' }
	];

	const VIDEO_RES_COSTS: Record<string, number> = {
		'480p': 750,
		'720p': 1500,
		'1080p': 4500
	};

	// When videogen resolution changes, also propagate the new cost up.
	// Single dispatch so the parent peels off `_newCost` from config and
	// persists in one Svelte tick — previous double-dispatch was a race
	// waiting to fire when Svelte's reactivity batching changes (e.g.
	// Svelte 5 migration). Parent (+page.svelte:147) destructures
	// `_newCost` out of the config patch.
	function onResolutionChange(newRes: string) {
		if (!node) return;
		const newCost = VIDEO_RES_COSTS[newRes] || 1500;
		dispatch('update', {
			id: node.id,
			config: { ...config, resolution: newRes, _newCost: newCost }
		} as any);
	}
</script>

<aside class="inspector">
	{#if !node}
		<div class="empty">
			<div class="empty-icon">→</div>
			<div class="empty-title">Click a block to edit</div>
			<div class="empty-desc">Or drag a new one in from the palette on the left.</div>
		</div>
	{:else if typeDef}
		<div class="head">
			<div class="strip" style="background:{typeDef.color}"></div>
			<div class="title">
				{typeDef.name}
				<span class="num">#{node.data.num}</span>
			</div>
		</div>

		<div class="body">
			{#if typeKey === 'imagegen'}
				<div class="field-group">
					<label>Model</label>
					<select
						value={config.model ?? 'flux-dev'}
						on:change={(e) => update({ model: valueOf(e) })}
					>
						<option value="flux-dev">Flux Dev — 100 cr</option>
					</select>
				</div>
				<div class="field-group">
					<label>Aspect</label>
					<select
						value={config.aspect ?? '16:9'}
						on:change={(e) => update({ aspect: valueOf(e) })}
					>
						<option>16:9</option>
						<option>9:16</option>
						<option>1:1</option>
					</select>
				</div>
			{:else if typeKey === 'videogen'}
				<div class="field-group">
					<label>Model</label>
					<select
						value={config.model ?? 'wan-2.7'}
						on:change={(e) => update({ model: valueOf(e) })}
					>
						{#each VIDEO_MODELS as m (m.key)}
							<option value={m.key}>{m.label}</option>
						{/each}
					</select>
				</div>
				<div class="field-group">
					<label>Duration</label>
					<input
						type="range"
						min="3"
						max="10"
						value={config.duration ?? 5}
						on:input={(e) => update({ duration: Number(valueOf(e)) })}
					/>
					<div class="row-end">
						<span>{config.duration ?? 5}s</span>
					</div>
				</div>
				<div class="field-group">
					<label>Resolution</label>
					<div class="seg">
						{#each VIDEO_RES_OPTIONS as r (r.key)}
							<button
								class:active={(config.resolution ?? '720p') === r.key}
								on:click={() => onResolutionChange(r.key)}
								type="button"
							>
								{r.label}
							</button>
						{/each}
					</div>
				</div>
				<div class="field-group">
					<label>Seed</label>
					<input
						type="text"
						value={config.seed ?? 'random'}
						on:change={(e) => update({ seed: valueOf(e) })}
					/>
					<div class="hint">Lock to keep variations consistent.</div>
				</div>
			{:else if typeKey === 'prompt'}
				<div class="field-group">
					<label>Prompt text</label>
					<textarea
						rows="6"
						value={config.text ?? ''}
						on:input={(e) => update({ text: valueOf(e) })}
						placeholder="Cinematic product hero shot of __, dramatic side lighting, shallow depth of field, ultra-realistic"
					></textarea>
					<div class="hint">Wired to any block whose Prompt source is "From wire".</div>
				</div>
			{:else if typeKey === 'imageref'}
				<div class="field-group">
					<label>Reference image</label>
					<button class="upload-btn" disabled>Upload (v0.3) ↑</button>
					<div class="hint">For now, file upload arrives in the next iteration.</div>
				</div>
			{:else if typeKey === 'stitcher'}
				<div class="field-group">
					<label>Transitions</label>
					<select
						value={config.transitions ?? 'cut'}
						on:change={(e) => update({ transitions: valueOf(e) })}
					>
						<option value="cut">Hard cut (no transition)</option>
						<option value="crossfade">Crossfade (v0.3)</option>
					</select>
				</div>
			{:else if typeKey === 'voice'}
				<div class="field-group">
					<label>Voice</label>
					<div class="hint">Voice generation lands in v1.0.</div>
				</div>
			{/if}
		</div>

		<div class="actions">
			<button class="btn primary" disabled title="Coming in v0.2 backend">
				▶ Run this block · {node.data.cost.toLocaleString()} cr
			</button>
			<button class="btn" on:click={() => dispatch('duplicate', { id: node.id })}>
				Duplicate
			</button>
			<button class="btn danger" on:click={() => dispatch('delete', { id: node.id })}>
				Delete block
			</button>
		</div>
	{/if}
</aside>

<style>
	.inspector {
		width: 320px;
		background: rgba(13, 10, 28, 0.6);
		backdrop-filter: blur(12px);
		border-left: 1px solid rgba(255, 255, 255, 0.06);
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
	}
	.empty {
		padding: 32px 24px;
		text-align: center;
		color: #6b6884;
	}
	.empty-icon {
		font-size: 24px;
		opacity: 0.4;
		margin-bottom: 12px;
	}
	.empty-title {
		font-size: 14px;
		font-weight: 600;
		color: #a6a2bc;
		margin-bottom: 6px;
	}
	.empty-desc {
		font-size: 12px;
		line-height: 1.5;
	}
	.head {
		padding: 14px 18px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.strip {
		width: 4px;
		height: 20px;
		border-radius: 2px;
	}
	.title {
		font-size: 13px;
		font-weight: 600;
		color: #fff;
	}
	.num {
		color: #6b6884;
		font-weight: 500;
		font-family: ui-monospace, monospace;
		margin-left: 4px;
	}
	.body {
		flex: 1;
		overflow-y: auto;
		padding: 16px 18px;
	}
	.field-group {
		margin-bottom: 18px;
	}
	.field-group label {
		display: block;
		font-size: 11px;
		color: #6b6884;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-bottom: 7px;
		font-weight: 600;
	}
	.field-group select,
	.field-group input[type='text'],
	.field-group textarea {
		width: 100%;
		padding: 9px 11px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 8px;
		color: #fff;
		font-size: 13px;
		outline: none;
		font-family: inherit;
		resize: vertical;
	}
	.field-group select:focus,
	.field-group input:focus,
	.field-group textarea:focus {
		border-color: #c213f2;
	}
	.field-group input[type='range'] {
		width: 100%;
		accent-color: #c213f2;
	}
	.row-end {
		text-align: right;
		font-size: 13px;
		font-weight: 700;
		color: #fff;
		font-variant-numeric: tabular-nums;
		margin-top: 4px;
	}
	.hint {
		font-size: 11px;
		color: #6b6884;
		margin-top: 6px;
		line-height: 1.4;
	}
	.seg {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 4px;
		background: rgba(255, 255, 255, 0.04);
		padding: 4px;
		border-radius: 8px;
	}
	.seg button {
		background: transparent;
		border: 0;
		color: #a6a2bc;
		font-size: 11px;
		font-weight: 500;
		padding: 6px 4px;
		border-radius: 6px;
		cursor: pointer;
		font-family: inherit;
	}
	.seg button.active {
		background: rgba(194, 19, 242, 0.2);
		color: #fff;
	}
	.upload-btn {
		width: 100%;
		padding: 9px 11px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px dashed rgba(255, 255, 255, 0.15);
		border-radius: 8px;
		color: #a6a2bc;
		font-size: 13px;
		cursor: not-allowed;
		font-family: inherit;
	}
	.actions {
		padding: 12px 18px;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.btn {
		padding: 9px 12px;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.04);
		color: #e5e3f0;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		font-family: inherit;
		text-align: center;
	}
	.btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.07);
	}
	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.btn.primary {
		background: linear-gradient(90deg, #c213f2, #8a2ce6);
		border-color: transparent;
		color: white;
		font-weight: 600;
		box-shadow: 0 4px 12px rgba(194, 19, 242, 0.3);
	}
	.btn.danger {
		color: #ef4444;
		border-color: rgba(239, 68, 68, 0.25);
	}
	.btn.danger:hover {
		background: rgba(239, 68, 68, 0.1);
	}
</style>
