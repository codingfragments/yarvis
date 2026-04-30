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
		<button
			type="button"
			class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
			class:border-base-content={selected === null}
			class:bg-base-content={selected === null}
			class:text-base-100={selected === null}
			class:border-base-content--alpha={false}
			class:border-opacity-15={selected !== null}
			class:text-base-content={selected !== null}
			class:bg-transparent={selected !== null}
			onclick={() => onSelect(null)}
		>
			All
		</button>
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
