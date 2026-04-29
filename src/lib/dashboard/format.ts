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

export function eventClass(type: string): string {
	if (type === 'declined') return 'opacity-50 line-through';
	if (type === 'personal_block' || type === 'personal') return 'opacity-70';
	return '';
}

export function eventBorder(type: string, urgency: string): string {
	if (type === 'declined') return 'border-l-base-content/20';
	if (type === 'personal_block' || type === 'personal') return 'border-l-base-content/20';
	if (type === 'external' && (urgency === 'critical' || urgency === 'high')) return 'border-l-error';
	if (type === 'external') return 'border-l-warning';
	if (type === 'internal' && urgency === 'critical') return 'border-l-warning';
	if (type === 'internal') return 'border-l-success';
	return 'border-l-base-content/20';
}

export function priorityRank(p: string): number {
	return p === 'critical' ? 0 : p === 'high' ? 1 : p === 'medium' ? 2 : 3;
}
