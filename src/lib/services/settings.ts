import { invoke } from './tauri';
import type { Settings } from '$lib/types';

export async function getSettings(): Promise<Settings> {
	return invoke<Settings>('get_settings');
}

export async function saveSettings(settings: Settings): Promise<void> {
	return invoke<void>('save_settings', { settings });
}

export async function getDefaultSettings(): Promise<Settings> {
	return invoke<Settings>('get_default_settings');
}
