<script lang="ts">
	import type { ActiveDealDef } from '$lib/types';

	interface Props {
		deal?: ActiveDealDef | null;
		fallbackId?: string | null;
		labelOverride?: string | null;
		colorOverride?: string | null;
		interactive?: boolean;
		active?: boolean;
		title?: string | null;
		onclick?: () => void;
	}

	let {
		deal = null,
		fallbackId = null,
		labelOverride = null,
		colorOverride = null,
		interactive = false,
		active = false,
		title = null,
		onclick
	}: Props = $props();

	const rawLabel = $derived(labelOverride ?? deal?.name ?? fallbackId ?? '');
	// Drop a trailing parenthetical (e.g., "Acme Corp (Series B)" → "Acme Corp") so chips
	// stay legible at small widths. The full name still surfaces via the title tooltip.
	const label = $derived(rawLabel.replace(/\s*\([^)]*\)\s*$/, '').trim() || rawLabel);
	const color = $derived(colorOverride ?? deal?.color ?? null);
	const computedTitle = $derived(title ?? deal?.stage ?? (label !== rawLabel ? rawLabel : null));

	// Display variant: keeps the tinted-bg look for inline use in rows.
	const displayBg = $derived(
		color ? `color-mix(in oklch, ${color} 20%, transparent)` : 'oklch(var(--b3))'
	);
	const displayFg = $derived(color ?? 'oklch(var(--bc) / 0.7)');
</script>

{#if label}
	{#if interactive}
		<button
			type="button"
			class="inline-block max-w-[10rem] truncate align-middle rounded-full px-2.5 py-1 text-xs text-base-content transition-colors
				{active
					? 'border-2 border-base-content font-semibold'
					: 'border border-base-content/40 font-medium'}"
			style:border-color={color ?? undefined}
			title={computedTitle ?? undefined}
			{onclick}
		>
			{label}
		</button>
	{:else}
		<span
			class="inline-block max-w-[10rem] truncate align-middle rounded-full border border-base-content/30 px-2 py-0.5 text-xs font-medium"
			style:background-color={displayBg}
			style:color={displayFg}
			style:border-color={color ?? undefined}
			title={computedTitle ?? undefined}
		>
			{label}
		</span>
	{/if}
{/if}
