<script lang="ts">
	import type { ActionItem, ActiveDealDef } from '$lib/types';
	import AccentRow from './AccentRow.svelte';
	import DealChip from './DealChip.svelte';
	import ExternalLink from './ExternalLink.svelte';
	import { rowAccent } from '$lib/dashboard/format';

	interface Props {
		action: ActionItem;
		deal: ActiveDealDef | null;
		compact?: boolean;
	}

	let { action: a, deal, compact = false }: Props = $props();

	const accent = $derived(rowAccent({ urgency: a.priority }));
</script>

<AccentRow {accent}>
	<div class="flex flex-col gap-1">
		<p class="text-base-content/85 leading-snug break-words">{a.text}</p>
		<div class="flex items-center gap-1.5 flex-wrap text-xs text-base-content/50">
			<DealChip {deal} fallbackId={a.deal_tag} />
			{#if a.deadline}<span class="font-mono">⏰ {a.deadline}</span>{/if}
			{#if !compact && a.source_type}<span class="opacity-60">· {a.source_type}</span>{/if}
		</div>
	</div>

	{#snippet trailing()}
		{#if a.url}<ExternalLink href={a.url} label="open" />{/if}
	{/snippet}
</AccentRow>
