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
	import TemplatesMenu from '$lib/components/canvas/TemplatesMenu.svelte';
	import { BLOCK_TYPE_BY_KEY, makeNodeData, type TypeKey } from '$lib/components/canvas/blockTypes';
	import { TEMPLATES } from '$lib/components/canvas/templates';
	import { runCanvas, newRunId, type RunSummary } from '$lib/components/canvas/runner';
	import { pendingAction, type CanvasAction } from '$lib/components/canvas/canvasActions';
	import {
		saveWorkspace,
		loadWorkspace,
		loadShared,
		listWorkspaces,
		setShare,
		type WorkspaceListItem
	} from '$lib/components/canvas/workspaceApi';
	import { chargeForRun } from '$lib/components/canvas/dlcpCharge';
	import { toast } from 'svelte-sonner';
	import { WEBUI_NAME, initPageFlag, dlcpBalance } from '$lib/stores';
	import { getStoredAddress, hasPointsWallet, getDLCPBalance } from '$lib/utils/wallet/dlcp/wallet';

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
			data: { title: 'Video Gen', num: 1, typeKey: 'videogen', icon: '🎬', state: 'queued', cost: 1500, hasIn: true, hasOut: true, config: { model: 'happyhorse-1.0', duration: 5, resolution: '720p', seed: 'random' } }
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

		// Approximate screen → flow translation. We don't have access to
		// the SvelteFlow instance from this scope (xyflow's
		// useSvelteFlow hook only works inside a child component of
		// <SvelteFlow>), and xyflow 0.1.x's oninit callback receives
		// no instance arg. For v0.2 we drop in canvas-relative pixel
		// coords; xyflow accepts these at the default 1× viewport.
		// Pan/zoom-aware drop lands in v0.3 once we wrap a child
		// component that calls useSvelteFlow().
		const bounds = svelteFlowRef.getBoundingClientRect();
		const flowPos = { x: ev.clientX - bounds.left, y: ev.clientY - bounds.top };

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
	// in the canvas update the Inspector. xyflow/svelte 0.1.x emits
	// `nodeclick` per click, not the v1.x-style `selectionchange`.
	function onNodeClick(ev: CustomEvent<{ event: MouseEvent; node: Node }>) {
		selectedNodeId = ev.detail.node?.id ?? null;
	}
	function onPaneClick() {
		selectedNodeId = null;
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

	// ---- Server-side workspace persistence (Canvas v0.4 batch 11) ----
	// `currentWorkspaceId` ties the in-memory canvas to a server row when
	// the user has clicked Save / Load. localStorage continues to work as
	// a per-tab autosave below; Save explicitly pushes to the backend.
	let currentWorkspaceId: string | null = null;
	let currentShareToken: string | null = null;
	let canvasName: string = '';
	let isSaving = false;
	let showLoadDialog = false;
	let workspaceList: WorkspaceListItem[] = [];

	$: savedLabel = currentWorkspaceId
		? $i18n.t('Saved · cloud')
		: $i18n.t('Auto-saved (local)');

	async function handleSave(promptForName: boolean) {
		if (isSaving) return;
		const ns = get(nodes);
		const es = get(edges);
		// First save: ask for a name unless one's already typed in.
		let name = (canvasName || '').trim();
		if (promptForName && !currentWorkspaceId && !name) {
			const guess =
				typeof window !== 'undefined'
					? window.prompt($i18n.t('Name this canvas'), $i18n.t('Untitled canvas'))
					: '';
			if (!guess) return;
			name = guess.trim();
			canvasName = name;
		}
		isSaving = true;
		try {
			const r = await saveWorkspace({
				id: currentWorkspaceId,
				name: name || ($i18n.t('Untitled canvas') as string),
				nodes: ns,
				edges: es
			});
			currentWorkspaceId = r.id;
			currentShareToken = r.share_token;
			canvasName = r.name;
			savedFlash = true;
			setTimeout(() => (savedFlash = false), 1500);
			toast.success($i18n.t('Canvas saved.'));
		} catch (e: any) {
			toast.error(e?.message || ($i18n.t('Save failed.') as string));
		} finally {
			isSaving = false;
		}
	}

	async function openLoadDialog() {
		try {
			workspaceList = await listWorkspaces();
			showLoadDialog = true;
		} catch (e: any) {
			toast.error(e?.message || ($i18n.t('Could not load list.') as string));
		}
	}

	async function loadById(id: string) {
		try {
			const ws = await loadWorkspace(id);
			nodes.set(ws.nodes);
			edges.set(ws.edges);
			currentWorkspaceId = ws.id;
			currentShareToken = ws.share_token;
			canvasName = ws.name;
			showLoadDialog = false;
			toast.success($i18n.t('Loaded "{{name}}"', { name: ws.name }));
		} catch (e: any) {
			toast.error(e?.message || ($i18n.t('Load failed.') as string));
		}
	}

	async function handleShare() {
		if (!currentWorkspaceId) return;
		try {
			const enable = !currentShareToken;
			const r = await setShare(currentWorkspaceId, enable);
			currentShareToken = r.share_token;
			if (enable && r.share_url && typeof navigator !== 'undefined' && navigator.clipboard) {
				const fullUrl = window.location.origin + r.share_url;
				await navigator.clipboard.writeText(fullUrl);
				toast.success($i18n.t('Share link copied: {{url}}', { url: fullUrl }));
			} else if (!enable) {
				toast.info($i18n.t('Sharing disabled.'));
			}
		} catch (e: any) {
			toast.error(e?.message || ($i18n.t('Share failed.') as string));
		}
	}

	// On mount, if URL has ?share=<token>, load it read-only into the canvas.
	onMount(async () => {
		const url = typeof window !== 'undefined' ? new URL(window.location.href) : null;
		const token = url?.searchParams?.get('share') || '';
		if (token) {
			try {
				const ws = await loadShared(token);
				nodes.set(ws.nodes);
				edges.set(ws.edges);
				canvasName = ws.name + ' (shared)';
				toast.info($i18n.t('Loaded shared canvas: "{{name}}". Save As to fork it.', { name: ws.name }));
			} catch (e: any) {
				toast.error(e?.message || ($i18n.t('Could not load shared canvas.') as string));
			}
		}
	});

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
		if (!confirm($i18n.t('Reset canvas? This will remove all blocks and wires you have on screen now.'))) return;
		nodes.set(initialNodes);
		edges.set(initialEdges);
		selectedNodeId = null;
	}

	let isRunning = false;
	let runAbort: AbortController | null = null;
	let runPromise: Promise<RunSummary> | null = null;
	let lastRun: RunSummary | null = null;
	let runLog: string[] = [];
	let showRunLog = false;
	let runLogBodyEl: HTMLDivElement;

	// Sticky for the Retry/Skip flow: the runId of the most recent paid
	// Run All. While the Redis paid bucket is alive (1h TTL) and the user
	// has remaining DLCP credit in it, retries reuse this id so they
	// don't re-pay. spent_cr only increments on successful generations,
	// so a failed block doesn't drain the bucket — retries get a free
	// (already-paid-for) shot.
	let lastPaidRunId: string | null = null;

	// ---- Real Mode toggle (Canvas v0.4 batch 13) ----
	// Was a hidden `localStorage.canvas_mode='real'` admin opt-in;
	// now a proper UI toggle for any user who has a DLCP wallet.
	let realMode = false;
	let walletConnected = false;
	let walletAddress = '';

	// On mount, hydrate state from localStorage + wallet.
	onMount(() => {
		try {
			realMode = localStorage.getItem('canvas_mode') === 'real';
			walletAddress = getStoredAddress() || '';
			walletConnected = hasPointsWallet();
		} catch {}
		// Refresh DLCP balance so the topbar pill reads accurately on load.
		if (walletAddress) {
			getDLCPBalance(walletAddress)
				.then((b) => dlcpBalance.set(b))
				.catch(() => {});
		}
	});

	function setRealMode(on: boolean) {
		if (on && !walletConnected) {
			toast.error(
				$i18n.t(
					'Connect a points wallet first — real mode pays in DLCP for each run.'
				)
			);
			return;
		}
		realMode = on;
		try {
			if (on) localStorage.setItem('canvas_mode', 'real');
			else localStorage.removeItem('canvas_mode');
		} catch {}
		toast.info(
			on
				? $i18n.t('Real Mode ON — generations charge from your DLCP balance.')
				: $i18n.t('Real Mode OFF — outputs are demo placeholders.')
		);
	}

	$: dlcpDisplay = (() => {
		try {
			const n = parseFloat(String($dlcpBalance || '0'));
			return Number.isFinite(n) ? n.toFixed(3) : '0';
		} catch {
			return '0';
		}
	})();

	function clearRunLog() {
		runLog = [];
	}

	// Auto-scroll to bottom whenever new lines land. Runs after every
	// runLog reactive update; cheap because lines only append.
	$: if (runLogBodyEl && runLog.length) {
		// next-tick scroll so the new line is laid out before we scroll
		tick().then(() => {
			if (runLogBodyEl) runLogBodyEl.scrollTop = runLogBodyEl.scrollHeight;
		});
	}

	async function handleRunAll() {
		// Already running: first click after Run All cancels the abort signal.
		// We then wait for the in-flight runCanvas to fully wind down before
		// allowing a new run. Without this, a rapid "Run All → Cancel → Run All"
		// could land while the first runCanvas was still inside an `await fetch`,
		// leaving two execution flows mutating nodesStore at the same time.
		if (isRunning) {
			runAbort?.abort();
			if (runPromise) {
				try {
					await runPromise;
				} catch (_) {
					// previous run's rejection is already handled in its own finally
				}
			}
			return;
		}
		if ($nodes.length === 0) {
			toast.info($i18n.t('Drag some blocks onto the canvas first.'));
			return;
		}

		// DLCP charging: only required when real-mode is on AND the user
		// isn't an admin. Admin / stub-mode keep the old free path.
		// We mint the runId here so /canvas/charge and runCanvas share it.
		const runId = newRunId();
		if (realMode && totalCost > 0) {
			runLog = [
				$i18n.t('💰 Real mode: paying {{cr}} cr ({{dlcp}} DLCP)…', {
					cr: totalCost,
					dlcp: (totalCost / 1000).toFixed(3)
				})
			];
			showRunLog = true;
			const charge = await chargeForRun({
				runId,
				totalCostCr: totalCost,
				t: (k, v) => $i18n.t(k, v) as string
			});
			if (!charge.success) {
				return; // Toasts already surfaced inside chargeForRun.
			}
			// Bucket is now alive in Redis for 1h. Sticky for Retry/Skip flows.
			lastPaidRunId = runId;
		} else if (!realMode) {
			// Demo mode runs don't pay, but they shouldn't pollute lastPaidRunId
			// either (retrying from a stale paid bucket after toggling Demo
			// would be confusing — fresh demo runs use fresh ids).
			lastPaidRunId = null;
		}

		isRunning = true;
		runLog = realMode && totalCost > 0
			? [...runLog, $i18n.t('✓ Payment confirmed. Starting Run All…')]
			: [];
		showRunLog = true;
		runAbort = new AbortController();
		const localAbort = runAbort;
		const promise = runCanvas({
			nodes,
			edges,
			signal: localAbort.signal,
			runId,
			onLog: (line) => {
				runLog = [...runLog, line];
			}
		});
		runPromise = promise;
		try {
			const summary = await promise;
			lastRun = summary;
			if (summary.failedAt) {
				toast.error($i18n.t('Stopped at block {{id}}.', { id: summary.failedAt }));
			} else {
				toast.success(
					$i18n.t('Done in {{seconds}}s · {{cost}} cr (stub).', {
						seconds: summary.totalElapsedS.toFixed(1),
						cost: summary.totalCostCr.toLocaleString()
					})
				);
			}
		} catch (e: any) {
			if (e?.name !== 'AbortError') {
				toast.error(e?.message || $i18n.t('Run failed.'));
			}
		} finally {
			isRunning = false;
			runAbort = null;
			runPromise = null;
		}
	}

	// Find every node downstream of `nodeId` (transitively). Used by Retry/
	// Skip/Re-run to invalidate descendants whose cached output is no longer
	// valid the moment we re-run an upstream block.
	function descendantsOf(nodeId: string): Set<string> {
		const out = new Set<string>();
		const queue = [nodeId];
		const edgeList = $edges;
		while (queue.length) {
			const cur = queue.shift()!;
			for (const e of edgeList) {
				if (e.source === cur && !out.has(e.target)) {
					out.add(e.target);
					queue.push(e.target);
				}
			}
		}
		return out;
	}

	async function runResume() {
		if (isRunning) return;
		isRunning = true;
		runLog = [];
		showRunLog = true;
		// In real mode, reuse the most recent paid runId so retries don't
		// re-charge. The Redis bucket lives 1h and only successful blocks
		// drain it, so failed-block retries get a free shot. If no prior
		// payment (admin / demo / paid bucket expired), fall through to a
		// fresh id and the backend gates non-admin requests with 402.
		const resumeRunId = realMode && lastPaidRunId ? lastPaidRunId : undefined;
		if (resumeRunId) {
			runLog = [$i18n.t('↻ Retrying from existing paid bucket (no new charge).')];
		}
		runAbort = new AbortController();
		const localAbort = runAbort;
		const promise = runCanvas({
			nodes,
			edges,
			signal: localAbort.signal,
			mode: 'resume',
			runId: resumeRunId,
			onLog: (line) => {
				runLog = [...runLog, line];
			}
		});
		runPromise = promise;
		try {
			const summary = await promise;
			lastRun = summary;
			if (summary.failedAt) {
				toast.error($i18n.t('Stopped at block {{id}}.', { id: summary.failedAt }));
			} else {
				toast.success(
					$i18n.t('Resumed in {{seconds}}s · +{{cost}} cr (stub).', {
						seconds: summary.totalElapsedS.toFixed(1),
						cost: summary.totalCostCr.toLocaleString()
					})
				);
			}
		} catch (e: any) {
			if (e?.name !== 'AbortError') toast.error(e?.message || $i18n.t('Run failed.'));
		} finally {
			isRunning = false;
			runAbort = null;
			runPromise = null;
		}
	}

	// Invalidate one node and everything downstream of it. Sets each to
	// 'ready' and clears `data.result` so resume mode re-runs them.
	function invalidateNodeAndDescendants(nodeId: string) {
		const toClear = descendantsOf(nodeId);
		toClear.add(nodeId);
		nodes.update((ns) =>
			ns.map((n) => {
				if (!toClear.has(n.id)) return n;
				const { result: _result, ...rest } = (n.data as any) || {};
				return { ...n, data: { ...rest, state: 'ready' } };
			})
		);
	}

	// "Skip" the failed block: pretend it succeeded with no output. Downstream
	// blocks' gatherInputs sees no result for this source and proceeds with
	// whatever other inputs it has. The descendants are reset to 'ready' so
	// resume picks them up.
	function skipNode(nodeId: string) {
		const desc = descendantsOf(nodeId);
		nodes.update((ns) =>
			ns.map((n) => {
				if (n.id === nodeId) {
					return { ...n, data: { ...n.data, state: 'ok', result: undefined } };
				}
				if (desc.has(n.id)) {
					const { result: _r, ...rest } = (n.data as any) || {};
					return { ...n, data: { ...rest, state: 'ready' } };
				}
				return n;
			})
		);
	}

	async function handleCanvasAction(action: CanvasAction) {
		if (isRunning) {
			toast.info($i18n.t('Run is in progress — wait for it to finish or cancel first.'));
			return;
		}
		if (action.type === 'skip') {
			skipNode(action.id);
			toast.info($i18n.t('Block #{{id}} marked skipped — running downstream…', { id: action.id }));
		} else {
			invalidateNodeAndDescendants(action.id);
		}
		await runResume();
	}

	$: if ($pendingAction) {
		const a = $pendingAction;
		pendingAction.set(null);
		// Schedule on next tick so the store-set above lands before we
		// kick off another store update inside handleCanvasAction.
		tick().then(() => handleCanvasAction(a));
	}

	function loadTemplate(ev: CustomEvent<{ id: string }>) {
		const tpl = TEMPLATES.find((t) => t.id === ev.detail.id);
		if (!tpl) return;
		const hasWork = $nodes.length > 0;
		if (hasWork && !confirm($i18n.t('Replace your current canvas with the "{{name}}" template?', { name: tpl.name }))) return;
		const built = tpl.build();
		nodes.set(built.nodes);
		edges.set(built.edges);
		selectedNodeId = null;
		// Bump id counter past any numeric suffix in the template so newly
		// added nodes don't collide.
		const numericSuffixes = built.nodes
			.map((n) => Number(String(n.id).split('-').pop()))
			.filter((n) => Number.isFinite(n));
		if (numericSuffixes.length) {
			nextNodeIdCounter = Math.max(...numericSuffixes, nextNodeIdCounter) + 100;
		}
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
			<span class="brand-name">{$i18n.t('HPVideo Canvas')}</span>
			<span class="badge-beta">BETA</span>
		</a>
		<div class="breadcrumb">
			<span style="opacity:0.4;">/</span>
			<input
				class="canvas-name"
				type="text"
				bind:value={canvasName}
				on:blur={() => { if (currentWorkspaceId) handleSave(false); }}
				placeholder={$i18n.t('Untitled canvas')}
			/>
			<span class="saved" class:flash={savedFlash}>● {savedLabel}</span>
		</div>
		<div class="topbar-right">
			<button class="btn" on:click={resetCanvas}>{$i18n.t('Reset')}</button>
			<TemplatesMenu on:load={loadTemplate} />
			<button class="btn" on:click={() => handleSave(true)} disabled={isSaving}>
				{isSaving ? '…' : '💾'} {currentWorkspaceId ? $i18n.t('Save') : $i18n.t('Save As')}
			</button>
			<button class="btn" on:click={openLoadDialog}>📂 {$i18n.t('Load')}</button>
			{#if currentWorkspaceId}
				<button class="btn" on:click={handleShare}>
					{currentShareToken ? '🔗 ' + $i18n.t('Shared') : '🔗 ' + $i18n.t('Share')}
				</button>
			{/if}
			<button
				class="btn real-toggle"
				class:on={realMode}
				on:click={() => setRealMode(!realMode)}
				title={walletConnected
					? $i18n.t('Toggle real generation (DLCP-charged)')
					: $i18n.t('Connect a points wallet to enable real mode')}
			>
				{realMode ? '🟢' : '⚪'} {realMode ? $i18n.t('Real') : $i18n.t('Demo')}
				{#if walletConnected && realMode}
					<span class="real-balance">· {dlcpDisplay} DLCP</span>
				{/if}
			</button>
			<button class="btn primary" on:click={handleRunAll}>
				{#if isRunning}
					⏸ {$i18n.t('Cancel')}
				{:else if realMode && totalCost > 0}
					▶ {$i18n.t('Run All')} · {(totalCost / 1000).toFixed(2)} DLCP
				{:else}
					▶ {$i18n.t('Run All')} · {totalCost.toLocaleString()} {$i18n.t('cr')}
				{/if}
			</button>
		</div>
	</header>

	{#if realMode}
		<div class="banner banner-real">
			<div class="icon">🟢</div>
			<div class="text">
				<strong>{$i18n.t('REAL MODE — generations charge from your DLCP balance.')}</strong>
				{$i18n.t('Each Run All triggers one DBC-chain DLCP transfer for the total cost (1000 cr = 1 DLCP). Output is real, not a placeholder.')}
			</div>
		</div>
	{:else}
		<div class="banner banner-demo">
			<div class="icon">⚠</div>
			<div class="text">
				<strong>{$i18n.t('DEMO MODE — outputs are placeholders.')}</strong>
				{$i18n.t('Run All works end-to-end, but every output is the same demo image / demo MP4. Toggle Real Mode in the topbar to charge DLCP and get real generation.')}
				<a href="https://github.com/HPVideoLAB/HPVideoBNB/blob/main/docs/INFINITE_CANVAS_PRD.md" target="_blank">{$i18n.t('PRD')}</a>
			</div>
		</div>
	{/if}

	<div class="main" class:running={isRunning}>
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
				nodesDraggable={!isRunning}
				nodesConnectable={!isRunning}
				edgesUpdatable={!isRunning}
				elementsSelectable={true}
				on:nodeclick={onNodeClick}
				on:paneclick={onPaneClick}
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

	{#if showLoadDialog}
		<div class="dialog-backdrop" on:click={() => (showLoadDialog = false)}>
			<div class="dialog" on:click|stopPropagation>
				<div class="dialog-head">
					<span>{$i18n.t('Your saved canvases')}</span>
					<button class="dialog-close" on:click={() => (showLoadDialog = false)}>×</button>
				</div>
				<div class="dialog-body">
					{#if workspaceList.length === 0}
						<p class="dialog-empty">{$i18n.t('No saved canvases yet. Click Save to make one.')}</p>
					{:else}
						{#each workspaceList as ws (ws.id)}
							<button class="ws-item" on:click={() => loadById(ws.id)}>
								<span class="ws-name">{ws.name}</span>
								<span class="ws-meta">
									{new Date(ws.updated_at * 1000).toLocaleString()}
									{#if ws.has_share_token}<span class="ws-shared">🔗</span>{/if}
								</span>
							</button>
						{/each}
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!--
		Mobile interstitial. Canvas is structurally desktop-only — Palette + canvas
		+ Inspector total ~880px and xyflow's drag/connect doesn't work well on touch.
		Below 1024px we hide the canvas and show a friendly notice instead of
		shipping a broken layout to phone users coming from the marketing nav.
	-->
	<div class="mobile-block">
		<div class="mobile-block-card">
			<div class="mobile-block-icon">🖥</div>
			<h2>{$i18n.t('Canvas is desktop-only (for now)')}</h2>
			<p>
				{$i18n.t('The infinite canvas needs a wider screen to fit the block palette, editor and inspector. Open this page on a desktop or tablet (1024px+) to start composing multi-shot videos.')}
			</p>
			<p class="mobile-block-sub">
				{$i18n.t('On mobile? Try our single-shot creator instead.')}
			</p>
			<a class="mobile-block-cta" href="/creator/" rel="noopener">{$i18n.t('Open Creator →')}</a>
		</div>
	</div>

	<!--
		Run log drawer. Captures the same lines runner.ts emits via onLog
		(▶ start, ✓ success, ✕ failure, ⚠ multi-input warning, ↻ resume-cached)
		so the user can scroll back through the run after the toast disappears.
		Auto-opens when a run starts, stays open after the run ends so the user
		can read failures without racing the toast.
	-->
	{#if runLog.length > 0 && showRunLog}
		<aside class="run-log">
			<div class="run-log-head">
				<span class="run-log-title">{$i18n.t('Run log')}</span>
				<span class="run-log-count">{runLog.length}</span>
				<span class="run-log-spacer"></span>
				<button type="button" class="run-log-btn" on:click={clearRunLog} title={$i18n.t('Clear log')}>
					{$i18n.t('Clear')}
				</button>
				<button type="button" class="run-log-btn" on:click={() => (showRunLog = false)} title={$i18n.t('Hide log')}>
					{$i18n.t('Hide')}
				</button>
			</div>
			<div class="run-log-body" bind:this={runLogBodyEl}>
				{#each runLog as line, i}
					<div class="run-log-line" class:line-fail={line.startsWith('✕')} class:line-ok={line.startsWith('✓')} class:line-run={line.startsWith('▶')} class:line-warn={line.startsWith('⚠')} class:line-cache={line.startsWith('↻')}>
						<span class="run-log-idx">{(i + 1).toString().padStart(2, '0')}</span>
						<span class="run-log-text">{line}</span>
					</div>
				{/each}
			</div>
		</aside>
	{/if}

	<footer class="bottombar">
		<span class="muted">{$i18n.t('{{nodes}} blocks · {{edges}} wires', { nodes: $nodes.length, edges: $edges.length })}</span>
		<span class="muted spacer">·</span>
		<span>{$i18n.t('Total cost:')} <strong>{totalCost.toLocaleString()}</strong> <span class="muted">{$i18n.t('cr')}</span></span>
		{#if runLog.length > 0}
			<button
				type="button"
				class="log-toggle"
				on:click={() => (showRunLog = !showRunLog)}
				title={showRunLog ? $i18n.t('Hide log') : $i18n.t('Show log')}
			>
				{showRunLog ? '▾' : '▸'} {$i18n.t('Log')} <span class="log-toggle-count">{runLog.length}</span>
			</button>
		{/if}
		<span class="balance">
			<span class="muted">{$i18n.t('Balance:')}</span>
			<strong>—</strong>
			<span class="muted">{$i18n.t('cr')}</span>
			<span class="hint">{$i18n.t('(connect wallet to enable Run)')}</span>
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
	.canvas-name {
		background: transparent;
		border: 1px solid transparent;
		color: #e5e3f0;
		font-weight: 600;
		font-size: 13px;
		font-family: inherit;
		padding: 4px 8px;
		border-radius: 6px;
		min-width: 140px;
		max-width: 280px;
	}
	.canvas-name:hover {
		border-color: rgba(255, 255, 255, 0.15);
	}
	.canvas-name:focus {
		outline: none;
		border-color: rgba(194, 19, 242, 0.5);
		background: rgba(194, 19, 242, 0.06);
	}
	.canvas-name::placeholder {
		color: #6b6884;
	}
	.dialog-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(7, 6, 14, 0.7);
		backdrop-filter: blur(6px);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.dialog {
		width: min(560px, 90vw);
		max-height: 78vh;
		background: linear-gradient(180deg, rgba(28, 21, 56, 0.97) 0%, rgba(21, 16, 42, 0.97) 100%);
		border: 1px solid rgba(194, 19, 242, 0.3);
		border-radius: 14px;
		box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	.dialog-head {
		padding: 14px 18px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		font-weight: 600;
		font-size: 14px;
		color: #fff;
	}
	.dialog-close {
		font-size: 22px;
		line-height: 1;
		padding: 2px 8px;
		background: transparent;
		border: 0;
		color: #a6a2bc;
		cursor: pointer;
		border-radius: 6px;
	}
	.dialog-close:hover {
		background: rgba(255, 255, 255, 0.06);
		color: #fff;
	}
	.dialog-body {
		padding: 8px 0;
		overflow-y: auto;
	}
	.dialog-empty {
		padding: 30px 24px;
		text-align: center;
		color: #8d89a6;
		font-size: 13px;
	}
	.ws-item {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 4px;
		width: 100%;
		padding: 12px 18px;
		background: transparent;
		border: 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
		text-align: left;
		cursor: pointer;
		font-family: inherit;
		color: #e5e3f0;
	}
	.ws-item:hover {
		background: rgba(194, 19, 242, 0.08);
	}
	.ws-item .ws-name {
		font-size: 14px;
		font-weight: 600;
	}
	.ws-item .ws-meta {
		font-size: 11px;
		color: #8d89a6;
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.ws-shared {
		color: #c213f2;
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
	.banner.banner-demo {
		background: linear-gradient(90deg, rgba(239, 68, 68, 0.18), rgba(239, 68, 68, 0.06));
		border-bottom: 1px solid rgba(239, 68, 68, 0.35);
		color: #fca5a5;
	}
	.banner.banner-real {
		background: linear-gradient(90deg, rgba(54, 196, 123, 0.20), rgba(54, 196, 123, 0.06));
		border-bottom: 1px solid rgba(54, 196, 123, 0.35);
		color: #86efac;
	}
	.real-toggle {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		font-weight: 600;
		font-size: 12px;
		border-radius: 999px;
	}
	.real-toggle.on {
		background: rgba(54, 196, 123, 0.14);
		border-color: rgba(54, 196, 123, 0.45);
		color: #86efac;
	}
	.real-toggle:not(.on) {
		color: #a6a2bc;
		border-color: rgba(255, 255, 255, 0.15);
	}
	.real-toggle .real-balance {
		font-size: 10px;
		font-variant-numeric: tabular-nums;
		opacity: 0.8;
	}
	.banner .icon {
		font-size: 14px;
	}
	.banner strong {
		color: #fff;
	}
	.banner code {
		font-family: ui-monospace, monospace;
		font-size: 11px;
		padding: 1px 5px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 3px;
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
	/*
		Lock canvas chrome while a run is in flight. The audit's [C3] finding
		was that runner.ts snapshots the topology at run start; if the user
		drags / deletes / connects mid-run, the executor's view of the graph
		diverges from what's on screen and state flips can clobber user edits.
		Cheapest defensive fix: dim + disable Palette and Inspector and turn
		off node drag / edge drawing in xyflow. Run All button stays clickable
		so users can still cancel.
	*/
	.main.running :global(.palette),
	.main.running :global(.inspector) {
		pointer-events: none;
		opacity: 0.55;
		filter: saturate(0.7);
		transition: opacity 0.2s ease;
	}
	.main.running .canvas-host {
		cursor: progress;
	}
	.main.running .canvas-host::after {
		content: '';
		position: absolute;
		inset: 0;
		background: rgba(7, 6, 14, 0.04);
		pointer-events: none;
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

	.run-log {
		flex-shrink: 0;
		max-height: 200px;
		display: flex;
		flex-direction: column;
		background: linear-gradient(180deg, rgba(13, 10, 28, 0.96) 0%, rgba(7, 6, 14, 0.96) 100%);
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}
	.run-log-head {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 14px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		font-size: 12px;
	}
	.run-log-title {
		color: #e5e3f0;
		font-weight: 600;
		letter-spacing: 0.4px;
		text-transform: uppercase;
		font-size: 11px;
	}
	.run-log-count {
		color: #a6a2bc;
		font-variant-numeric: tabular-nums;
		font-size: 11px;
		padding: 1px 7px;
		background: rgba(255, 255, 255, 0.06);
		border-radius: 999px;
	}
	.run-log-spacer {
		flex: 1;
	}
	.run-log-btn {
		font-family: inherit;
		font-size: 11px;
		padding: 4px 10px;
		border-radius: 5px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: transparent;
		color: #a6a2bc;
		cursor: pointer;
	}
	.run-log-btn:hover {
		background: rgba(255, 255, 255, 0.06);
		color: #fff;
	}
	.run-log-body {
		overflow-y: auto;
		padding: 6px 14px 8px;
		font-family: ui-monospace, 'JetBrains Mono', SFMono-Regular, monospace;
		font-size: 12px;
		line-height: 1.5;
	}
	.run-log-line {
		display: flex;
		gap: 10px;
		padding: 2px 0;
		color: #b9b6cc;
	}
	.run-log-idx {
		color: #4a466a;
		font-variant-numeric: tabular-nums;
		min-width: 20px;
		flex-shrink: 0;
	}
	.run-log-text {
		white-space: pre-wrap;
		word-break: break-word;
	}
	.run-log-line.line-fail .run-log-text {
		color: #fca5a5;
	}
	.run-log-line.line-ok .run-log-text {
		color: #86efac;
	}
	.run-log-line.line-run .run-log-text {
		color: #fcd34d;
	}
	.run-log-line.line-warn .run-log-text {
		color: #fde68a;
	}
	.run-log-line.line-cache .run-log-text {
		color: #93c5fd;
	}
	.log-toggle {
		font-family: inherit;
		font-size: 11px;
		padding: 4px 10px;
		border-radius: 5px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: transparent;
		color: #c213f2;
		cursor: pointer;
		font-weight: 600;
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.log-toggle:hover {
		background: rgba(194, 19, 242, 0.08);
		border-color: rgba(194, 19, 242, 0.4);
	}
	.log-toggle-count {
		font-size: 10px;
		padding: 1px 6px;
		border-radius: 999px;
		background: rgba(194, 19, 242, 0.18);
		color: #fff;
		font-variant-numeric: tabular-nums;
	}

	/* Mobile interstitial — hidden on desktop, shown when viewport <1024px. */
	.mobile-block {
		display: none;
	}
	@media (max-width: 1023px) {
		.topbar,
		.banner,
		.main,
		.bottombar,
		.run-log {
			display: none !important;
		}
		.mobile-block {
			display: flex;
			flex: 1;
			align-items: center;
			justify-content: center;
			padding: 32px 20px;
			background:
				radial-gradient(circle at 50% 30%, rgba(194, 19, 242, 0.12) 0, transparent 50%),
				#07060e;
		}
		.mobile-block-card {
			max-width: 380px;
			text-align: center;
			background: linear-gradient(180deg, rgba(28, 21, 56, 0.95) 0%, rgba(21, 16, 42, 0.95) 100%);
			border: 1px solid rgba(255, 255, 255, 0.1);
			border-radius: 14px;
			padding: 28px 22px;
			box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
		}
		.mobile-block-icon {
			font-size: 40px;
			margin-bottom: 8px;
		}
		.mobile-block-card h2 {
			font-size: 18px;
			font-weight: 700;
			color: #fff;
			margin: 0 0 12px;
		}
		.mobile-block-card p {
			font-size: 14px;
			line-height: 1.5;
			color: #b9b6cc;
			margin: 0 0 12px;
		}
		.mobile-block-sub {
			font-size: 13px;
			color: #6b6884;
		}
		.mobile-block-cta {
			display: inline-block;
			margin-top: 8px;
			padding: 11px 22px;
			border-radius: 999px;
			background: linear-gradient(135deg, #c213f2 0%, #8a2ce6 100%);
			color: #fff;
			font-weight: 600;
			font-size: 14px;
			text-decoration: none;
			min-height: 44px;
			line-height: 22px;
		}
	}
</style>
