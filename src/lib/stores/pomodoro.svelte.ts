import type { PomodoroPhase, PomodoroSettings } from '$lib/types';

const STORAGE_KEY = 'yarvis-pomodoro-settings';

const DEFAULT_SETTINGS: PomodoroSettings = {
	focusMinutes: 25,
	shortBreakMinutes: 5,
	longBreakMinutes: 15,
	sessionsBeforeLongBreak: 4,
	autoStartBreaks: false,
	autoStartFocus: false
};

function loadSettings(): PomodoroSettings {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
	} catch {
		// ignore corrupt data
	}
	return { ...DEFAULT_SETTINGS };
}

function saveSettings(s: PomodoroSettings) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

let phase = $state<PomodoroPhase>('idle');
let timeRemaining = $state(0);
let isRunning = $state(false);
let completedSessions = $state(0);
let settings = $state<PomodoroSettings>(loadSettings());
let intervalId: ReturnType<typeof setInterval> | null = null;

function phaseDuration(p: PomodoroPhase): number {
	switch (p) {
		case 'focus': return settings.focusMinutes * 60;
		case 'shortBreak': return settings.shortBreakMinutes * 60;
		case 'longBreak': return settings.longBreakMinutes * 60;
		default: return 0;
	}
}

function stopInterval() {
	if (intervalId !== null) {
		clearInterval(intervalId);
		intervalId = null;
	}
}

function startInterval() {
	stopInterval();
	intervalId = setInterval(() => {
		if (timeRemaining <= 1) {
			timeRemaining = 0;
			isRunning = false;
			stopInterval();
			onPhaseComplete();
		} else {
			timeRemaining--;
		}
	}, 1000);
}

function onPhaseComplete() {
	if (phase === 'focus') {
		completedSessions++;
		const nextPhase: PomodoroPhase =
			completedSessions % settings.sessionsBeforeLongBreak === 0
				? 'longBreak'
				: 'shortBreak';
		phase = nextPhase;
		timeRemaining = phaseDuration(nextPhase);
		if (settings.autoStartBreaks) {
			isRunning = true;
			startInterval();
		}
	} else if (phase === 'shortBreak' || phase === 'longBreak') {
		phase = 'focus';
		timeRemaining = phaseDuration('focus');
		if (settings.autoStartFocus) {
			isRunning = true;
			startInterval();
		}
	}
}

export function getPomodoroStore() {
	return {
		get phase() { return phase; },
		get timeRemaining() { return timeRemaining; },
		get isRunning() { return isRunning; },
		get completedSessions() { return completedSessions; },
		get settings() { return settings; },
		get isActive() { return phase !== 'idle'; },

		get formattedTime() {
			const m = Math.floor(timeRemaining / 60);
			const s = timeRemaining % 60;
			return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
		},

		get phaseLabel() {
			switch (phase) {
				case 'focus': return 'FOCUS';
				case 'shortBreak': return 'BREAK';
				case 'longBreak': return 'LONG BREAK';
				default: return '';
			}
		},

		start() {
			phase = 'focus';
			completedSessions = 0;
			timeRemaining = phaseDuration('focus');
			isRunning = true;
			startInterval();
		},

		pause() {
			isRunning = false;
			stopInterval();
		},

		resume() {
			if (phase !== 'idle' && timeRemaining > 0) {
				isRunning = true;
				startInterval();
			}
		},

		skip() {
			stopInterval();
			isRunning = false;
			onPhaseComplete();
		},

		reset() {
			stopInterval();
			phase = 'idle';
			timeRemaining = 0;
			isRunning = false;
			completedSessions = 0;
		},

		updateSettings(partial: Partial<PomodoroSettings>) {
			settings = { ...settings, ...partial };
			saveSettings(settings);
		},

		resetSettings() {
			settings = { ...DEFAULT_SETTINGS };
			saveSettings(settings);
		}
	};
}
