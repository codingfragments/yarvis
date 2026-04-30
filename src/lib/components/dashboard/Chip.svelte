<script lang="ts">
	import type { ActiveDealDef } from '$lib/types';

	type Variant = 'display' | 'interactive' | 'status';
	type Tone = 'success' | 'warning' | 'info' | 'error' | 'neutral';

	interface Props {
		deal?: ActiveDealDef | null;
		fallbackId?: string | null;
		labelOverride?: string | null;
		colorOverride?: string | null;
		variant?: Variant;
		active?: boolean;
		tone?: Tone;
		title?: string | null;
		onclick?: () => void;
	}

	let {
		deal = null,
		fallbackId = null,
		labelOverride = null,
		colorOverride = null,
		variant = 'display',
		active = false,
		tone,
		title = null,
		onclick
	}: Props = $props();

	const rawLabel = $derived(labelOverride ?? deal?.name ?? fallbackId ?? '');
	// Drop a trailing parenthetical (e.g., "Acme Corp (Series B)" → "Acme Corp") so chips
	// stay legible at small widths. The full name still surfaces via the title tooltip.
	const label = $derived(rawLabel.replace(/\s*\([^)]*\)\s*$/, '').trim() || rawLabel);
	const color = $derived(colorOverride ?? deal?.color ?? null);
	const computedTitle = $derived(title ?? deal?.stage ?? (label !== rawLabel ? rawLabel : null));

	const displayBg = $derived(
		color ? `color-mix(in oklch, ${color} 20%, transparent)` : 'oklch(var(--b3))'
	);
	const displayFg = $derived(color ?? 'oklch(var(--bc) / 0.7)');

	// Tonal class kit for status variant. Each branch must spell out the literal class strings
	// so Tailwind's JIT picks them up.
	function toneClasses(t: Tone | undefined): string {
		switch (t) {
			case 'success':
				return 'bg-success/15 text-success border-success/30';
			case 'warning':
				return 'bg-warning/15 text-warning border-warning/30';
			case 'info':
				return 'bg-info/15 text-info border-info/30';
			case 'error':
				return 'bg-error/15 text-error border-error/30';
			case 'neutral':
			default:
				return 'bg-base-300/60 text-base-content/50 border-base-content/10';
		}
	}
</script>

{#if label}
	{#if variant === 'status'}
		<span
			class="inline-block max-w-[10rem] truncate align-middle rounded-full border px-2 py-0.5 text-xs font-medium {toneClasses(tone)}"
			title={computedTitle ?? undefined}
		>
			{label}
		</span>
	{:else if variant === 'interactive'}
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
