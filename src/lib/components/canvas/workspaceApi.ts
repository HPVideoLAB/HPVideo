/**
 * Canvas workspace API client — wraps /canvas/save, /load/{id},
 * /list, /{id}/share, /{id} DELETE, and /share/{token}.
 *
 * Defensive: every error is surfaced as a thrown Error with a message
 * the page can toast directly. Callers that want to ignore failures
 * (e.g. non-blocking auto-save in the background) should `.catch()`.
 */
import { WEBUI_API_BASE_URL } from '$lib/constants';
import type { Node, Edge } from '@xyflow/svelte';

function authHeaders(): Record<string, string> {
	const t = (typeof localStorage !== 'undefined' && localStorage.getItem('token')) || '';
	return t ? { Authorization: `Bearer ${t}` } : {};
}

export type WorkspaceListItem = {
	id: string;
	name: string;
	archived: boolean;
	has_share_token: boolean;
	created_at: number;
	updated_at: number;
};

export type WorkspaceLoad = {
	id: string;
	name: string;
	nodes: Node[];
	edges: Edge[];
	viewport: { x: number; y: number; zoom: number } | null;
	share_token: string | null;
	created_at: number;
	updated_at: number;
	read_only: boolean;
};

export type SaveArgs = {
	id?: string | null;
	name?: string;
	nodes: Node[];
	edges: Edge[];
	viewport?: { x: number; y: number; zoom: number } | null;
};

export async function saveWorkspace(args: SaveArgs): Promise<{
	id: string;
	name: string;
	share_token: string | null;
	created_at: number;
	updated_at: number;
}> {
	const r = await fetch(`${WEBUI_API_BASE_URL}/canvas/save`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...authHeaders() },
		body: JSON.stringify({
			id: args.id ?? null,
			name: args.name ?? null,
			nodes: args.nodes,
			edges: args.edges,
			viewport: args.viewport ?? null
		})
	});
	if (!r.ok) {
		const txt = await r.text().catch(() => '');
		throw new Error(`Save failed: HTTP ${r.status} ${txt.slice(0, 200)}`);
	}
	return r.json();
}

export async function loadWorkspace(id: string): Promise<WorkspaceLoad> {
	const r = await fetch(`${WEBUI_API_BASE_URL}/canvas/load/${encodeURIComponent(id)}`, {
		headers: authHeaders()
	});
	if (!r.ok) {
		const txt = await r.text().catch(() => '');
		throw new Error(`Load failed: HTTP ${r.status} ${txt.slice(0, 200)}`);
	}
	return r.json();
}

export async function loadShared(token: string): Promise<WorkspaceLoad> {
	const r = await fetch(`${WEBUI_API_BASE_URL}/canvas/share/${encodeURIComponent(token)}`);
	if (!r.ok) {
		const txt = await r.text().catch(() => '');
		throw new Error(`Shared canvas not found: HTTP ${r.status} ${txt.slice(0, 200)}`);
	}
	return r.json();
}

export async function listWorkspaces(): Promise<WorkspaceListItem[]> {
	const r = await fetch(`${WEBUI_API_BASE_URL}/canvas/list`, { headers: authHeaders() });
	if (!r.ok) {
		const txt = await r.text().catch(() => '');
		throw new Error(`List failed: HTTP ${r.status} ${txt.slice(0, 200)}`);
	}
	return r.json();
}

export async function deleteWorkspace(id: string): Promise<void> {
	const r = await fetch(`${WEBUI_API_BASE_URL}/canvas/${encodeURIComponent(id)}`, {
		method: 'DELETE',
		headers: authHeaders()
	});
	if (!r.ok) {
		const txt = await r.text().catch(() => '');
		throw new Error(`Delete failed: HTTP ${r.status} ${txt.slice(0, 200)}`);
	}
}

export async function setShare(id: string, enable: boolean): Promise<{
	share_token: string | null;
	share_url: string | null;
}> {
	const r = await fetch(`${WEBUI_API_BASE_URL}/canvas/${encodeURIComponent(id)}/share`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...authHeaders() },
		body: JSON.stringify({ enable })
	});
	if (!r.ok) {
		const txt = await r.text().catch(() => '');
		throw new Error(`Share failed: HTTP ${r.status} ${txt.slice(0, 200)}`);
	}
	return r.json();
}
