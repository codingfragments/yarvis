import { invoke } from './tauri';
import type { DateEntry, FileEntry, TodayWidgets } from '$lib/types';

export async function scanBriefings(dir: string, maxDays: number): Promise<DateEntry[]> {
	return invoke<DateEntry[]>('scan_briefings', { dir, maxDays });
}

export async function listDateFiles(dir: string, dateKey: string): Promise<FileEntry[]> {
	return invoke<FileEntry[]>('list_date_files', { dir, dateKey });
}

export async function readBriefing(dir: string, dateKey: string, filename: string): Promise<string> {
	return invoke<string>('read_briefing', { dir, dateKey, filename });
}

export async function getTodayWidgets(dir: string): Promise<TodayWidgets> {
	return invoke<TodayWidgets>('get_today_widgets', { dir });
}

export async function toggleCheckbox(
	dir: string,
	dateKey: string,
	filename: string,
	index: number,
	checked: boolean
): Promise<void> {
	return invoke<void>('toggle_checkbox', { dir, dateKey, filename, index, checked });
}
