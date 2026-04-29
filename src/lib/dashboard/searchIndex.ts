import type {
	ActionItem,
	CalendarEvent,
	EmailItem,
	IntelCategory,
	MeetingPrep,
	SlackChannel
} from '$lib/types';

export type SearchKind =
	| 'action'
	| 'email'
	| 'slack-channel'
	| 'slack-message'
	| 'event'
	| 'intel'
	| 'prep';

export interface SearchItem {
	id: string;
	kind: SearchKind;
	title: string;
	subtitle?: string;
	hay: string;
	url?: string | null;
	prepIndex?: number;
}

export interface SearchSources {
	actions: ActionItem[];
	emailActToday: EmailItem[];
	emailFyi: EmailItem[];
	channels: SlackChannel[];
	events: CalendarEvent[];
	preps: MeetingPrep[];
	intel: IntelCategory[];
}

const lc = (s: string | null | undefined) => (s ?? '').toLowerCase();

export function buildSearchItems(s: SearchSources): SearchItem[] {
	const items: SearchItem[] = [];

	s.actions.forEach((a) => {
		items.push({
			id: `action:${a.id}`,
			kind: 'action',
			title: a.text,
			subtitle: [a.deadline, a.deal_tag].filter(Boolean).join(' · ') || undefined,
			hay: lc([a.text, a.deadline, a.deal_tag, a.source_type].filter(Boolean).join(' ')),
			url: a.url
		});
	});

	s.emailActToday.concat(s.emailFyi).forEach((m) => {
		items.push({
			id: `email:${m.id}`,
			kind: 'email',
			title: m.subject,
			subtitle: `${m.from}${m.deal_tag ? ' · ' + m.deal_tag : ''}`,
			hay: lc([m.from, m.subject, m.summary, m.action, m.context, m.deal_tag, ...(m.tags ?? [])].filter(Boolean).join(' ')),
			url: m.url
		});
	});

	s.channels.forEach((ch) => {
		items.push({
			id: `channel:${ch.channel_id}`,
			kind: 'slack-channel',
			title: ch.channel_name,
			subtitle: `${ch.activity_level}${ch.deal_tag ? ' · ' + ch.deal_tag : ''}`,
			hay: lc([ch.channel_name, ch.deal_tag, ch.activity_level].filter(Boolean).join(' ')),
			url: ch.url
		});
		ch.messages.forEach((msg, mi) => {
			items.push({
				id: `msg:${ch.channel_id}:${mi}`,
				kind: 'slack-message',
				title: msg.summary,
				subtitle: `${msg.author ?? 'unknown'} · ${ch.channel_name}`,
				hay: lc([msg.author, msg.summary, msg.action, ch.channel_name].filter(Boolean).join(' ')),
				url: ch.url
			});
		});
	});

	s.events.forEach((e, i) => {
		items.push({
			id: `event:${i}`,
			kind: 'event',
			title: e.title,
			subtitle: `${e.start}–${e.end}${e.deal_tag ? ' · ' + e.deal_tag : ''}`,
			hay: lc([e.title, e.notes, e.initiative, e.deal_tag, ...(e.participants ?? [])].filter(Boolean).join(' ')),
			url: e.links?.zoom ?? e.links?.doc ?? e.links?.other ?? null
		});
	});

	s.preps.forEach((p, i) => {
		items.push({
			id: `prep:${i}`,
			kind: 'prep',
			title: p.title,
			subtitle: `${p.time}${p.deal_tag ? ' · ' + p.deal_tag : ''}`,
			hay: lc([p.title, p.deal_tag, p.time].filter(Boolean).join(' ')),
			prepIndex: i
		});
	});

	s.intel.forEach((cat) => {
		cat.items.forEach((it, i) => {
			items.push({
				id: `intel:${cat.category_id}:${i}`,
				kind: 'intel',
				title: it.headline,
				subtitle: it.source ?? cat.category_id,
				hay: lc([it.headline, it.detail, it.relevance, ...(it.tags ?? [])].filter(Boolean).join(' ')),
				url: it.url
			});
		});
	});

	return items;
}
