<script lang="ts">
	import type { ActiveDealDef, Calendar, CalendarEvent as CalendarEventData, Conflict } from '$lib/types';
	import CalendarEvent from '../CalendarEvent.svelte';
	import Callout from '../Callout.svelte';
	import EmptyState from '../EmptyState.svelte';
	import SectionCard from '../SectionCard.svelte';

	interface Props {
		calendar: Calendar;
		events: CalendarEventData[];
		conflicts: Conflict[];
		lensActive: boolean;
		lensName: string | null;
		dealById: (id: string | null | undefined) => ActiveDealDef | null;
	}

	let { calendar, events, conflicts, lensActive, lensName, dealById }: Props = $props();

	const conflictsNeedingAction = $derived(conflicts.filter((c) => c.action_needed).length);
</script>

<div class="flex flex-col gap-3">
	{#if calendar.summary && !lensActive}
		<div class="rounded-lg bg-base-200/40 border border-base-content/10 px-3 py-2 flex items-center gap-2 text-xs italic text-base-content/70">
			<span aria-hidden="true">📅</span>
			<span>{calendar.summary}</span>
		</div>
	{/if}
	{#if conflicts.length > 0}
		<SectionCard
			icon="⚠️"
			title="Conflicts"
			count={conflicts.length}
			subtitle={conflictsNeedingAction > 0
				? `${conflictsNeedingAction} need${conflictsNeedingAction === 1 ? 's' : ''} action`
				: null}
			collapsible
			defaultOpen={false}
		>
			<div class="flex flex-col gap-2">
				{#each conflicts as c}
					<Callout tone="warning" icon="⚠" title="Conflict at {c.time}">
						<p class="text-xs text-base-content/80 break-words">{c.description}</p>
						{#if c.action_needed}
							<p class="text-xs font-semibold text-base-content/90 mt-1.5 break-words">→ {c.action_needed}</p>
						{/if}
					</Callout>
				{/each}
			</div>
		</SectionCard>
	{/if}
	{#if events.length === 0}
		<EmptyState items="events" {lensActive} {lensName} fallback="No events today." />
	{/if}
	<ul class="flex flex-col gap-1">
		{#each events as e}
			<CalendarEvent event={e} deal={dealById(e.deal_tag)} />
		{/each}
	</ul>
</div>
