/**
 * Canvas v0.3 DAG executor — frontend-side.
 *
 * Walks the canvas in topological order, calls the backend
 * /canvas/run-block endpoint per block, threads each block's
 * output into its descendants' inputs, updates each node's
 * `state` pill in real time via the supplied store update fn.
 *
 * This is the bare bones version: serial execution (one block at
 * a time, no fanned-out parallelism even for independent branches).
 * v0.4 will parallelize independent branches; right now we want
 * the wire-protocol obvious.
 */
import type { Node, Edge } from '@xyflow/svelte';
import type { Writable } from 'svelte/store';
import { WEBUI_API_BASE_URL } from '$lib/constants';

export type BlockState = 'ready' | 'queued' | 'running' | 'ok' | 'failed';

export type BlockResult = {
	block_id: string;
	status: 'ok' | 'failed';
	output_kind?: 'image' | 'video' | 'audio' | 'text';
	output_url?: string;
	output_text?: string;
	cost_cr: number;
	error?: string;
	elapsed_s: number;
	mode: string;
};

export type RunSummary = {
	totalElapsedS: number;
	totalCostCr: number;
	results: Record<string, BlockResult>;
	failedAt?: string; // first block id that failed
};

/**
 * Topologically sort nodes by edges. Throws if there's a cycle.
 */
export function topologicalOrder(nodes: Node[], edges: Edge[]): Node[] {
	const inDegree: Record<string, number> = {};
	const incomingByTarget: Record<string, string[]> = {};
	const outgoingBySource: Record<string, string[]> = {};
	for (const n of nodes) {
		inDegree[n.id] = 0;
		incomingByTarget[n.id] = [];
		outgoingBySource[n.id] = [];
	}
	for (const e of edges) {
		if (inDegree[e.target] === undefined || outgoingBySource[e.source] === undefined) continue;
		inDegree[e.target] += 1;
		incomingByTarget[e.target].push(e.source);
		outgoingBySource[e.source].push(e.target);
	}
	const queue: string[] = [];
	for (const id in inDegree) if (inDegree[id] === 0) queue.push(id);

	const ordered: Node[] = [];
	while (queue.length) {
		const id = queue.shift()!;
		const node = nodes.find((n) => n.id === id);
		if (node) ordered.push(node);
		for (const child of outgoingBySource[id] || []) {
			inDegree[child] -= 1;
			if (inDegree[child] === 0) queue.push(child);
		}
	}
	if (ordered.length !== nodes.length) {
		throw new Error(
			'Canvas has a cycle. Stitcher must be the last block; remove the wire that forms a loop.'
		);
	}
	return ordered;
}

/**
 * Build the inputs payload for one block from its upstream results.
 *
 * Conventions:
 *   - imagegen / videogen accept `prompt` (text) + `first_frame_url` (image)
 *   - stitcher accepts `clips` (list of upstream video URLs)
 *   - everything else just gets its raw upstreams
 */
function gatherInputs(
	node: Node,
	incomingSourceIds: string[],
	resultsById: Record<string, BlockResult>,
	nodesById: Record<string, Node>,
	onLog?: (msg: string) => void
): Record<string, any> {
	const incoming = incomingSourceIds
		.map((sid) => ({ id: sid, src: nodesById[sid], result: resultsById[sid] }))
		.filter((x) => x.src && x.result && x.result.status === 'ok');

	const typeKey = (node.data as any)?.typeKey;
	const num = (node.data as any)?.num;
	const inputs: Record<string, any> = {};

	if (typeKey === 'imagegen' || typeKey === 'videogen') {
		// First text source becomes the prompt; warn if multiple were wired.
		const textSrcs = incoming.filter(
			(x) => x.result.output_kind === 'text' || (x.src.data as any)?.typeKey === 'prompt'
		);
		if (textSrcs[0]) inputs.prompt = textSrcs[0].result.output_text ?? '';
		if (textSrcs.length > 1) {
			const ignored = textSrcs.slice(1).map((s) => `#${(s.src.data as any)?.num ?? s.id}`).join(', ');
			onLog?.(`⚠ ${typeKey} #${num}: using prompt from #${(textSrcs[0].src.data as any)?.num ?? textSrcs[0].id}, ignoring ${ignored}`);
		}
		// First image source becomes the first-frame reference.
		const imgSrcs = incoming.filter((x) => x.result.output_kind === 'image');
		if (imgSrcs[0]) inputs.first_frame_url = imgSrcs[0].result.output_url;
		if (imgSrcs.length > 1) {
			const ignored = imgSrcs.slice(1).map((s) => `#${(s.src.data as any)?.num ?? s.id}`).join(', ');
			onLog?.(`⚠ ${typeKey} #${num}: using first-frame from #${(imgSrcs[0].src.data as any)?.num ?? imgSrcs[0].id}, ignoring ${ignored}`);
		}
	} else if (typeKey === 'stitcher') {
		inputs.clips = incoming
			.filter((x) => x.result.output_kind === 'video')
			.map((x) => x.result.output_url);
	}

	return inputs;
}

export type ExecOptions = {
	nodes: Writable<Node[]>;
	edges: Writable<Edge[]>;
	onLog?: (msg: string) => void;
	signal?: AbortSignal;
	// 'all' (default): every node is re-run, prior 'ok' results discarded.
	// 'resume': nodes whose state is already 'ok' AND have a stored
	// `data.result` are skipped and their result is fed to descendants.
	// Used by Retry/Skip flows so users don't pay to re-run successful
	// upstream blocks just to take another swing at one failed block.
	mode?: 'all' | 'resume';
};

export async function runCanvas(opts: ExecOptions): Promise<RunSummary> {
	const { nodes: nodesStore, edges: edgesStore, onLog, signal, mode = 'all' } = opts;

	let allNodes: Node[] = [];
	let allEdges: Edge[] = [];
	const unsubN = nodesStore.subscribe((v) => (allNodes = v));
	const unsubE = edgesStore.subscribe((v) => (allEdges = v));
	unsubN();
	unsubE();

	let ordered: Node[];
	try {
		ordered = topologicalOrder(allNodes, allEdges);
	} catch (e: any) {
		throw new Error(e?.message || 'Cycle in canvas');
	}

	const nodesById: Record<string, Node> = {};
	for (const n of allNodes) nodesById[n.id] = n;

	const incomingByTarget: Record<string, string[]> = {};
	for (const n of allNodes) incomingByTarget[n.id] = [];
	for (const e of allEdges) {
		if (incomingByTarget[e.target]) incomingByTarget[e.target].push(e.source);
	}

	// Queue up the runnable set:
	//   - mode='all': everything goes to 'queued' (existing behavior)
	//   - mode='resume': only nodes that aren't already 'ok' (and have a
	//     stored result) go to queued. The 'ok' ones stay as-is so the
	//     user keeps seeing the prior successful preview while we re-run
	//     the failed/unattempted ones.
	nodesStore.update((ns) =>
		ns.map((n) => {
			const prevState = (n.data as any)?.state;
			const prevResult = (n.data as any)?.result;
			if (mode === 'resume' && prevState === 'ok' && prevResult) {
				return n;
			}
			return { ...n, data: { ...n.data, state: 'queued' as BlockState } };
		})
	);

	const results: Record<string, BlockResult> = {};
	// Seed `results` from already-ok nodes so resume-mode descendants can
	// thread upstream output into their own inputs without re-fetching.
	if (mode === 'resume') {
		for (const n of allNodes) {
			const prevState = (n.data as any)?.state;
			const prevResult = (n.data as any)?.result;
			if (prevState === 'ok' && prevResult) {
				results[n.id] = {
					block_id: n.id,
					status: 'ok',
					output_kind: prevResult.output_kind,
					output_url: prevResult.output_url,
					output_text: prevResult.output_text,
					cost_cr: 0,
					elapsed_s: 0,
					mode: 'resume-cached'
				};
			}
		}
	}
	const t0 = performance.now();
	let totalCost = 0;
	let failedAt: string | undefined;

	const token = (typeof localStorage !== 'undefined' && localStorage.getItem('token')) || '';

	for (const node of ordered) {
		if (signal?.aborted) {
			onLog?.('Run aborted');
			break;
		}
		// Resume-mode skip: this node's prior result is already in `results`
		// from the seed step above, and the node's state pill is left at
		// 'ok'. Nothing to fetch, nothing to flip — descendants will pick
		// up the cached output via gatherInputs.
		if (mode === 'resume' && results[node.id]?.status === 'ok' && results[node.id]?.mode === 'resume-cached') {
			onLog?.(`↻ ${(node.data as any)?.typeKey} #${(node.data as any)?.num}: skipped (cached)`);
			continue;
		}
		const typeKey = (node.data as any)?.typeKey as string;
		const config = (node.data as any)?.config ?? {};
		const inputs = gatherInputs(node, incomingByTarget[node.id] || [], results, nodesById, onLog);

		// Flip to running.
		nodesStore.update((ns) =>
			ns.map((n) =>
				n.id === node.id
					? { ...n, data: { ...n.data, state: 'running' as BlockState } }
					: n
			)
		);
		onLog?.(`▶ ${typeKey} #${(node.data as any)?.num ?? '?'}: running…`);

		try {
			const r = await fetch(`${WEBUI_API_BASE_URL}/canvas/run-block`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(token ? { Authorization: `Bearer ${token}` } : {})
				},
				body: JSON.stringify({
					block_id: node.id,
					block_type: typeKey,
					config,
					inputs
				}),
				signal
			});
			if (!r.ok) {
				const txt = await r.text().catch(() => '');
				throw new Error(`HTTP ${r.status}: ${txt.slice(0, 200)}`);
			}
			const data: BlockResult = await r.json();
			results[node.id] = data;
			totalCost += data.cost_cr || 0;

			const newState: BlockState = data.status === 'ok' ? 'ok' : 'failed';
			nodesStore.update((ns) =>
				ns.map((n) =>
					n.id === node.id
						? {
							...n,
							data: {
								...n.data,
								state: newState,
								result: {
									output_kind: data.output_kind,
									output_url: data.output_url,
									output_text: data.output_text,
									error: data.error
								}
							}
						}
						: n
				)
			);

			if (data.status === 'failed') {
				failedAt = node.id;
				onLog?.(`✕ ${typeKey} #${(node.data as any)?.num}: ${data.error || 'failed'}`);
				break;
			}
			onLog?.(`✓ ${typeKey} #${(node.data as any)?.num}: ${data.elapsed_s}s, ${data.cost_cr} cr`);
		} catch (err: any) {
			results[node.id] = {
				block_id: node.id,
				status: 'failed',
				cost_cr: 0,
				elapsed_s: 0,
				error: err?.message || 'request error',
				mode: 'error'
			};
			nodesStore.update((ns) =>
				ns.map((n) =>
					n.id === node.id
						? {
							...n,
							data: {
								...n.data,
								state: 'failed' as BlockState,
								result: { error: err?.message || 'request error' }
							}
						}
						: n
				)
			);
			failedAt = node.id;
			onLog?.(`✕ ${typeKey} #${(node.data as any)?.num}: ${err?.message}`);
			break;
		}
	}

	return {
		totalElapsedS: (performance.now() - t0) / 1000,
		totalCostCr: totalCost,
		results,
		failedAt
	};
}
