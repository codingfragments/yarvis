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

	const displayBg = $derived(color ? `${color}33` : 'oklch(var(--b3))');
	const displayFg = $derived(color ?? 'oklch(var(--bc) / 0.7)');
	const displayBorder = $derived(color ? `${color}55` : 'oklch(var(--b3))');

	const interactiveBg = $derived(
		active ? (color ?? 'oklch(var(--p))') : (color ? `${color}11` : 'transparent')
	);
	const interactiveFg = $derived(active ? '#fff' : (color ?? 'oklch(var(--bc) / 0.7)'));
	const interactiveBorder = $derived(
		active ? (color ?? 'oklch(var(--p))') : (color ? `${color}55` : 'oklch(var(--b3))')
	);
</script>

{#if label}
	{#if interactive}
		<button
			type="button"
			class="inline-block max-w-[10rem] truncate align-middle rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
			style:background-color={interactiveBg}
			style:color={interactiveFg}
			style:border-color={interactiveBorder}
			title={computedTitle ?? undefined}
			{onclick}
		>
			{label}
		</button>
	{:else}
		<span
			class="inline-block max-w-[10rem] truncate align-middle rounded-full border px-2 py-0.5 text-xs font-medium"
			style:background-color={displayBg}
			style:color={displayFg}
			style:border-color={displayBorder}
			title={computedTitle ?? undefined}
		>
			{label}
		</span>
	{/if}
{/if}
