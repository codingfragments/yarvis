import { invoke } from './tauri';
import type { ActionItem } from '$lib/types';

interface ThingsAddParams {
	title: string;
	notes?: string;
	deadline?: string;
	tags?: string[];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function buildThingsAddUrl(params: ThingsAddParams): string {
	const q = new URLSearchParams();
	q.set('title', params.title);
	if (params.notes) q.set('notes', params.notes);
	if (params.deadline) q.set('deadline', params.deadline);
	if (params.tags?.length) q.set('tags', params.tags.join(','));
	return `things:///add?${q.toString()}`;
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

	return invoke<void>('open_things_url', { url });
}
