<!--
  TemplatesMenu.svelte — dropdown menu in the topbar with the 3 starter
  templates. Selecting one fires a `load` event with the template id;
  the page applies it (replacing the current canvas, after confirm).
-->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { TEMPLATES } from './templates';

	const dispatch = createEventDispatcher<{ load: { id: string } }>();

	let open = false;

	function toggle() {
		open = !open;
	}
	function close() {
		open = false;
	}
	function pick(id: string) {
		dispatch('load', { id });
		close();
	}
</script>

<svelte:window on:click={close} />

<div class="wrap">
	<button class="trigger" on:click|stopPropagation={toggle}>
		<span>Templates</span>
		<span class="chev" class:open>▾</span>
	</button>

	{#if open}
		<div class="menu" on:click|stopPropagation>
			<div class="head">Start from a template</div>
			{#each TEMPLATES as t (t.id)}
				<button class="item" on:click={() => pick(t.id)}>
					<div class="icon">{t.icon}</div>
					<div class="meta">
						<div class="name">
							{t.name}
							{#if t.tag === 'popular'}<span class="tag tag-popular">⚡ Popular</span>{/if}
							{#if t.tag === 'beginner'}<span class="tag tag-beginner">Beginner</span>{/if}
						</div>
						<div class="desc">{t.description}</div>
						<div class="cost">~{t.estimatedCostCr.toLocaleString()} cr</div>
					</div>
				</button>
			{/each}
			<div class="foot">
				<a href="https://hpvideo.io/canvas-mockup-v2-templates.html" target="_blank">
					Browse all templates →
				</a>
			</div>
		</div>
	{/if}
</div>

<style>
	.wrap {
		position: relative;
	}
	.trigger {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 14px;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.03);
		color: #e5e3f0;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		font-family: inherit;
	}
	.trigger:hover {
		background: rgba(255, 255, 255, 0.06);
	}
	.chev {
		font-size: 9px;
		opacity: 0.6;
		transition: transform 0.15s;
	}
	.chev.open {
		transform: rotate(180deg);
	}
	.menu {
		position: absolute;
		top: calc(100% + 6px);
		right: 0;
		min-width: 360px;
		background: #15102a;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
		z-index: 200;
		overflow: hidden;
	}
	.head {
		padding: 12px 16px 8px;
		font-size: 11px;
		font-weight: 600;
		color: #6b6884;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}
	.item {
		display: flex;
		gap: 12px;
		width: 100%;
		padding: 12px 16px;
		background: transparent;
		border: 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
		text-align: left;
		cursor: pointer;
		color: inherit;
		font-family: inherit;
	}
	.item:last-of-type {
		border-bottom: 0;
	}
	.item:hover {
		background: rgba(194, 19, 242, 0.08);
	}
	.icon {
		width: 36px;
		height: 36px;
		border-radius: 8px;
		background: rgba(194, 19, 242, 0.15);
		color: #fff;
		font-size: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
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
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}
	.tag {
		font-size: 9px;
		font-weight: 700;
		padding: 2px 6px;
		border-radius: 999px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	.tag-popular {
		background: rgba(194, 19, 242, 0.2);
		color: #c213f2;
	}
	.tag-beginner {
		background: rgba(54, 196, 123, 0.2);
		color: #36c47b;
	}
	.desc {
		font-size: 12px;
		color: #a6a2bc;
		margin-top: 2px;
		line-height: 1.4;
	}
	.cost {
		font-size: 11px;
		color: #c213f2;
		font-weight: 600;
		margin-top: 4px;
	}
	.foot {
		padding: 10px 16px;
		text-align: center;
		font-size: 12px;
		background: rgba(0, 0, 0, 0.2);
	}
	.foot a {
		color: #c213f2;
		text-decoration: none;
		font-weight: 500;
	}
	.foot a:hover {
		text-decoration: underline;
	}
</style>
