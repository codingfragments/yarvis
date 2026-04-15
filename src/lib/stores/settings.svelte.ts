import * as settingsService from '$lib/services/settings';
import { isTauri } from '$lib/services/tauri';
import type { Settings } from '$lib/types';

const DEFAULT_SETTINGS: Settings = {
	theme: 'dark',
	accent_color: 'mauve',
	data_directory: '~/.yarvis',
	pixel_font_headings: true,
	window_opacity: 0.95,
	launch_at_startup: false,
	python_path: 'python3'
};

let settings = $state<Settings>({ ...DEFAULT_SETTINGS });
let loaded = $state(false);
let saving = $state(false);
let error = $state<string | null>(null);

export function getSettingsStore() {
	return {
		get current() { return settings; },
		get loaded() { return loaded; },
		get saving() { return saving; },
		get error() { return error; },

		async load() {
			if (!isTauri()) {
				settings = { ...DEFAULT_SETTINGS };
				loaded = true;
				return;
			}
			try {
				settings = await settingsService.getSettings();
				loaded = true;
				error = null;
			} catch (e) {
				error = String(e);
				settings = { ...DEFAULT_SETTINGS };
				loaded = true;
			}
		},

		async save() {
			if (!isTauri()) return;
			saving = true;
			error = null;
			try {
				await settingsService.saveSettings(settings);
			} catch (e) {
				error = String(e);
			} finally {
				saving = false;
			}
		},

		async reset() {
			if (!isTauri()) {
				settings = { ...DEFAULT_SETTINGS };
				return;
			}
			try {
				settings = await settingsService.getDefaultSettings();
				await settingsService.saveSettings(settings);
				error = null;
			} catch (e) {
				error = String(e);
			}
		},

		update(partial: Partial<Settings>) {
			settings = { ...settings, ...partial };
		}
	};
}
