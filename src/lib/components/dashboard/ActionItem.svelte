<script lang="ts">
	import type { ActionItem, ActiveDealDef } from '$lib/types';
	import AccentRow from './AccentRow.svelte';
	import Chip from './Chip.svelte';
	import ExternalLink from './ExternalLink.svelte';
	import { rowAccent } from '$lib/dashboard/format';
	import { getDashboardStore } from '$lib/stores/dashboard.svelte';
	import { getSettingsStore } from '$lib/stores/settings.svelte';

	interface Props {
		action: ActionItem;
		deal: ActiveDealDef | null;
		compact?: boolean;
	}

	let { action: a, deal, compact = false }: Props = $props();

	const dashboard = getDashboardStore();
	const settings = getSettingsStore();
	const accent = $derived(rowAccent({ urgency: a.priority }));

	let toggling = $state(false);

	async function onToggle() {
		if (toggling) return;
		toggling = true;
		try {
			await dashboard.setActionDone(settings.current.daily_dir, a, !a.done);
		} catch (err) {
			console.error('Failed to toggle action done:', err);
		} finally {
			toggling = false;
		}
	}
</script>

<AccentRow {accent} dim={a.done} strike={a.done}>
	{#snippet leading()}
		<input
			type="checkbox"
			class="checkbox checkbox-xs mt-0.5 shrink-0"
			checked={a.done}
			disabled={toggling}
			onchange={onToggle}
			aria-label={a.done ? 'Mark as not done' : 'Mark as done'}
		/>
	{/snippet}

	<div class="flex flex-col gap-1">
		<p class="text-base-content/85 leading-snug break-words">{a.text}</p>
		<div class="flex items-center gap-1.5 flex-wrap text-xs text-base-content/50">
			<Chip {deal} fallbackId={a.deal_tag} />
			{#if a.deadline}<span class="font-mono">⏰ {a.deadline}</span>{/if}
			{#if !compact && a.source_type}<span class="opacity-60">· {a.source_type}</span>{/if}
		</div>
	</div>

	{#snippet trailing()}
		{#if a.url}<ExternalLink href={a.url} label="open" />{/if}
	{/snippet}
</AccentRow>
