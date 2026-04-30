<!--
  /creator/canvas — HPVideo Canvas v0.2
  Adds: drag-from-palette, click-to-select + Inspector edit,
  duplicate / delete, localStorage auto-save (debounced).

  Run All + template loader + backend execution come in v0.3.
-->
<script lang="ts">
	import { onMount, getContext, tick } from 'svelte';
	import { writable, get } from 'svelte/store';
	import {
		SvelteFlow,
		Background,
		Controls,
		MiniMap,
		useSvelteFlow,
		type Node,
		type Edge
	} from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import BlockCard from '$lib/components/canvas/BlockCard.svelte';
	import Palette from '$lib/components/canvas/Palette.svelte';
	import Inspector from '$lib/components/canvas/Inspector.svelte';
	import { BLOCK_TYPE_BY_KEY, makeNodeData, type TypeKey } from '$lib/components/canvas/blockTypes';
	import { WEBUI_NAME, initPageFlag } from '$lib/stores';

	const i18n: any = getContext('i18n');

	const STORAGE_KEY = 'hpv_canvas_v0_2';

	// Initial sample workflow — used only if localStorage is empty.
	const initialNodes: Node[] = [
		{
			id: 'ref-1',
			type: 'block',
			position: { x: 0, y: 100 },
			data: { title: 'Image Reference', num: 1, typeKey: 'imageref', icon: '📷', state: 'ready', cost: 0, hasIn: false, hasOut: true, config: {} }
		},
		{
			id: 'prompt-1',
			type: 'block',
			position: { x: 0, y: 350 },
			data: { title: 'Text Prompt', num: 2, typeKey: 'prompt', icon: '📝', state: 'ready', cost: 0, hasIn: false, hasOut: true, config: { text: '' } }
		},
		{
			id: 'imagegen-1',
			type: 'block',
			position: { x: 320, y: 80 },
			data: { title: 'Image Gen', num: 1, typeKey: 'imagegen', icon: '🎨', state: 'ok', cost: 100, hasIn: true, hasOut: true, config: { model: 'flux-dev', aspect: '16:9' } }
		},
		{
			id: 'videogen-1',
			type: 'block',
			position: { x: 640, y: 80 },
			data: { title: 'Video Gen', num: 1, typeKey: 'videogen', icon: '🎬', state: 'queued', cost: 1500, hasIn: true, hasOut: true, config: { model: 'wan-2.7', duration: 5, resolution: '720p', seed: 'random' } }
		},
		{
			id: 'stitcher-1',
			type: 'block',
			position: { x: 960, y: 200 },
			data: { title: 'Stitcher', num: 1, typeKey: 'stitcher', icon: '⏯', state: 'queued', cost: 0, hasIn: true, hasOut: false, config: { transitions: 'cut' } }
		}
	];

	const initialEdges: Edge[] = [
		{ id: 'e1', source: 'ref-1', target: 'imagegen-1' },
		{ id: 'e2', source: 'prompt-1', target: 'imagegen-1' },
		{ id: 'e3', source: 'imagegen-1', target: 'videogen-1' },
		{ id: 'e4', source: 'videogen-1', target: 'stitcher-1' }
	];

	const nodes = writable<Node[]>(initialNodes);
	const edges = writable<Edge[]>(initialEdges);

	const nodeTypes = { block: BlockCard };

	let selectedNodeId: string | null = null;
	$: selectedNode = selectedNodeId ? $nodes.find((n) => n.id === selectedNodeId) ?? null : null;

	let totalCost = 0;
	$: totalCost = $nodes.reduce((sum, n) => sum + (Number(n.data?.cost) || 0), 0);

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

	let nextNodeIdCounter = 100;
	function nextId(prefix: string) {
		nextNodeIdCounter += 1;
		return `${prefix}-${nextNodeIdCounter}`;
	}

	// Drop handler: add a new node where the user dropped from palette.
	let svelteFlowRef: HTMLDivElement;
	let projectFn: ((p: { x: number; y: number }) => { x: number; y: number }) | null = null;

	function onDragOver(ev: DragEvent) {
		ev.preventDefault();
		if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
	}

	function onDrop(ev: DragEvent) {
		ev.preventDefault();
		const typeKey = ev.dataTransfer?.getData('application/hpvideo-canvas-block') as TypeKey | '';
		if (!typeKey) return;
		const def = BLOCK_TYPE_BY_KEY[typeKey];
		if (!def || def.locked) return;

		// Translate screen coords → flow coords.
		const bounds = svelteFlowRef.getBoundingClientRect();
		const screenPos = { x: ev.clientX - bounds.left, y: ev.clientY - bounds.top };
		const flowPos = projectFn ? projectFn(screenPos) : screenPos;

		const data = makeNodeData(typeKey, get(nodes));
		const newNode: Node = {
			id: nextId(typeKey),
			type: 'block',
			position: flowPos,
			data
		};
		nodes.update((ns) => [...ns, newNode]);
		selectedNodeId = newNode.id;
	}

	// Inspector edit handlers
	function handleConfigUpdate(ev: CustomEvent<{ id: string; config: Record<string, any> }>) {
		const { id, config } = ev.detail;
		// Pull off the optional _newCost piggyback (Inspector emits it when
		// resolution changes for videogen blocks so total cost stays correct).
		const { _newCost, ...cleanConfig } = config as any;
		nodes.update((ns) =>
			ns.map((n) =>
				n.id === id
					? {
							...n,
							data: {
								...n.data,
								config: cleanConfig,
								...(typeof _newCost === 'number' ? { cost: _newCost } : {})
							}
						}
					: n
			)
		);
	}

	function handleDuplicate(ev: CustomEvent<{ id: string }>) {
		const target = $nodes.find((n) => n.id === ev.detail.id);
		if (!target) return;
		const data = makeNodeData(target.data.typeKey as TypeKey, get(nodes));
		// Override num so duplicates inherit fresh numbering, but copy
		// the source's config so the user's settings survive.
		data.config = { ...(target.data.config || {}) };
		const newNode: Node = {
			id: nextId(target.data.typeKey as string),
			type: 'block',
			position: { x: target.position.x + 40, y: target.position.y + 40 },
			data: { ...data, cost: target.data.cost }
		};
		nodes.update((ns) => [...ns, newNode]);
		selectedNodeId = newNode.id;
	}

	function handleDelete(ev: CustomEvent<{ id: string }>) {
		const id = ev.detail.id;
		nodes.update((ns) => ns.filter((n) => n.id !== id));
		edges.update((es) => es.filter((e) => e.source !== id && e.target !== id));
		if (selectedNodeId === id) selectedNodeId = null;
	}

	// Track selection changes from xyflow itself so clicks on a node
	// in the canvas update the Inspector.
	function onSelectionChange(ev: CustomEvent<{ nodes: Node[]; edges: Edge[] }>) {
		const sel = ev.detail.nodes[0];
		selectedNodeId = sel?.id ?? null;
	}

	// LocalStorage auto-save (debounced 800ms after last edit).
	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	let savedFlash = false;

	function scheduleSave() {
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => {
			try {
				const payload = {
					version: 1,
					savedAt: new Date().toISOString(),
					nodes: get(nodes),
					edges: get(edges)
				};
				localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
				savedFlash = true;
				setTimeout(() => (savedFlash = false), 1500);
			} catch (e) {
				// localStorage might be full or disabled; fail silently —
				// the user's work is still in memory until they close the tab.
			}
		}, 800);
	}

	// Save whenever nodes or edges store updates (after first paint).
	let booted = false;
	$: if (booted) {
		// Touch both stores to register dependency.
		void $nodes;
		void $edges;
		scheduleSave();
	}

	function loadFromStorage() {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return false;
			const parsed = JSON.parse(raw);
			if (!parsed?.nodes || !parsed?.edges) return false;
			nodes.set(parsed.nodes);
			edges.set(parsed.edges);
			// Bump nextNodeIdCounter past any existing numeric suffix so
			// a session restored from disk doesn't reuse old ids.
			const numericSuffixes = parsed.nodes
				.map((n: Node) => Number(String(n.id).split('-').pop()))
				.filter((n: number) => Number.isFinite(n));
			if (numericSuffixes.length) {
				nextNodeIdCounter = Math.max(...numericSuffixes, nextNodeIdCounter);
			}
			return true;
		} catch {
			return false;
		}
	}

	function resetCanvas() {
		if (!confirm('Reset canvas? This will remove all blocks and wires you have on screen now.')) return;
		nodes.set(initialNodes);
		edges.set(initialEdges);
		selectedNodeId = null;
	}

	onMount(() => {
		initPageFlag.set(true);
		loadFromStorage();
		booted = true;
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
			<span class="saved" class:flash={savedFlash}>● Auto-saved (local)</span>
		</div>
		<div class="topbar-right">
			<button class="btn" on:click={resetCanvas}>Reset</button>
			<button class="btn">Templates</button>
			<button class="btn primary" disabled title="Coming in v0.3">
				▶ Run All · {totalCost.toLocaleString()} cr
			</button>
		</div>
	</header>

	<div class="banner">
		<div class="icon">🚧</div>
		<div class="text">
			<strong>Canvas v0.2 — preview build.</strong>
			Drag blocks from the left palette, edit settings on the right, your work auto-saves.
			<strong>Run All</strong> + 3 starter templates + backend execution land in v0.3.
			<a href="https://github.com/HPVideoLAB/HPVideoBNB/blob/main/docs/INFINITE_CANVAS_PRD.md" target="_blank">PRD</a>
		</div>
	</div>

	<div class="main">
		<Palette />
		<main class="canvas-host" bind:this={svelteFlowRef} on:dragover={onDragOver} on:drop={onDrop}>
			<SvelteFlow
				{nodes}
				{edges}
				{nodeTypes}
				fitView
				minZoom={0.2}
				maxZoom={2}
				defaultEdgeOptions={{ style: 'stroke: #c213f2; stroke-width: 2;', animated: false }}
				proOptions={{ hideAttribution: true }}
				on:selectionchange={onSelectionChange}
				oninit={(instance) => {
					projectFn = (p) => instance.screenToFlowPosition(p);
				}}
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
		<Inspector
			node={selectedNode}
			on:update={handleConfigUpdate}
			on:duplicate={handleDuplicate}
			on:delete={handleDelete}
		/>
	</div>

	<footer class="bottombar">
		<span class="muted">{$nodes.length} blocks · {$edges.length} wires</span>
		<span class="muted spacer">·</span>
		<span>Total cost: <strong>{totalCost.toLocaleString()}</strong> <span class="muted">cr</span></span>
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
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
		-webkit-font-smoothing: antialiased;
	}
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
		transition: opacity 0.3s;
	}
	.breadcrumb .saved.flash {
		animation: savedFlash 1.4s ease-out;
	}
	@keyframes savedFlash {
		0% { background: rgba(54, 196, 123, 0.4); }
		100% { background: rgba(54, 196, 123, 0.12); }
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
	.main {
		flex: 1;
		display: flex;
		min-height: 0;
		overflow: hidden;
	}
	.canvas-host {
		flex: 1;
		min-width: 0;
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
		background:
			radial-gradient(circle at 30% 30%, rgba(194, 19, 242, 0.06) 0, transparent 45%),
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
