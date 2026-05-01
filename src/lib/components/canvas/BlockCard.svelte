<!--
  BlockCard.svelte — the visual shell for every node on the canvas.
  Renders type-color strip, header, body, footer with state pill + cost.
  Wraps xyflow's Handle for input / output ports.

  Driven entirely by `data` props passed in via @xyflow/svelte's
  `useSvelteFlow` node spec. Per-block-type detail (config fields,
  preview thumbnails, etc.) is composed by parent block components.
-->
<script lang="ts">
	import { Handle, Position, type NodeProps } from '@xyflow/svelte';
	import { pendingAction } from './canvasActions';

	type Props = NodeProps<{
		title: string;
		num: number;
		typeKey: 'imageref' | 'prompt' | 'imagegen' | 'videogen' | 'voice' | 'stitcher';
		icon: string;
		state: 'ready' | 'queued' | 'running' | 'ok' | 'failed';
		cost: number; // in credits, 0 for free
		hasIn?: boolean;
		hasOut?: boolean;
		// Populated by runner.ts after a successful Run All. Shown as a
		// preview thumbnail when state==='ok' so the user can see what
		// each block produced without opening Inspector.
		result?: {
			output_kind?: 'image' | 'video' | 'audio' | 'text';
			output_url?: string;
			output_text?: string;
			error?: string;
		};
	}>;

	export let data: Props['data'];
	export let id: string;
	export let selected: Props['selected'] = false;

	// Action buttons render only for ok / failed states; running/queued
	// hides them. Page guards against multi-action via its `isRunning` lock.
	function onRetry() {
		pendingAction.set({ type: 'retry', id });
	}
	function onSkip() {
		pendingAction.set({ type: 'skip', id });
	}
	function onRerun() {
		pendingAction.set({ type: 'rerun', id });
	}

	const TYPE_COLORS: Record<string, string> = {
		imageref: '#4ec3d9',
		prompt: '#e5b53c',
		imagegen: '#f06fb5',
		videogen: '#c213f2',
		voice: '#36c47b',
		stitcher: '#ff8a3d'
	};

	const STATE_LABELS: Record<string, string> = {
		ready: 'ready',
		queued: 'queued',
		running: 'running',
		ok: 'done',
		failed: 'failed'
	};
</script>

<div class="block" class:selected>
	<div class="strip" style="background:{TYPE_COLORS[data.typeKey]}"></div>

	<div class="header">
		<div class="icon" style="background:{TYPE_COLORS[data.typeKey]}">{data.icon}</div>
		<div class="title">{data.title}</div>
		<div class="num">#{data.num}</div>
	</div>

	<div class="body">
		<slot />
		{#if data.state === 'ok' && data.result}
			{#if data.result.output_kind === 'image' && data.result.output_url}
				<a
					class="preview"
					href={data.result.output_url}
					target="_blank"
					rel="noopener"
					title="Open full image"
				>
					<img src={data.result.output_url} alt="preview" loading="lazy" />
				</a>
			{:else if data.result.output_kind === 'video' && data.result.output_url}
				<!-- svelte-ignore a11y-media-has-caption -->
				<video
					class="preview"
					src={data.result.output_url}
					controls
					muted
					playsinline
					preload="metadata"
				></video>
			{:else if data.result.output_kind === 'text' && data.result.output_text}
				<div class="preview-text" title={data.result.output_text}>
					{data.result.output_text}
				</div>
			{/if}
		{:else if data.state === 'failed' && data.result?.error}
			<div class="preview-error" title={data.result.error}>
				{data.result.error}
			</div>
		{/if}
	</div>

	<div class="footer">
		<span class="state state-{data.state}">
			<span class="dot"></span>
			{STATE_LABELS[data.state]}
		</span>
		<span class="cost" class:free={data.cost === 0}>
			{data.cost === 0 ? 'free' : data.cost.toLocaleString() + ' cr'}
		</span>
	</div>

	{#if data.state === 'failed'}
		<div class="actions">
			<button
				type="button"
				class="action retry"
				on:click|stopPropagation={onRetry}
				title="Re-run this block and any downstream blocks"
			>
				↻ Retry
			</button>
			<button
				type="button"
				class="action skip"
				on:click|stopPropagation={onSkip}
				title="Mark as skipped and continue downstream without this block's output"
			>
				→ Skip
			</button>
		</div>
	{:else if data.state === 'ok'}
		<div class="actions">
			<button
				type="button"
				class="action rerun"
				on:click|stopPropagation={onRerun}
				title="Re-run this block and any downstream blocks"
			>
				↻ Re-run
			</button>
		</div>
	{/if}

	{#if data.hasIn !== false}
		<Handle type="target" position={Position.Left} />
	{/if}
	{#if data.hasOut !== false}
		<Handle type="source" position={Position.Right} />
	{/if}
</div>

<style>
	.block {
		width: 232px;
		background: linear-gradient(180deg, rgba(28, 21, 56, 0.95) 0%, rgba(21, 16, 42, 0.95) 100%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		overflow: hidden;
		box-shadow:
			0 8px 24px rgba(0, 0, 0, 0.4),
			inset 0 1px 0 rgba(255, 255, 255, 0.04);
		color: #e5e3f0;
		font-family:
			'Inter',
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			system-ui,
			sans-serif;
	}
	.block.selected {
		border-color: #c213f2;
		box-shadow:
			0 0 0 1px #c213f2,
			0 16px 60px rgba(194, 19, 242, 0.18);
	}
	.strip {
		height: 3px;
	}
	.header {
		padding: 12px 14px 6px;
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.icon {
		width: 26px;
		height: 26px;
		border-radius: 7px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 13px;
		color: white;
		flex-shrink: 0;
	}
	.title {
		font-size: 13px;
		font-weight: 600;
		color: #fff;
		flex: 1;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.num {
		font-size: 11px;
		color: #6b6884;
		font-weight: 600;
		font-family: ui-monospace, monospace;
	}
	.body {
		padding: 4px 14px 12px;
		font-size: 12px;
	}
	.preview {
		display: block;
		margin-top: 8px;
		width: 100%;
		max-height: 140px;
		border-radius: 6px;
		overflow: hidden;
		background: #0a0014;
		border: 1px solid rgba(255, 255, 255, 0.08);
	}
	.preview img,
	.preview video {
		display: block;
		width: 100%;
		max-height: 140px;
		object-fit: cover;
	}
	.preview-text {
		margin-top: 8px;
		padding: 8px 10px;
		border-radius: 6px;
		background: rgba(229, 181, 60, 0.08);
		border: 1px solid rgba(229, 181, 60, 0.2);
		font-size: 11px;
		color: #fde68a;
		max-height: 60px;
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		line-height: 1.4;
	}
	.preview-error {
		margin-top: 8px;
		padding: 8px 10px;
		border-radius: 6px;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		font-size: 11px;
		color: #fca5a5;
		max-height: 60px;
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		line-height: 1.4;
	}
	.footer {
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		padding: 8px 14px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 11px;
		color: #a6a2bc;
	}
	.state {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.4px;
		text-transform: uppercase;
	}
	.state .dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: currentColor;
		box-shadow: 0 0 8px currentColor;
	}
	.state-ok {
		color: #36c47b;
	}
	.state-running {
		color: #f5a623;
	}
	.state-running .dot {
		animation: pulse 1s infinite ease-in-out;
	}
	.state-queued {
		color: #6b6884;
	}
	.state-queued .dot {
		box-shadow: none;
	}
	.state-ready {
		color: #36c47b;
	}
	.state-failed {
		color: #ef4444;
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.4;
			transform: scale(0.8);
		}
	}
	.cost {
		font-weight: 600;
		color: #e5e3f0;
		font-variant-numeric: tabular-nums;
	}
	.cost.free {
		color: #6b6884;
		font-weight: 500;
	}
	.actions {
		display: flex;
		gap: 6px;
		padding: 0 10px 10px;
	}
	.action {
		flex: 1;
		font-family: inherit;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.3px;
		padding: 6px 8px;
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.04);
		color: #e5e3f0;
		cursor: pointer;
		transition: background 0.15s ease, border-color 0.15s ease;
	}
	.action:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.2);
	}
	.action:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.action.retry {
		color: #fca5a5;
		border-color: rgba(239, 68, 68, 0.3);
	}
	.action.retry:hover:not(:disabled) {
		background: rgba(239, 68, 68, 0.12);
		border-color: rgba(239, 68, 68, 0.45);
	}
	.action.skip {
		color: #fde68a;
		border-color: rgba(245, 158, 11, 0.3);
	}
	.action.skip:hover:not(:disabled) {
		background: rgba(245, 158, 11, 0.12);
		border-color: rgba(245, 158, 11, 0.45);
	}
	.action.rerun {
		color: #a6a2bc;
		font-size: 10px;
		padding: 4px 8px;
	}
	/* Override xyflow handle styling to match brand */
	:global(.svelte-flow__handle) {
		width: 12px !important;
		height: 12px !important;
		background: #1a0a2e !important;
		border: 2px solid #c213f2 !important;
	}
</style>
