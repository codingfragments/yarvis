export type RefreshTarget = {
	id: string;
	softRefresh: () => Promise<void>;
	isBusy?: () => boolean;
};

let intervalMs = $state(5 * 60_000);
let enabled = $state(true);
let lastTickAt = $state<Date | null>(null);
let nextTickAt = $state<Date | null>(null);
let running = $state(false);

const targets = new Map<string, RefreshTarget>();
let timer: ReturnType<typeof setInterval> | null = null;
let visibilityHandler: (() => void) | null = null;
let focusHandler: (() => void) | null = null;
let started = false;

function clearTimer() {
	if (timer !== null) {
		clearInterval(timer);
		timer = null;
	}
	nextTickAt = null;
}

function scheduleNext() {
	nextTickAt = new Date(Date.now() + intervalMs);
}

async function runTick(force = false) {
	if (running) return;
	if (!force && typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
	if (!force && targets.size === 0) {
		lastTickAt = new Date();
		scheduleNext();
		return;
	}
	const ready: RefreshTarget[] = [];
	for (const t of targets.values()) {
		if (t.isBusy?.() === true) continue;
		ready.push(t);
	}
	if (ready.length === 0) {
		lastTickAt = new Date();
		scheduleNext();
		return;
	}
	running = true;
	try {
		await Promise.allSettled(ready.map((t) => t.softRefresh()));
		lastTickAt = new Date();
	} finally {
		running = false;
		scheduleNext();
	}
}

function restartTimer() {
	clearTimer();
	if (!enabled) return;
	timer = setInterval(() => void runTick(), intervalMs);
	scheduleNext();
}

export function getRefreshStore() {
	return {
		get lastTickAt() { return lastTickAt; },
		get nextTickAt() { return nextTickAt; },
		get running() { return running; },
		get enabled() { return enabled; },
		get intervalMs() { return intervalMs; },

		register(target: RefreshTarget): () => void {
			targets.set(target.id, target);
			return () => {
				targets.delete(target.id);
			};
		},

		async triggerNow() {
			await runTick(true);
		},

		configure(opts: { enabled: boolean; intervalMinutes: number }) {
			const newMs = Math.max(1, Math.min(60, opts.intervalMinutes)) * 60_000;
			const changed = opts.enabled !== enabled || newMs !== intervalMs;
			enabled = opts.enabled;
			intervalMs = newMs;
			if (started && changed) restartTimer();
		},

		start() {
			if (started) return;
			started = true;
			if (typeof window === 'undefined') return;

			visibilityHandler = () => {
				if (document.visibilityState === 'visible') {
					void runTick(true);
				}
			};
			focusHandler = () => {
				void runTick(true);
			};
			document.addEventListener('visibilitychange', visibilityHandler);
			window.addEventListener('focus', focusHandler);
			restartTimer();
		},

		stop() {
			if (!started) return;
			started = false;
			clearTimer();
			if (typeof window !== 'undefined') {
				if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
				if (focusHandler) window.removeEventListener('focus', focusHandler);
			}
			visibilityHandler = null;
			focusHandler = null;
		}
	};
}
