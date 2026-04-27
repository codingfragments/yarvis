import { invoke } from './tauri';
import type {
	BriefingConfig,
	DailyBriefing,
	DailyStatus,
	DashboardQuestion
} from '$lib/types';

export async function readDaily(dailyDir: string, briefingsDir: string): Promise<DailyBriefing> {
	return invoke<DailyBriefing>('read_daily', { dailyDir, briefingsDir });
}

export async function readConfig(dailySrcDir: string): Promise<BriefingConfig> {
	return invoke<BriefingConfig>('read_config', { dailySrcDir });
}

export async function readMemory(dailyDir: string): Promise<string> {
	return invoke<string>('read_memory', { dailyDir });
}

export async function getDailyStatus(dailyDir: string): Promise<DailyStatus> {
	return invoke<DailyStatus>('daily_status', { dailyDir });
}

export async function readQuestions(dailyDir: string): Promise<DashboardQuestion[]> {
	return invoke<DashboardQuestion[]>('read_questions', { dailyDir });
}
