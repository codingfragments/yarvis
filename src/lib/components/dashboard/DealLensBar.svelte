<script lang="ts">
	import type { ActiveDealDef } from '$lib/types';
	import DealChip from './DealChip.svelte';

	interface Props {
		deals: ActiveDealDef[];
		selected: string | null;
		onSelect: (id: string | null) => void;
	}

	let { deals, selected, onSelect }: Props = $props();
</script>

{#if deals.length > 0}
	<div class="flex items-center gap-1.5 flex-wrap py-2 border-b border-base-content/5">
		<span class="text-xs uppercase tracking-wider text-base-content/40 font-semibold mr-1">
			Lens:
		</span>
		<DealChip
			labelOverride="All"
			interactive
			active={selected === null}
			onclick={() => onSelect(null)}
		/>
		{#each deals as d (d.id)}
			{@const active = selected === d.id}
			<DealChip
				deal={d}
				interactive
				{active}
				title={d.stage}
				onclick={() => onSelect(active ? null : d.id)}
			/>
		{/each}
	</div>
{/if}
