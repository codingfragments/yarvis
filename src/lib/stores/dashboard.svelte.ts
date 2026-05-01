import * as dashboardService from '$lib/services/dashboard';
import { isTauri } from '$lib/services/tauri';
import type {
	ActionItem,
	ActiveDealDef,
	BriefingConfig,
	DailyBriefing,
	DashboardQuestion,
	IntelligenceCategoryDef
} from '$lib/types';

let briefing = $state<DailyBriefing | null>(null);
let config = $state<BriefingConfig | null>(null);
let questions = $state<DashboardQuestion[]>([]);
let memory = $state<string | null>(null);
let lastLoaded = $state<Date | null>(null);
let loading = $state(false);
let submittingAnswer = $state(false);
let error = $state<string | null>(null);

export function getDashboardStore() {
	return {
		get briefing() { return briefing; },
		get config() { return config; },
		get questions() { return questions; },
		get memory() { return memory; },
		get lastLoaded() { return lastLoaded; },
		get loading() { return loading; },
		get submittingAnswer() { return submittingAnswer; },
		get error() { return error; },

		dealById(id: string | null | undefined): ActiveDealDef | null {
			if (!id || !config) return null;
			return config.active_deals.find((d) => d.id === id) ?? null;
		},

		categoryById(id: string): IntelligenceCategoryDef | null {
			if (!config) return null;
			return config.intelligence_categories.find((c) => c.id === id) ?? null;
		},

		async load(dailyDir: string, dailySrcDir: string, briefingsDir: string) {
			if (!isTauri()) {
				error = 'Dashboard requires Tauri runtime — start with `bun run tauri:dev`.';
				return;
			}
			loading = true;
			error = null;
			try {
				const [b, c, q] = await Promise.allSettled([
					dashboardService.readDaily(dailyDir, briefingsDir),
					dashboardService.readConfig(dailySrcDir),
					dashboardService.readQuestions(dailyDir)
				]);
				if (b.status === 'fulfilled') briefing = b.value;
				else throw new Error(b.reason);
				config = c.status === 'fulfilled' ? c.value : null;
				questions = q.status === 'fulfilled' ? q.value : [];
				lastLoaded = new Date();
			} catch (e) {
				error = String(e);
				briefing = null;
			} finally {
				loading = false;
			}
		},

		async softRefresh(dailyDir: string, dailySrcDir: string, briefingsDir: string) {
			if (!isTauri()) return;
			if (submittingAnswer) return;
			const [b, c, q] = await Promise.allSettled([
				dashboardService.readDaily(dailyDir, briefingsDir),
				dashboardService.readConfig(dailySrcDir),
				dashboardService.readQuestions(dailyDir)
			]);
			if (b.status === 'fulfilled') briefing = b.value;
			if (c.status === 'fulfilled') config = c.value;
			if (q.status === 'fulfilled') questions = q.value;
			lastLoaded = new Date();
		},

		isBusy(): boolean {
			return submittingAnswer;
		},

		async loadMemory(dailyDir: string) {
			if (!isTauri()) return;
			try {
				memory = await dashboardService.readMemory(dailyDir);
			} catch (e) {
				memory = null;
				error = String(e);
			}
		},

		async answerQuestion(dailyDir: string, title: string, answer: string) {
			if (!isTauri()) {
				throw new Error('Answering questions requires Tauri runtime.');
			}
			submittingAnswer = true;
			try {
				await dashboardService.answerQuestion(dailyDir, title, answer);
				questions = await dashboardService.readQuestions(dailyDir);
			} finally {
				submittingAnswer = false;
			}
		},

		async setActionDone(dailyDir: string, action: ActionItem, done: boolean) {
			if (!isTauri()) return;
			// Mutate the passed-in proxy directly. The action may belong to the
			// caller's local $state (e.g. the home page's own briefing) rather
			// than the store's briefing — finding it inside `briefing` would
			// mutate the wrong proxy and the caller's view wouldn't react.
			const previousDone = action.done;
			const previousCompletedAt = action.completed_at;
			const completedAt = done ? new Date().toISOString() : null;
			action.done = done;
			action.completed_at = completedAt;
			// Mirror to the store's own briefing if loaded so the dashboard view
			// stays in sync without waiting for the next softRefresh.
			if (briefing) {
				const mirror = briefing.action_items.find(
					(x) => (action.fingerprint && x.fingerprint === action.fingerprint) || x.id === action.id
				);
				if (mirror && mirror !== action) {
					mirror.done = done;
					mirror.completed_at = completedAt;
				}
			}
			try {
				await dashboardService.setActionDone(dailyDir, action.fingerprint, action.id, done);
			} catch (e) {
				action.done = previousDone;
				action.completed_at = previousCompletedAt;
				if (briefing) {
					const mirror = briefing.action_items.find(
						(x) => (action.fingerprint && x.fingerprint === action.fingerprint) || x.id === action.id
					);
					if (mirror && mirror !== action) {
						mirror.done = previousDone;
						mirror.completed_at = previousCompletedAt;
					}
				}
				error = String(e);
				throw e;
			}
		}
	};
}
