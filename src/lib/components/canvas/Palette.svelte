<!--
  Palette.svelte — left sidebar with draggable block types.
  Drag any item onto the canvas; +page.svelte's onDrop creates the node.

  Drag protocol: we set `application/hpvideo-canvas-block` to the
  TypeKey string. The drop handler on the canvas reads that and calls
  makeNodeData() from blockTypes.ts.
-->
<script lang="ts">
	import { getContext } from 'svelte';
	import { BLOCK_TYPES, type TypeKey } from './blockTypes';

	const i18n: any = getContext('i18n');

	function onDragStart(ev: DragEvent, key: TypeKey, locked: boolean) {
		if (locked || !ev.dataTransfer) {
			ev.preventDefault();
			return;
		}
		ev.dataTransfer.setData('application/hpvideo-canvas-block', key);
		ev.dataTransfer.effectAllowed = 'move';
	}

	let search = '';
	$: filtered = BLOCK_TYPES.filter(
		(t) =>
			t.name.toLowerCase().includes(search.toLowerCase()) ||
			t.desc.toLowerCase().includes(search.toLowerCase())
	);
</script>

<aside class="palette">
	<div class="search">
		<input bind:value={search} placeholder={$i18n.t('Search blocks…')} type="text" />
	</div>

	<div class="section-title">{$i18n.t('Inputs')}</div>
	{#each filtered.filter((t) => !t.hasIn) as t (t.key)}
		<div
			class="item"
			class:locked={t.locked}
			draggable={!t.locked}
			on:dragstart={(e) => onDragStart(e, t.key, !!t.locked)}
		>
			<div class="icon" style="background:{t.color}">{t.icon}</div>
			<div class="meta">
				<div class="name">{$i18n.t(t.name)}</div>
				<div class="desc">{$i18n.t(t.desc)}</div>
			</div>
			{#if t.locked}<span class="lock">🔒</span>{/if}
		</div>
	{/each}

	<div class="section-title">{$i18n.t('Generators')}</div>
	{#each filtered.filter((t) => t.hasIn && t.hasOut) as t (t.key)}
		<div
			class="item"
			class:locked={t.locked}
			draggable={!t.locked}
			on:dragstart={(e) => onDragStart(e, t.key, !!t.locked)}
		>
			<div class="icon" style="background:{t.color}">{t.icon}</div>
			<div class="meta">
				<div class="name">{$i18n.t(t.name)}</div>
				<div class="desc">{$i18n.t(t.desc)}</div>
			</div>
			{#if t.locked}<span class="lock">🔒</span>{/if}
		</div>
	{/each}

	<div class="section-title">{$i18n.t('Composers')}</div>
	{#each filtered.filter((t) => t.hasIn && !t.hasOut) as t (t.key)}
		<div
			class="item"
			class:locked={t.locked}
			draggable={!t.locked}
			on:dragstart={(e) => onDragStart(e, t.key, !!t.locked)}
		>
			<div class="icon" style="background:{t.color}">{t.icon}</div>
			<div class="meta">
				<div class="name">{$i18n.t(t.name)}</div>
				<div class="desc">{$i18n.t(t.desc)}</div>
			</div>
		</div>
	{/each}

	{#if filtered.length === 0}
		<div class="empty">{$i18n.t('No blocks match "{{q}}"', { q: search })}</div>
	{/if}
</aside>

<style>
	.palette {
		width: 240px;
		background: rgba(13, 10, 28, 0.6);
		backdrop-filter: blur(12px);
		border-right: 1px solid rgba(255, 255, 255, 0.06);
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
		overflow-y: auto;
	}
	.search {
		padding: 12px 14px 0;
	}
	.search input {
		width: 100%;
		padding: 8px 10px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		color: #e5e3f0;
		font-size: 13px;
		border-radius: 8px;
		outline: none;
		font-family: inherit;
	}
	.search input::placeholder {
		color: #6b6884;
	}
	.search input:focus {
		border-color: #c213f2;
	}
	.section-title {
		padding: 14px 16px 8px;
		font-size: 10px;
		font-weight: 600;
		color: #6b6884;
		letter-spacing: 0.7px;
		text-transform: uppercase;
	}
	.item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 12px;
		margin: 0 8px 2px;
		border-radius: 10px;
		cursor: grab;
		transition: background 0.15s;
	}
	.item:hover:not(.locked) {
		background: rgba(255, 255, 255, 0.05);
	}
	.item.locked {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.item:active:not(.locked) {
		cursor: grabbing;
	}
	.icon {
		width: 30px;
		height: 30px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 14px;
		color: white;
		flex-shrink: 0;
	}
	.meta {
		min-width: 0;
		flex: 1;
	}
	.name {
		font-size: 13px;
		font-weight: 600;
		color: #fff;
	}
	.desc {
		font-size: 11px;
		color: #6b6884;
		margin-top: 1px;
	}
	.lock {
		font-size: 11px;
		opacity: 0.6;
	}
	.empty {
		padding: 24px 16px;
		font-size: 12px;
		color: #6b6884;
		text-align: center;
		font-style: italic;
	}
</style>
