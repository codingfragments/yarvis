import { invoke } from './tauri';
import type { ActionItem } from '$lib/types';

export interface ThingsAddResult {
	status: 'created' | 'exists';
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Stable identifier embedded in the Things task notes so we can detect
 * subsequent attempts to add the same action and skip the duplicate.
 *
 * Prefers the briefing skill's fingerprint (stable across runs). Falls back
 * to the per-run id only when the producer didn't emit one — those will
 * dedupe within a run but not across regenerations.
 */
export function dedupKeyFor(action: ActionItem): string {
	if (action.fingerprint) return action.fingerprint;
	return `fallback-${action.source_type ?? 'manual'}-${action.id}`;
}

export function sendActionToThings(action: ActionItem): Promise<ThingsAddResult> {
	const noteParts: string[] = [];
	if (action.url) noteParts.push(action.url);
	if (action.source_type || action.source_ref) {
		const src = [action.source_type, action.source_ref].filter(Boolean).join(': ');
		noteParts.push(`Source: ${src}`);
	}

	let deadline: string | null = null;
	if (action.deadline) {
		if (ISO_DATE.test(action.deadline)) {
			deadline = action.deadline;
		} else {
			noteParts.push(`Deadline: ${action.deadline}`);
		}
	}

	return invoke<ThingsAddResult>('add_to_things', {
		title: action.text,
		notes: noteParts.length ? noteParts.join('\n') : null,
		deadline,
		tags: action.deal_tag ? [action.deal_tag] : [],
		dedupKey: dedupKeyFor(action)
	});
}
