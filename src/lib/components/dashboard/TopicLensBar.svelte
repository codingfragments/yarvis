<script lang="ts">
	import type { InitiativeDef } from '$lib/types';
	import Chip from './Chip.svelte';

	interface Props {
		initiatives: InitiativeDef[];
		selected: string | null;
		onSelect: (id: string | null) => void;
	}

	let { initiatives, selected, onSelect }: Props = $props();

	// One shared fixed accent, distinct from the Deal row's per-deal palette —
	// the row-level color is what signals "this is the other axis," not any
	// individual pill (see topic-lens plan §2).
	const TOPIC_ACCENT = 'oklch(var(--a))';
</script>

{#if initiatives.length > 0}
	<div class="flex items-center gap-1.5 flex-wrap">
		<span class="text-xs uppercase tracking-wider text-accent/70 font-semibold mr-1">
			Topic:
		</span>
		{#each initiatives as i (i.id)}
			{@const active = selected === i.id}
			<Chip
				labelOverride={i.label}
				fallbackId={i.id}
				colorOverride={TOPIC_ACCENT}
				variant="interactive"
				{active}
				onclick={() => onSelect(active ? null : i.id)}
			/>
		{/each}
	</div>
{/if}
