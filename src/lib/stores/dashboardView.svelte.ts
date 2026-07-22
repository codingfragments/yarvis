import { getDashboardStore } from './dashboard.svelte';
import { buildSearchItems } from '$lib/dashboard/searchIndex';

const dashboard = getDashboardStore();

let dealLens = $state<string | null>(null);
let topicLens = $state<string | null>(null);
let onlyChannelsWithMessages = $state(true);

function setDealLens(v: string | null) {
	dealLens = v;
	if (v !== null) topicLens = null;
}

function setTopicLens(v: string | null) {
	topicLens = v;
	if (v !== null) dealLens = null;
}

function tagsMatchDeal(tags: string[] | null | undefined, dealId: string): boolean {
	if (!tags) return false;
	const id = dealId.toLowerCase();
	return tags.some((t) => t.toLowerCase() === id);
}

// Deal-only activation — drives the filters below that have no topic-lens
// equivalent (meeting preps, intel tags): MeetingPrep/IntelItem carry
// `deal_tag`/`tags` but no `initiative`, so a Topic-lens selection leaves
// them unfiltered rather than emptying them out.
const dealLensActive = $derived(dealLens !== null);
const topicLensActive = $derived(topicLens !== null);
const lensActive = $derived(dealLensActive || topicLensActive);

const lensDeal = $derived(dealLensActive ? dashboard.dealById(dealLens) : null);
const lensTopic = $derived(topicLensActive ? dashboard.initiativeById(topicLens) : null);
const lensName = $derived(lensDeal?.name ?? lensTopic?.label ?? dealLens ?? topicLens);

const filteredActions = $derived.by(() => {
	const all = dashboard.briefing?.action_items ?? [];
	if (topicLensActive) return all.filter((a) => a.initiative === topicLens);
	return dealLensActive ? all.filter((a) => a.deal_tag === dealLens) : all;
});

const filteredPreps = $derived.by(() => {
	const all = dashboard.briefing?.meeting_preps ?? [];
	return dealLensActive ? all.filter((p) => p.deal_tag === dealLens) : all;
});

const filteredEvents = $derived.by(() => {
	const source = dashboard.briefing?.calendar?.events ?? [];
	let filtered: typeof source;
	if (topicLensActive) {
		filtered = source.filter((e) => e.initiative === topicLens);
	} else if (dealLensActive) {
		filtered = source.filter((e) => e.deal_tag === dealLens);
	} else {
		filtered = source.slice();
	}
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
	if (topicLensActive) return all.filter((m) => m.initiative === topicLens);
	return dealLensActive ? all.filter((m) => m.deal_tag === dealLens) : all;
});

const filteredEmailFyi = $derived.by(() => {
	const all = dashboard.briefing?.email?.fyi ?? [];
	if (topicLensActive) return all.filter((m) => m.initiative === topicLens);
	return dealLensActive ? all.filter((m) => m.deal_tag === dealLens) : all;
});

const filteredChannels = $derived.by(() => {
	const all = dashboard.briefing?.slack?.channels ?? [];
	let channels: typeof all;
	if (dealLensActive) {
		channels = all.filter((ch) => ch.deal_tag === dealLens);
	} else if (topicLensActive) {
		channels = all
			.map((ch) => ({ ...ch, messages: ch.messages.filter((m) => m.initiative === topicLens) }))
			.filter((ch) => ch.messages.length > 0);
	} else {
		channels = all;
	}
	return onlyChannelsWithMessages ? channels.filter((ch) => ch.messages.length > 0) : channels;
});

const filteredIntel = $derived.by(() => {
	const all = dashboard.briefing?.intelligence ?? [];
	if (!dealLensActive) return all;
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
		set dealLens(v: string | null) { setDealLens(v); },

		get topicLens() { return topicLens; },
		set topicLens(v: string | null) { setTopicLens(v); },

		get onlyChannelsWithMessages() { return onlyChannelsWithMessages; },
		set onlyChannelsWithMessages(v: boolean) { onlyChannelsWithMessages = v; },

		get lensActive() { return lensActive; },
		get lensDeal() { return lensDeal; },
		get lensTopic() { return lensTopic; },
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
