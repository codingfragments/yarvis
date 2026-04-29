import { readPrep } from '$lib/services/dashboard';
import type { MeetingPrep } from '$lib/types';

let open = $state(false);
let loading = $state(false);
let content = $state<string | null>(null);
let error = $state<string | null>(null);
let meta = $state<{ title: string; time: string; filename: string } | null>(null);

export function getPrepDrawerStore() {
	return {
		get open() { return open; },
		get loading() { return loading; },
		get content() { return content; },
		get error() { return error; },
		get title() { return meta?.title ?? 'Meeting prep'; },
		get subtitle() { return meta ? `${meta.time} · ${meta.filename}` : null; },

		async openPrep(p: MeetingPrep, briefingsDir: string, briefingDate: string) {
			if (!p.file) return;
			meta = { title: p.title, time: p.time, filename: p.file };
			content = null;
			error = null;
			loading = true;
			open = true;
			try {
				content = await readPrep(briefingsDir, briefingDate, p.file);
			} catch (e) {
				error = String(e);
			} finally {
				loading = false;
			}
		},

		close() {
			open = false;
		}
	};
}
