<script lang="ts">
	import type { Urgency } from '$lib/types';

	interface Props {
		urgency: Urgency | string;
		size?: 'sm' | 'md';
	}

	let { urgency, size = 'sm' }: Props = $props();

	const colorClass = $derived(
		urgency === 'critical' ? 'bg-error' :
		urgency === 'high' ? 'bg-warning' :
		urgency === 'medium' ? 'bg-info' :
		'bg-base-content/30'
	);

	const sizeClass = $derived(size === 'md' ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5');
</script>

<span
	class="inline-block rounded-full {colorClass} {sizeClass}"
	title={urgency}
	aria-label="{urgency} urgency"
></span>
