import { readPrep } from '$lib/services/dashboard';
import type { MeetingPrep } from '$lib/types';

class PrepDrawer {
	open = $state(false);
	content = $state<string | null>(null);
	error = $state<string | null>(null);
	meta = $state<{ title: string; time: string; filename: string } | null>(null);

	get title() {
		return this.meta?.title ?? 'Meeting prep';
	}

	get subtitle() {
		return this.meta ? `${this.meta.time} · ${this.meta.filename}` : null;
	}

	async openPrep(p: MeetingPrep, briefingsDir: string, briefingDate: string) {
		if (!p.file) return;
		// Load content BEFORE opening the popup so the viewer mounts with the
		// markdown already in place. Mirrors the memory-viewer flow and avoids
		// a Svelte 5 prod-mode race where the post-mount reactive update for
		// the conditional sometimes fails to render the markdown body.
		this.meta = { title: p.title, time: p.time, filename: p.file };
		this.content = null;
		this.error = null;
		try {
			this.content = await readPrep(briefingsDir, briefingDate, p.file);
		} catch (e) {
			this.error = String(e);
		} finally {
			this.open = true;
		}
	}

	close() {
		this.open = false;
	}
}

const instance = new PrepDrawer();

export function getPrepDrawerStore() {
	return instance;
}
