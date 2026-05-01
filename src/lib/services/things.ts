import { invoke } from './tauri';
import type { ActionItem } from '$lib/types';

interface ThingsAddParams {
	title: string;
	notes?: string;
	deadline?: string;
	tags?: string[];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function param(key: string, value: string): string {
	return `${key}=${encodeURIComponent(value)}`;
}

export function buildThingsAddUrl(params: ThingsAddParams): string {
	const parts: string[] = [param('title', params.title)];
	if (params.notes) parts.push(param('notes', params.notes));
	if (params.deadline) parts.push(param('deadline', params.deadline));
	if (params.tags?.length) parts.push(param('tags', params.tags.join(',')));
	return `things:///add?${parts.join('&')}`;
}

export function sendActionToThings(action: ActionItem): Promise<void> {
	const noteParts: string[] = [];
	if (action.url) noteParts.push(action.url);
	if (action.source_type || action.source_ref) {
		const src = [action.source_type, action.source_ref].filter(Boolean).join(': ');
		noteParts.push(`Source: ${src}`);
	}

	let deadline: string | undefined;
	if (action.deadline) {
		if (ISO_DATE.test(action.deadline)) {
			deadline = action.deadline;
		} else {
			noteParts.push(`Deadline: ${action.deadline}`);
		}
	}

	const url = buildThingsAddUrl({
		title: action.text,
		notes: noteParts.length ? noteParts.join('\n') : undefined,
		deadline,
		tags: action.deal_tag ? [action.deal_tag] : undefined
	});

	console.log('[things] sending URL:', url);
	return invoke<void>('open_things_url', { url });
}
