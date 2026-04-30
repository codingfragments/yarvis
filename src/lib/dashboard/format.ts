export type StalenessTone = 'fresh' | 'aging' | 'stale';

export function liveMinutesAway(startsAt: string | null | undefined, nowMs: number): number | null {
	if (!startsAt) return null;
	const t = Date.parse(startsAt);
	if (Number.isNaN(t)) return null;
	return Math.round((t - nowMs) / 60000);
}

export function fmtMinutesAway(m: number | null): string {
	if (m === null) return '';
	if (m <= 0) return 'now';
	if (m < 60) return `${m}m`;
	const h = Math.floor(m / 60);
	const mm = m % 60;
	return mm === 0 ? `${h}h` : `${h}h ${mm}m`;
}

export function staleness(
	generatedAt: string | null | undefined,
	nowMs: number
): { label: string; tone: StalenessTone } {
	if (!generatedAt) return { label: '—', tone: 'stale' };
	const ageMs = nowMs - Date.parse(generatedAt);
	if (Number.isNaN(ageMs)) return { label: '—', tone: 'stale' };
	const mins = Math.max(0, Math.round(ageMs / 60000));
	if (mins < 30) return { label: `${mins}m`, tone: 'fresh' };
	if (mins < 240) {
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		return { label: `${h}h ${m}m`, tone: 'aging' };
	}
	const h = Math.round(mins / 60);
	return { label: `${h}h`, tone: 'stale' };
}

export interface RowAccentOpts {
	urgency?: string | null;
	eventType?: string | null;
	activityLevel?: string | null;
}

/**
 * Maps semantic row state to a Tailwind `border-l-*` class for the accent rail.
 * Calendar events use the richer type+urgency mapping; plain rows fall back to urgency only.
 */
export function rowAccent(opts: RowAccentOpts): string {
	const { eventType, urgency, activityLevel } = opts;

	if (eventType) {
		if (eventType === 'declined') return 'border-l-base-content/20';
		if (eventType === 'personal_block' || eventType === 'personal') return 'border-l-base-content/20';
		if (eventType === 'external' && (urgency === 'critical' || urgency === 'high')) return 'border-l-error';
		if (eventType === 'external') return 'border-l-warning';
		if (eventType === 'internal' && urgency === 'critical') return 'border-l-warning';
		if (eventType === 'internal') return 'border-l-success';
		return 'border-l-base-content/20';
	}

	if (activityLevel) {
		if (activityLevel === 'high') return 'border-l-warning';
		if (activityLevel === 'medium') return 'border-l-info';
		return 'border-l-base-content/30';
	}

	if (urgency === 'critical') return 'border-l-error';
	if (urgency === 'high') return 'border-l-warning';
	if (urgency === 'medium') return 'border-l-info';
	return 'border-l-base-content/30';
}

export function priorityRank(p: string): number {
	return p === 'critical' ? 0 : p === 'high' ? 1 : p === 'medium' ? 2 : 3;
}

export type ChipTone = 'success' | 'warning' | 'info' | 'error' | 'neutral';

export function questionTone(status: string): ChipTone {
	if (status === 'PENDING') return 'warning';
	if (status === 'ANSWERED') return 'success';
	return 'neutral';
}

export function activityTone(level: string): ChipTone {
	if (level === 'high') return 'warning';
	if (level === 'medium') return 'info';
	return 'neutral';
}

/**
 * Render a clock-style HH:MM from either an ISO-ish string or a Date.
 *
 * Strings: pulls the time portion via the `T` separator (handles "…T15:00",
 * "…T15:00:00", "…T15:00:00.123+02:00", etc.) so we don't depend on the
 * fragile `slice(11, 16)` position assumption.
 *
 * Dates: formats in the user's local timezone, two-digit padded.
 */
export function fmtClock(input: Date | string | null | undefined): string {
	if (input === null || input === undefined || input === '') return '';
	if (typeof input === 'string') {
		const m = input.match(/T(\d{2}:\d{2})/);
		if (m) return m[1];
		return input.slice(0, 5);
	}
	const hh = String(input.getHours()).padStart(2, '0');
	const mm = String(input.getMinutes()).padStart(2, '0');
	return `${hh}:${mm}`;
}
