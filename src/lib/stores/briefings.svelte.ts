import * as briefingsService from '$lib/services/briefings';
import { isTauri } from '$lib/services/tauri';
import type { DateEntry, FileEntry } from '$lib/types';

let dates = $state<DateEntry[]>([]);
let files = $state<FileEntry[]>([]);
let currentDate = $state<string | null>(null);
let currentFile = $state<string | null>(null);
let rawMarkdown = $state<string | null>(null);
let sidePanelFile = $state<string | null>(null);
let sidePanelMarkdown = $state<string | null>(null);
let loading = $state(false);
let error = $state<string | null>(null);

export function getBriefingsStore() {
	return {
		get dates() { return dates; },
		get files() { return files; },
		get currentDate() { return currentDate; },
		get currentFile() { return currentFile; },
		get rawMarkdown() { return rawMarkdown; },
		get sidePanelFile() { return sidePanelFile; },
		get sidePanelMarkdown() { return sidePanelMarkdown; },
		get loading() { return loading; },
		get error() { return error; },

		async load(dir: string, maxDays: number) {
			if (!isTauri()) {
				error = 'Briefings require Tauri — use "bun run tauri:dev"';
				return;
			}
			loading = true;
			error = null;
			try {
				dates = await briefingsService.scanBriefings(dir, maxDays);
				if (dates.length > 0) {
					await this.selectDate(dates[0].key, dir);
				}
			} catch (e) {
				error = String(e);
			} finally {
				loading = false;
			}
		},

		async softRefresh(dir: string, maxDays: number) {
			if (!isTauri()) return;
			if (loading) return;
			try {
				const nextDates = await briefingsService.scanBriefings(dir, maxDays);
				dates = nextDates;
				if (currentDate) {
					const stillThere = nextDates.some((d) => d.key === currentDate);
					if (stillThere) {
						files = await briefingsService.listDateFiles(dir, currentDate);
					}
				}
			} catch {
				// Soft refresh: keep last good state, swallow error.
			}
		},

		isBusy(): boolean {
			return loading;
		},

		async selectDate(dateKey: string, dir: string) {
			currentDate = dateKey;
			currentFile = null;
			rawMarkdown = null;
			sidePanelFile = null;
			sidePanelMarkdown = null;
			try {
				files = await briefingsService.listDateFiles(dir, dateKey);
				// Auto-select morning briefing or first file
				const morning = files.find((f) => f.is_morning);
				const first = morning || files[0];
				if (first) {
					await this.selectFile(first.filename, dir);
				}
			} catch (e) {
				error = String(e);
			}
		},

		async selectFile(filename: string, dir: string) {
			if (!currentDate) return;
			currentFile = filename;
			loading = true;
			try {
				rawMarkdown = await briefingsService.readBriefing(dir, currentDate, filename);
				error = null;
			} catch (e) {
				error = String(e);
				rawMarkdown = null;
			} finally {
				loading = false;
			}
		},

		async openInSidePanel(filename: string, dir: string) {
			if (!currentDate) return;
			try {
				sidePanelFile = filename;
				sidePanelMarkdown = await briefingsService.readBriefing(dir, currentDate, filename);
			} catch (e) {
				error = String(e);
				sidePanelFile = null;
				sidePanelMarkdown = null;
			}
		},

		closeSidePanel() {
			sidePanelFile = null;
			sidePanelMarkdown = null;
		},

		async toggleCheckbox(index: number, checked: boolean, dir: string) {
			if (!currentDate || !currentFile || !rawMarkdown) return;
			// Optimistic patch on the raw markdown
			rawMarkdown = patchCheckbox(rawMarkdown, index, checked);
			try {
				await briefingsService.toggleCheckbox(dir, currentDate, currentFile, index, checked);
			} catch (e) {
				error = String(e);
			}
		}
	};
}

function patchCheckbox(text: string, targetIdx: number, checked: boolean): string {
	let count = 0;
	return text.replace(/^(\s*[-*+] \[)([x ])(])/gm, (match, pre, _state, post) => {
		const hit = count === targetIdx;
		count++;
		return hit ? `${pre}${checked ? 'x' : ' '}${post}` : match;
	});
}
