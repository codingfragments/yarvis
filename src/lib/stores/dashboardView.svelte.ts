import { getDashboardStore } from './dashboard.svelte';
import { buildSearchItems } from '$lib/dashboard/searchIndex';

const dashboard = getDashboardStore();

let dealLens = $state<string | null>(null);

function tagsMatchDeal(tags: string[] | null | undefined, dealId: string): boolean {
	if (!tags) return false;
	const id = dealId.toLowerCase();
	return tags.some((t) => t.toLowerCase() === id);
}

const lensActive = $derived(dealLens !== null);
const lensDeal = $derived(lensActive ? dashboard.dealById(dealLens) : null);
const lensName = $derived(lensDeal?.name ?? dealLens);

const filteredActions = $derived.by(() => {
	const all = dashboard.briefing?.action_items ?? [];
	return lensActive ? all.filter((a) => a.deal_tag === dealLens) : all;
});

const filteredPreps = $derived.by(() => {
	const all = dashboard.briefing?.meeting_preps ?? [];
	return lensActive ? all.filter((p) => p.deal_tag === dealLens) : all;
});

const filteredEvents = $derived.by(() => {
	const source = dashboard.briefing?.calendar?.events ?? [];
	const filtered = lensActive ? source.filter((e) => e.deal_tag === dealLens) : source.slice();
	// `start` is "HH:MM" — lexicographic sort is chronological. Copy first
	// so we never mutate the briefing payload from a derived.
	filtered.sort((a, b) => a.start.localeCompare(b.start));
	return filtered;
});

const filteredConflicts = $derived.by(() => {
	const all = dashboard.briefing?.calendar?.conflicts ?? [];
	if (!lensActive) return all;
	const visibleTitles = new Set(filteredEvents.map((e) => e.title));
	return all.filter((c) => c.event_titles.some((t) => visibleTitles.has(t)));
});

const filteredEmailActToday = $derived.by(() => {
	const all = dashboard.briefing?.email?.act_today ?? [];
	return lensActive ? all.filter((m) => m.deal_tag === dealLens) : all;
});

const filteredEmailFyi = $derived.by(() => {
	const all = dashboard.briefing?.email?.fyi ?? [];
	return lensActive ? all.filter((m) => m.deal_tag === dealLens) : all;
});

const filteredChannels = $derived.by(() => {
	const all = dashboard.briefing?.slack?.channels ?? [];
	return lensActive ? all.filter((ch) => ch.deal_tag === dealLens) : all;
});

const filteredIntel = $derived.by(() => {
	const all = dashboard.briefing?.intelligence ?? [];
	if (!lensActive) return all;
	return all
		.map((cat) => ({
			...cat,
			items: cat.items.filter((it) => tagsMatchDeal(it.tags, dealLens!))
		}))
		.filter((cat) => cat.items.length > 0);
});

const searchItems = $derived(
	buildSearchItems({
		actions: filteredActions,
		emailActToday: filteredEmailActToday,
		emailFyi: filteredEmailFyi,
		channels: filteredChannels,
		events: filteredEvents,
		preps: filteredPreps,
		intel: filteredIntel
	})
);

const counts = $derived.by(() => {
	const b = dashboard.briefing;
	if (!b) return { calendar: 0, email: 0, slack: 0, research: 0, conflicts: 0, pending: 0 };
	return {
		calendar: filteredEvents.length,
		email: filteredEmailActToday.length + filteredEmailFyi.length,
		slack: filteredChannels.length,
		research: filteredIntel.reduce((n, c) => n + c.items.length, 0),
		conflicts: filteredConflicts.length,
		pending: dashboard.questions.filter((q) => q.status === 'PENDING').length
	};
});

export function getDashboardViewStore() {
	return {
		get dealLens() { return dealLens; },
		set dealLens(v: string | null) { dealLens = v; },

		get lensActive() { return lensActive; },
		get lensDeal() { return lensDeal; },
		get lensName() { return lensName; },

		get filteredActions() { return filteredActions; },
		get filteredPreps() { return filteredPreps; },
		get filteredEvents() { return filteredEvents; },
		get filteredConflicts() { return filteredConflicts; },
		get filteredEmailActToday() { return filteredEmailActToday; },
		get filteredEmailFyi() { return filteredEmailFyi; },
		get filteredChannels() { return filteredChannels; },
		get filteredIntel() { return filteredIntel; },
		get counts() { return counts; },
		get searchItems() { return searchItems; }
	};
}
