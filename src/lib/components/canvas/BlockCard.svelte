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

	type Props = NodeProps<{
		title: string;
		num: number;
		typeKey: 'imageref' | 'prompt' | 'imagegen' | 'videogen' | 'voice' | 'stitcher';
		icon: string;
		state: 'ready' | 'queued' | 'running' | 'ok' | 'failed';
		cost: number; // in credits, 0 for free
		hasIn?: boolean;
		hasOut?: boolean;
	}>;

	export let data: Props['data'];
	export let selected: Props['selected'] = false;

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
	/* Override xyflow handle styling to match brand */
	:global(.svelte-flow__handle) {
		width: 12px !important;
		height: 12px !important;
		background: #1a0a2e !important;
		border: 2px solid #c213f2 !important;
	}
</style>
