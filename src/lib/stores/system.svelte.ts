import * as systemService from '$lib/services/system';
import { isTauri } from '$lib/services/tauri';
import type { SystemInfo } from '$lib/types';

interface SystemStatus {
	info: SystemInfo | null;
	pythonVersion: string;
	sqliteVersion: string;
	dataDirSize: string;
	loading: boolean;
	error: string | null;
}

let status = $state<SystemStatus>({
	info: null,
	pythonVersion: '',
	sqliteVersion: '',
	dataDirSize: '',
	loading: false,
	error: null
});

export function getSystemStore() {
	return {
		get current() { return status; },

		async load(pythonPath: string = 'python3') {
			if (!isTauri()) {
				status = {
					info: { app_version: '0.1.0', os: 'browser', arch: 'n/a', rust_version: 'n/a' },
					pythonVersion: 'n/a (browser mode)',
					sqliteVersion: 'n/a (browser mode)',
					dataDirSize: 'n/a',
					loading: false,
					error: 'Running in browser — use "bun run tauri:dev" for full system info'
				};
				return;
			}
			status.loading = true;
			status.error = null;
			try {
				const [info, pyVer, sqliteVer, dirSize] = await Promise.all([
					systemService.getSystemInfo(),
					systemService.getPythonVersion(pythonPath).catch(() => 'not found'),
					systemService.getSqliteVersion(),
					systemService.getDataDirSize()
				]);
				status = {
					info,
					pythonVersion: pyVer,
					sqliteVersion: sqliteVer,
					dataDirSize: dirSize,
					loading: false,
					error: null
				};
			} catch (e) {
				status.loading = false;
				status.error = String(e);
			}
		}
	};
}
