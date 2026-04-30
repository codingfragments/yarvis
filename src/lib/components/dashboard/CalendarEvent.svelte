<script lang="ts">
	import type { ActiveDealDef, CalendarEvent } from '$lib/types';
	import AccentRow from './AccentRow.svelte';
	import DealPill from './DealPill.svelte';
	import ExternalLink from './ExternalLink.svelte';
	import { rowAccent } from '$lib/dashboard/format';

	interface Props {
		event: CalendarEvent;
		deal: ActiveDealDef | null;
	}

	let { event: e, deal }: Props = $props();

	let expanded = $state(false);

	const accent = $derived(rowAccent({ urgency: e.urgency, eventType: e.type }));
	const declined = $derived(e.type === 'declined');
	const muted = $derived(e.type === 'personal_block' || e.type === 'personal');
</script>

<AccentRow {accent} dim={declined || muted} strike={declined}>
	{#snippet leading()}
		<div class="font-mono text-base-content/60 w-24 shrink-0 pt-0.5">{e.start}–{e.end}</div>
	{/snippet}

	<div class="flex flex-col gap-0.5">
		<div class="flex items-center gap-1.5 flex-wrap">
			<span class="font-medium text-base-content/90 truncate">{e.title}</span>
			<DealPill {deal} fallbackId={e.deal_tag} />
			{#if e.initiative}<span class="text-xs text-base-content/50">· {e.initiative}</span>{/if}
		</div>
		{#if e.notes}<p class="text-xs text-base-content/55 leading-snug break-words">{e.notes}</p>{/if}
		{#if e.participants.length > 0}
			{#if expanded}
				<div class="flex flex-wrap items-center gap-1 mt-0.5">
					<span class="text-base-content/40 mr-0.5" aria-hidden="true">👥</span>
					{#each e.participants as p}
						<span class="rounded-full bg-base-300/60 text-base-content/75 px-2 py-0.5 text-xs">{p}</span>
					{/each}
					<button
						type="button"
						class="text-base-content/40 hover:text-base-content text-xs ml-1 leading-none"
						onclick={() => (expanded = false)}
						title="Collapse attendees"
						aria-label="Collapse attendees"
					>×</button>
				</div>
			{:else}
				<div class="relative group">
					<button
						type="button"
						class="text-xs text-base-content/40 truncate text-left w-full block hover:text-base-content/70 transition-colors"
						onclick={() => (expanded = true)}
						title="Click to show all {e.participants.length} attendee{e.participants.length === 1 ? '' : 's'}"
					>
						{e.participants.join(', ')}
					</button>
					<div
						class="absolute left-0 bottom-full z-30 hidden group-hover:block max-w-sm rounded-lg bg-base-200 border border-base-content/10 shadow-lg px-3 py-2"
						role="tooltip"
					>
						<div class="text-xs uppercase tracking-wider text-base-content/40 font-semibold mb-1">
							👥 {e.participants.length} attendee{e.participants.length === 1 ? '' : 's'}
						</div>
						<ul class="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
							{#each e.participants as p}
								<li class="text-xs text-base-content/80 break-words">{p}</li>
							{/each}
						</ul>
					</div>
				</div>
			{/if}
		{/if}
	</div>

	{#snippet trailing()}
		{#if e.links?.zoom}<ExternalLink href={e.links.zoom} icon="📹" title="Zoom" />{/if}
		{#if e.links?.doc}<ExternalLink href={e.links.doc} icon="📄" title="Doc" />{/if}
		{#if e.links?.other}<ExternalLink href={e.links.other} icon="🔗" title="Link" />{/if}
	{/snippet}
</AccentRow>
