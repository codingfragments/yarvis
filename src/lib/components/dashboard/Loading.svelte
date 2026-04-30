<script lang="ts">
	type Variant = 'spinner' | 'skeleton';
	type Size = 'sm' | 'md' | 'lg';
	type Inset = 'sm' | 'md' | 'lg';

	interface Props {
		variant?: Variant;
		size?: Size;
		inset?: Inset;
		rows?: number;
		label?: string;
	}

	let {
		variant = 'spinner',
		size = 'md',
		inset = 'md',
		rows = 4,
		label
	}: Props = $props();

	const sizeClass = $derived(
		size === 'sm' ? 'loading-sm' : size === 'lg' ? 'loading-lg' : 'loading-md'
	);
	const insetClass = $derived(
		inset === 'sm' ? 'py-6' : inset === 'lg' ? 'py-16' : 'py-12'
	);
</script>

{#if variant === 'spinner'}
	<div class="flex flex-col items-center justify-center gap-2 {insetClass}" role="status" aria-live="polite">
		<span class="loading loading-dots {sizeClass}"></span>
		{#if label}<span class="text-xs text-base-content/50">{label}</span>{/if}
	</div>
{:else}
	<!-- Skeleton: rows of pulsing placeholder lines. Use a few different widths
	     so the silhouette doesn't look too uniform. -->
	<div class="flex flex-col gap-2 {insetClass} px-2" role="status" aria-live="polite" aria-label={label ?? 'Loading'}>
		{#each Array(rows) as _, i}
			<div
				class="h-3 rounded bg-base-content/10 animate-pulse"
				style:width={['100%', '85%', '92%', '70%'][i % 4]}
			></div>
		{/each}
	</div>
{/if}
