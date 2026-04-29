export function isTauri(): boolean {
	return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
	if (!isTauri()) {
		throw new Error(`Not running in Tauri (command: ${cmd}). Use 'bun run tauri:dev' for full functionality.`);
	}
	const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
	return tauriInvoke<T>(cmd, args);
}

export async function openUrl(url: string | null | undefined): Promise<void> {
	if (!url) return;
	if (isTauri()) {
		const { open } = await import('@tauri-apps/plugin-shell');
		await open(url);
	} else {
		window.open(url, '_blank', 'noopener');
	}
}
