<script lang="ts">
	import type { ActiveDealDef } from '$lib/types';

	interface Props {
		deal: ActiveDealDef | null;
		fallbackId?: string | null;
	}

	let { deal, fallbackId = null }: Props = $props();

	const label = $derived(deal?.name ?? fallbackId ?? '');
	const color = $derived(deal?.color ?? null);
</script>

{#if label}
	<span
		class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
		style:background-color={color ? `${color}33` : 'oklch(var(--b3))'}
		style:color={color ?? 'oklch(var(--bc) / 0.7)'}
		style:border={color ? `1px solid ${color}55` : '1px solid oklch(var(--b3))'}
		title={deal?.stage ?? undefined}
	>
		{label}
	</span>
{/if}
