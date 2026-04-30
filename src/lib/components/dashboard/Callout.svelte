<script lang="ts">
	import type { Snippet } from 'svelte';

	type Tone = 'primary' | 'info' | 'success' | 'warning' | 'error' | 'neutral';

	interface Props {
		tone?: Tone;
		icon?: string;
		title?: string;
		children: Snippet;
	}

	let { tone = 'primary', icon, title, children }: Props = $props();

	function toneClasses(t: Tone): { bg: string; rail: string; label: string } {
		switch (t) {
			case 'primary':
				return { bg: 'bg-primary/5', rail: 'border-primary', label: 'text-primary/70' };
			case 'info':
				return { bg: 'bg-info/5', rail: 'border-info/40', label: 'text-info/80' };
			case 'success':
				return { bg: 'bg-success/5', rail: 'border-success/50', label: 'text-success/80' };
			case 'warning':
				return { bg: 'bg-warning/10', rail: 'border-warning/40', label: 'text-warning/90' };
			case 'error':
				return { bg: 'bg-error/10', rail: 'border-error/40', label: 'text-error/90' };
			case 'neutral':
			default:
				return { bg: 'bg-base-200/40', rail: 'border-base-content/30', label: 'text-base-content/60' };
		}
	}

	const c = $derived(toneClasses(tone));
</script>

<section class="rounded-lg border-l-2 {c.rail} {c.bg} px-4 py-3">
	{#if title || icon}
		<div class="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider {c.label}">
			{#if icon}<span aria-hidden="true">{icon}</span>{/if}
			{#if title}<span>{title}</span>{/if}
		</div>
	{/if}
	{@render children()}
</section>
