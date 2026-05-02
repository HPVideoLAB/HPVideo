/**
 * Canvas templates — curated starter workflows.
 * Each one is a complete (nodes + edges) JSON spec the user can fork
 * with a single click. Same shape that v0.5 will use for the
 * server-side template marketplace.
 */
import type { Node, Edge } from '@xyflow/svelte';
import { defaultConfig } from './blockTypes';

export type CanvasTemplate = {
	id: string;
	name: string;
	description: string;
	icon: string;            // emoji shown in the dropdown
	estimatedCostCr: number;
	tag?: 'popular' | 'beginner';
	build: () => { nodes: Node[]; edges: Edge[] };
};

function block(
	id: string,
	x: number,
	y: number,
	typeKey: string,
	num: number,
	overrides: Record<string, any> = {}
): Node {
	const ICONS: Record<string, string> = {
		imageref: '📷',
		prompt: '📝',
		imagegen: '🎨',
		videogen: '🎬',
		voice: '🎙',
		stitcher: '⏯'
	};
	const COSTS: Record<string, number> = {
		imageref: 0,
		prompt: 0,
		imagegen: 100,
		videogen: 1500,
		voice: 200,
		stitcher: 0
	};
	const TITLES: Record<string, string> = {
		imageref: 'Image Reference',
		prompt: 'Text Prompt',
		imagegen: 'Image Gen',
		videogen: 'Video Gen',
		voice: 'Voice (TTS)',
		stitcher: 'Stitcher'
	};
	return {
		id,
		type: 'block',
		position: { x, y },
		data: {
			title: TITLES[typeKey],
			num,
			typeKey,
			icon: ICONS[typeKey],
			state: 'ready',
			cost: COSTS[typeKey],
			hasIn: typeKey !== 'imageref' && typeKey !== 'prompt',
			hasOut: typeKey !== 'stitcher',
			config: { ...defaultConfig(typeKey as any), ...overrides }
		}
	};
}

function edge(id: string, source: string, target: string): Edge {
	return { id, source, target };
}

export const TEMPLATES: CanvasTemplate[] = [
	{
		id: 'tpl-talking-head-10s',
		name: '🎙 Talking Head 10s (Korean)',
		description:
			'2 HappyHorse 1.0 shots, chained for character continuity. Native Korean dialogue + lip-sync, branded backgrounds. Shot 2 i2v from shot 1 last frame.',
		icon: '🎙',
		estimatedCostCr: 1_500,
		tag: 'popular',
		build: () => {
			const sharedCharacter =
				'A 27-year-old Korean female presenter with shoulder-length straight black hair, light makeup, friendly warm smile, wearing a clean tailored navy blazer over a white blouse, looking directly at camera';
			const nodes: Node[] = [
				block('prompt-1', 0, 80, 'prompt', 1, {
					text:
						`Cinematic medium shot, shallow depth of field. ${sharedCharacter}. ` +
						'Background: a sleek modern AI studio with a massive glowing purple LED video wall behind her ' +
						"clearly displaying 'HPVideo' wordmark and 'Cinematic AI Video on BNB Chain' tagline. " +
						'She speaks clearly in Korean with accurate lip-sync: ' +
						'안녕하세요! HPVideo입니다. 11개의 최첨단 AI 비디오 모델로 시네마급 영상을 만들 수 있어요. ' +
						'Camera: slow dolly in. Audio: her natural Korean voice in foreground, faint studio room tone, no music. ' +
						'Polished broadcast quality.'
				}),
				block('prompt-2', 0, 320, 'prompt', 2, {
					text:
						'The same Korean female presenter from the previous frame continues speaking confidently to camera ' +
						'with accurate lip-sync, smiling warmly. She speaks clearly in Korean: ' +
						'지갑만 연결하면 클립당 0.45달러부터. 이메일도 구독도 없어요. 지금 바로 시작하세요! ' +
						'The shot transitions: the studio LED wall behind her dims and softly transitions into a warm ' +
						"golden-hour bokeh, while a small minimalist purple 'HPVideo' wordmark sign and 'Start Now →' " +
						'button graphic gently appear on the wall behind her. Camera: gentle slow push-in. ' +
						'Audio: her natural Korean voice in foreground, slight room tone, no music. Lip-sync accurate.'
				}),
				block('videogen-1', 320, 80, 'videogen', 1, { model: 'happyhorse-1.0' }),
				// videogen-2 chains from videogen-1 → backend extracts last frame, routes to i2v.
				block('videogen-2', 640, 200, 'videogen', 2, { model: 'happyhorse-1.0' }),
				block('stitcher-1', 960, 200, 'stitcher', 1, { transitions: 'crossfade' })
			];
			const edges: Edge[] = [
				edge('e1', 'prompt-1', 'videogen-1'),
				edge('e2', 'prompt-2', 'videogen-2'),
				edge('e3', 'videogen-1', 'videogen-2'), // chain: shot 1 → shot 2 (last frame becomes first frame)
				edge('e4', 'videogen-1', 'stitcher-1'),
				edge('e5', 'videogen-2', 'stitcher-1')
			];
			return { nodes, edges };
		}
	},
	{
		id: 'tpl-product-ad-15s',
		name: '15s Product Ad',
		description: 'Reference image → 3 hero shots → 3 video clips → stitched',
		icon: '🛒',
		estimatedCostCr: 4_950,
		build: () => {
			const nodes: Node[] = [
				block('ref-1', 0, 60, 'imageref', 1),
				block('prompt-1', 0, 280, 'prompt', 2, {
					text: 'Cinematic product hero shot, dramatic side lighting, shallow depth of field, ultra-realistic'
				}),
				block('imagegen-1', 320, 0, 'imagegen', 1),
				block('imagegen-2', 320, 200, 'imagegen', 2),
				block('imagegen-3', 320, 400, 'imagegen', 3),
				block('videogen-1', 640, 0, 'videogen', 1),
				block('videogen-2', 640, 200, 'videogen', 2),
				block('videogen-3', 640, 400, 'videogen', 3),
				block('stitcher-1', 960, 200, 'stitcher', 1)
			];
			const edges: Edge[] = [
				edge('e1', 'ref-1', 'imagegen-1'),
				edge('e2', 'ref-1', 'imagegen-2'),
				edge('e3', 'ref-1', 'imagegen-3'),
				edge('e4', 'prompt-1', 'imagegen-1'),
				edge('e5', 'prompt-1', 'imagegen-2'),
				edge('e6', 'prompt-1', 'imagegen-3'),
				edge('e7', 'imagegen-1', 'videogen-1'),
				edge('e8', 'imagegen-2', 'videogen-2'),
				edge('e9', 'imagegen-3', 'videogen-3'),
				edge('e10', 'videogen-1', 'stitcher-1'),
				edge('e11', 'videogen-2', 'stitcher-1'),
				edge('e12', 'videogen-3', 'stitcher-1')
			];
			return { nodes, edges };
		}
	},
	{
		id: 'tpl-short-drama-30s',
		name: '30s Short Drama',
		description: 'Prompt → character image → 4 video shots with consistent character → stitched',
		icon: '🎭',
		estimatedCostCr: 8_200,
		tag: 'popular',
		build: () => {
			const nodes: Node[] = [
				block('prompt-1', 0, 200, 'prompt', 1, {
					text: 'A young woman with red hair and freckles, cinematic lighting, photorealistic portrait'
				}),
				block('imagegen-1', 280, 200, 'imagegen', 1),
				block('videogen-1', 560, 0, 'videogen', 1, { duration: 7 }),
				block('videogen-2', 560, 160, 'videogen', 2, { duration: 7 }),
				block('videogen-3', 560, 320, 'videogen', 3, { duration: 7 }),
				block('videogen-4', 560, 480, 'videogen', 4, { duration: 7 }),
				block('stitcher-1', 880, 240, 'stitcher', 1)
			];
			const edges: Edge[] = [
				edge('e1', 'prompt-1', 'imagegen-1'),
				edge('e2', 'imagegen-1', 'videogen-1'),
				edge('e3', 'imagegen-1', 'videogen-2'),
				edge('e4', 'imagegen-1', 'videogen-3'),
				edge('e5', 'imagegen-1', 'videogen-4'),
				edge('e6', 'videogen-1', 'stitcher-1'),
				edge('e7', 'videogen-2', 'stitcher-1'),
				edge('e8', 'videogen-3', 'stitcher-1'),
				edge('e9', 'videogen-4', 'stitcher-1')
			];
			return { nodes, edges };
		}
	},
	{
		id: 'tpl-hook-payoff',
		name: 'Hook + Payoff',
		description: 'Two video clips → stitched. Simplest non-trivial workflow.',
		icon: '⚡',
		estimatedCostCr: 3_000,
		tag: 'beginner',
		build: () => {
			const nodes: Node[] = [
				block('prompt-1', 0, 80, 'prompt', 1, {
					text: 'Hook: a finger pressing a glowing red button in close-up'
				}),
				block('prompt-2', 0, 320, 'prompt', 2, {
					text: 'Payoff: explosion of confetti and fireworks, wide shot'
				}),
				block('videogen-1', 280, 80, 'videogen', 1),
				block('videogen-2', 280, 320, 'videogen', 2),
				block('stitcher-1', 600, 200, 'stitcher', 1)
			];
			const edges: Edge[] = [
				edge('e1', 'prompt-1', 'videogen-1'),
				edge('e2', 'prompt-2', 'videogen-2'),
				edge('e3', 'videogen-1', 'stitcher-1'),
				edge('e4', 'videogen-2', 'stitcher-1')
			];
			return { nodes, edges };
		}
	}
];
