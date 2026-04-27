import * as dashboardService from '$lib/services/dashboard';
import { isTauri } from '$lib/services/tauri';
import type {
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
let error = $state<string | null>(null);

export function getDashboardStore() {
	return {
		get briefing() { return briefing; },
		get config() { return config; },
		get questions() { return questions; },
		get memory() { return memory; },
		get lastLoaded() { return lastLoaded; },
		get loading() { return loading; },
		get error() { return error; },

		dealById(id: string | null | undefined): ActiveDealDef | null {
			if (!id || !config) return null;
			return config.active_deals.find((d) => d.id === id) ?? null;
		},

		categoryById(id: string): IntelligenceCategoryDef | null {
			if (!config) return null;
			return config.intelligence_categories.find((c) => c.id === id) ?? null;
		},

		async load(dailyDir: string, dailySrcDir: string) {
			if (!isTauri()) {
				error = 'Dashboard requires Tauri runtime — start with `bun run tauri:dev`.';
				return;
			}
			loading = true;
			error = null;
			try {
				const [b, c, q] = await Promise.allSettled([
					dashboardService.readDaily(dailyDir),
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

		async loadMemory(dailyDir: string) {
			if (!isTauri()) return;
			try {
				memory = await dashboardService.readMemory(dailyDir);
			} catch (e) {
				memory = null;
				error = String(e);
			}
		}
	};
}
