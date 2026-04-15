import { invoke } from './tauri';
import type { SystemInfo } from '$lib/types';

export async function getSystemInfo(): Promise<SystemInfo> {
	return invoke<SystemInfo>('get_system_info');
}

export async function getPythonVersion(pythonPath: string): Promise<string> {
	return invoke<string>('get_python_version', { pythonPath });
}

export async function getSqliteVersion(): Promise<string> {
	return invoke<string>('get_sqlite_version');
}

export async function getDataDirSize(): Promise<string> {
	return invoke<string>('get_data_dir_size');
}
