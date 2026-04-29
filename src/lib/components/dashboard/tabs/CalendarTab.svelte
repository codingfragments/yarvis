<script lang="ts">
	import type { ActiveDealDef, Calendar, CalendarEvent, Conflict } from '$lib/types';
	import DealPill from '../DealPill.svelte';
	import UrgencyDot from '../UrgencyDot.svelte';
	import ExternalLink from '../ExternalLink.svelte';
	import { eventBorder, eventClass } from '$lib/dashboard/format';

	interface Props {
		calendar: Calendar;
		events: CalendarEvent[];
		conflicts: Conflict[];
		lensActive: boolean;
		lensName: string | null;
		dealById: (id: string | null | undefined) => ActiveDealDef | null;
	}

	let { calendar, events, conflicts, lensActive, lensName, dealById }: Props = $props();
</script>

<div class="flex flex-col gap-3">
	{#if calendar.summary && !lensActive}
		<div class="rounded-lg bg-base-200/40 border border-base-content/10 px-3 py-2 flex items-center gap-2 text-xs italic text-base-content/70">
			<span aria-hidden="true">📅</span>
			<span>{calendar.summary}</span>
		</div>
	{/if}
	{#if conflicts.length > 0}
		<div class="flex flex-col gap-2">
			{#each conflicts as c}
				<div class="min-w-0 rounded-lg bg-warning/10 border border-warning/20 px-3 py-2.5">
					<div class="flex items-center gap-2 text-xs font-medium text-warning mb-1">⚠️ Conflict at {c.time}</div>
					<p class="text-xs text-base-content/80 break-words">{c.description}</p>
					{#if c.action_needed}
						<p class="text-xs font-semibold text-base-content/90 mt-1.5 break-words">→ {c.action_needed}</p>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
	{#if events.length === 0}
		<p class="text-xs text-base-content/40 italic">
			{lensActive ? `No events for ${lensName}.` : 'No events today.'}
		</p>
	{/if}
	<ul class="flex flex-col gap-1">
		{#each events as e}
			{@const deal = dealById(e.deal_tag)}
			<li
				class="flex items-stretch gap-3 rounded-lg border-l-2 {eventBorder(e.type, e.urgency)} bg-base-100/30 px-3 py-2 text-xs {eventClass(e.type)}"
			>
				<div class="font-mono text-base-content/60 w-24 shrink-0 pt-0.5">{e.start}–{e.end}</div>
				<div class="flex-1 min-w-0 flex flex-col gap-0.5">
					<div class="flex items-center gap-1.5 flex-wrap">
						<UrgencyDot urgency={e.urgency} />
						<span class="font-medium text-base-content/90 truncate">{e.title}</span>
						<DealPill {deal} fallbackId={e.deal_tag} />
						{#if e.initiative}<span class="text-xs text-base-content/50">· {e.initiative}</span>{/if}
					</div>
					{#if e.notes}<p class="text-xs text-base-content/55 leading-snug break-words">{e.notes}</p>{/if}
					{#if e.participants.length > 0}
						<p class="text-xs text-base-content/40 truncate">{e.participants.join(', ')}</p>
					{/if}
				</div>
				<div class="flex items-center gap-1 shrink-0">
					{#if e.links?.zoom}<ExternalLink href={e.links.zoom} icon="📹" title="Zoom" />{/if}
					{#if e.links?.doc}<ExternalLink href={e.links.doc} icon="📄" title="Doc" />{/if}
					{#if e.links?.other}<ExternalLink href={e.links.other} icon="🔗" title="Link" />{/if}
				</div>
			</li>
		{/each}
	</ul>
</div>
