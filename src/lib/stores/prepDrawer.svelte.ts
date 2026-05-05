import { readPrep } from '$lib/services/dashboard';
import type { MeetingPrep } from '$lib/types';

class PrepDrawer {
	open = $state(false);
	loading = $state(false);
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
		this.meta = { title: p.title, time: p.time, filename: p.file };
		this.content = null;
		this.error = null;
		this.loading = true;
		this.open = true;
		try {
			this.content = await readPrep(briefingsDir, briefingDate, p.file);
		} catch (e) {
			this.error = String(e);
		} finally {
			this.loading = false;
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
