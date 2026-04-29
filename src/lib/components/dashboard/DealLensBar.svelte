<script lang="ts">
	import type { ActiveDealDef } from '$lib/types';

	interface Props {
		deals: ActiveDealDef[];
		selected: string | null;
		onSelect: (id: string | null) => void;
	}

	let { deals, selected, onSelect }: Props = $props();
</script>

{#if deals.length > 0}
	<div class="flex items-center gap-1.5 flex-wrap py-2 border-b border-base-content/5">
		<span class="text-[10px] uppercase tracking-wider text-base-content/40 font-semibold mr-1">
			Lens:
		</span>
		<button
			class="rounded-full px-2.5 py-1 text-xs font-medium border transition-colors"
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
			<button
				class="rounded-full px-2.5 py-1 text-xs font-medium border transition-colors"
				style:background-color={active ? (d.color ?? 'oklch(var(--p))') : 'transparent'}
				style:color={active ? '#fff' : (d.color ?? 'oklch(var(--bc) / 0.7)')}
				style:border-color={active ? (d.color ?? 'oklch(var(--p))') : (d.color ? `${d.color}55` : 'oklch(var(--b3))')}
				onclick={() => onSelect(active ? null : d.id)}
				title={d.stage ?? undefined}
			>
				{d.name}
			</button>
		{/each}
	</div>
{/if}
