<!--
  /creator/canvas — HPVideo Canvas v0.1
  Node-based multi-shot video composition editor. First shippable
  cut: drag-and-connect canvas with 5 sample blocks pre-placed,
  proves @xyflow/svelte renders inside our existing Studio shell.
  Real interactions (palette drag-add, run-block, persistence) come
  in subsequent commits per the PRD.
-->
<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import { writable } from 'svelte/store';
	import {
		SvelteFlow,
		Background,
		Controls,
		MiniMap,
		type Node,
		type Edge
	} from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import BlockCard from '$lib/components/canvas/BlockCard.svelte';
	import { WEBUI_NAME, initPageFlag } from '$lib/stores';

	const i18n: any = getContext('i18n');

	// Initial sample workflow — same shape as the v2 mockup so reviewers
	// can visually confirm parity.
	const initialNodes: Node[] = [
		{
			id: 'ref-1',
			type: 'block',
			position: { x: 0, y: 100 },
			data: {
				title: 'Image Reference',
				num: 1,
				typeKey: 'imageref',
				icon: '📷',
				state: 'ready',
				cost: 0,
				hasIn: false
			}
		},
		{
			id: 'prompt-1',
			type: 'block',
			position: { x: 0, y: 350 },
			data: {
				title: 'Text Prompt',
				num: 2,
				typeKey: 'prompt',
				icon: '📝',
				state: 'ready',
				cost: 0,
				hasIn: false
			}
		},
		{
			id: 'imagegen-1',
			type: 'block',
			position: { x: 320, y: 80 },
			data: {
				title: 'Image Gen',
				num: 1,
				typeKey: 'imagegen',
				icon: '🎨',
				state: 'ok',
				cost: 100
			}
		},
		{
			id: 'videogen-1',
			type: 'block',
			position: { x: 640, y: 80 },
			data: {
				title: 'Video Gen',
				num: 1,
				typeKey: 'videogen',
				icon: '🎬',
				state: 'queued',
				cost: 1500
			}
		},
		{
			id: 'stitcher-1',
			type: 'block',
			position: { x: 960, y: 200 },
			data: {
				title: 'Stitcher',
				num: 1,
				typeKey: 'stitcher',
				icon: '⏯',
				state: 'queued',
				cost: 0,
				hasOut: false
			}
		}
	];

	const initialEdges: Edge[] = [
		{ id: 'e1', source: 'ref-1', target: 'imagegen-1', animated: false },
		{ id: 'e2', source: 'prompt-1', target: 'imagegen-1', animated: false },
		{ id: 'e3', source: 'imagegen-1', target: 'videogen-1', animated: false },
		{ id: 'e4', source: 'videogen-1', target: 'stitcher-1', animated: false }
	];

	const nodes = writable<Node[]>(initialNodes);
	const edges = writable<Edge[]>(initialEdges);

	const nodeTypes = { block: BlockCard };

	let totalCost = 0;
	$: totalCost = $nodes.reduce((sum, n) => sum + (Number(n.data?.cost) || 0), 0);

	// Defined out here so the Svelte 4 attribute parser doesn't choke on
	// the inline arrow-with-typed-Record-literal that lived inside the
	// MiniMap nodeColor prop.
	const TYPE_TO_COLOR: { [k: string]: string } = {
		imageref: '#4ec3d9',
		prompt: '#e5b53c',
		imagegen: '#f06fb5',
		videogen: '#c213f2',
		voice: '#36c47b',
		stitcher: '#ff8a3d'
	};
	function nodeColor(n: Node): string {
		return TYPE_TO_COLOR[(n.data as any)?.typeKey] || '#888';
	}

	onMount(() => {
		initPageFlag.set(true);
	});
</script>

<svelte:head>
	<title>HPVideo Canvas (Beta) — {$WEBUI_NAME}</title>
</svelte:head>

<div class="canvas-page">
	<header class="topbar">
		<a class="brand" href="/creator">
			<div class="brand-mark"></div>
			<span class="brand-name">HPVideo Canvas</span>
			<span class="badge-beta">BETA</span>
		</a>
		<div class="breadcrumb">
			<span style="opacity:0.4;">/</span>
			<span class="current">Untitled canvas</span>
			<span class="saved">● Auto-saved (local)</span>
		</div>
		<div class="topbar-right">
			<button class="btn">Templates</button>
			<button class="btn primary" disabled title="Coming in v0.2">
				▶ Run All · {totalCost.toLocaleString()} cr
			</button>
		</div>
	</header>

	<div class="banner">
		<div class="icon">🚧</div>
		<div class="text">
			<strong>Canvas v0.1 — preview build.</strong>
			Drag/connect/zoom works. <strong>Run All</strong>, palette drag-add,
			template picker, server-side persistence ship in v0.2 (~1 week out).
			<a href="https://github.com/HPVideoLAB/HPVideoBNB/blob/main/docs/INFINITE_CANVAS_PRD.md" target="_blank">Read the PRD</a>
		</div>
	</div>

	<main class="canvas-host">
		<SvelteFlow
			{nodes}
			{edges}
			{nodeTypes}
			fitView
			minZoom={0.2}
			maxZoom={2}
			defaultEdgeOptions={{
				style: 'stroke: #c213f2; stroke-width: 2;',
				animated: false
			}}
			proOptions={{ hideAttribution: true }}
		>
			<Background gap={28} size={1.2} />
			<Controls />
			<MiniMap
				style="background: rgba(13,10,28,0.9); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;"
				maskColor="rgba(7,6,14,0.7)"
				{nodeColor}
			/>
		</SvelteFlow>
	</main>

	<footer class="bottombar">
		<span class="muted">{$nodes.length} blocks · {$edges.length} wires</span>
		<span class="muted spacer">·</span>
		<span>
			Total cost: <strong>{totalCost.toLocaleString()}</strong>
			<span class="muted">cr</span>
		</span>
		<span class="balance">
			<span class="muted">Balance:</span>
			<strong>—</strong>
			<span class="muted">cr</span>
			<span class="hint">(connect wallet to enable Run)</span>
		</span>
	</footer>
</div>

<style>
	.canvas-page {
		display: flex;
		flex-direction: column;
		height: 100vh;
		width: 100vw;
		background: #07060e;
		color: #e5e3f0;
		font-family:
			'Inter',
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			system-ui,
			sans-serif;
		-webkit-font-smoothing: antialiased;
	}
	/* Top bar */
	.topbar {
		height: 56px;
		background: rgba(13, 10, 28, 0.85);
		backdrop-filter: blur(20px);
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		display: flex;
		align-items: center;
		padding: 0 18px;
		gap: 14px;
		flex-shrink: 0;
		z-index: 100;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 10px;
		text-decoration: none;
		color: inherit;
	}
	.brand-mark {
		width: 28px;
		height: 28px;
		background: linear-gradient(135deg, #c213f2, #8a2ce6);
		border-radius: 8px;
		position: relative;
		box-shadow: 0 4px 12px rgba(194, 19, 242, 0.4);
	}
	.brand-mark::after {
		content: '';
		position: absolute;
		inset: 6px 4px 4px 8px;
		border-left: 8px solid white;
		border-top: 5px solid transparent;
		border-bottom: 5px solid transparent;
	}
	.brand-name {
		font-weight: 700;
		color: #fff;
		font-size: 15px;
	}
	.badge-beta {
		font-size: 10px;
		font-weight: 700;
		color: white;
		background: linear-gradient(90deg, #c213f2, #8a2ce6);
		padding: 3px 8px;
		border-radius: 999px;
		letter-spacing: 0.4px;
		text-transform: uppercase;
	}
	.breadcrumb {
		color: #6b6884;
		font-size: 13px;
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.breadcrumb .current {
		color: #e5e3f0;
		font-weight: 600;
	}
	.breadcrumb .saved {
		background: rgba(54, 196, 123, 0.12);
		color: #36c47b;
		font-size: 11px;
		padding: 2px 8px;
		border-radius: 999px;
		font-weight: 600;
	}
	.topbar-right {
		margin-left: auto;
		display: flex;
		gap: 8px;
	}
	.btn {
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
	.btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.06);
	}
	.btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.btn.primary {
		background: linear-gradient(90deg, #c213f2, #8a2ce6);
		border-color: transparent;
		color: white;
		font-weight: 600;
		box-shadow: 0 4px 12px rgba(194, 19, 242, 0.3);
	}
	/* Beta banner */
	.banner {
		background: linear-gradient(90deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.04));
		border-bottom: 1px solid rgba(245, 158, 11, 0.25);
		padding: 8px 18px;
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: 12px;
		color: #fcd34d;
		flex-shrink: 0;
	}
	.banner .icon {
		font-size: 14px;
	}
	.banner strong {
		color: #fff;
	}
	.banner a {
		color: #c213f2;
		font-weight: 600;
	}
	/* Canvas host */
	.canvas-host {
		flex: 1;
		min-height: 0;
		position: relative;
	}
	:global(.svelte-flow) {
		background: #07060e !important;
	}
	:global(.svelte-flow__background) {
		background-color: #07060e !important;
	}
	:global(.svelte-flow__pane) {
		background: radial-gradient(circle at 30% 30%, rgba(194, 19, 242, 0.06) 0, transparent 45%),
			#07060e !important;
	}
	:global(.svelte-flow__edge-path) {
		stroke: #c213f2 !important;
		stroke-width: 2 !important;
	}
	:global(.svelte-flow__controls) {
		background: rgba(13, 10, 28, 0.9);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		overflow: hidden;
	}
	:global(.svelte-flow__controls button) {
		background: transparent !important;
		color: #e5e3f0 !important;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
		fill: #e5e3f0;
	}
	:global(.svelte-flow__controls button:hover) {
		background: rgba(255, 255, 255, 0.06) !important;
	}
	/* Bottom bar */
	.bottombar {
		height: 38px;
		background: rgba(13, 10, 28, 0.85);
		backdrop-filter: blur(12px);
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		display: flex;
		align-items: center;
		padding: 0 18px;
		font-size: 12px;
		color: #a6a2bc;
		gap: 14px;
		flex-shrink: 0;
	}
	.bottombar strong {
		color: #fff;
		font-variant-numeric: tabular-nums;
	}
	.muted {
		color: #6b6884;
	}
	.spacer {
		opacity: 0.4;
	}
	.balance {
		margin-left: auto;
	}
	.hint {
		color: #6b6884;
		font-style: italic;
		margin-left: 4px;
	}
</style>
