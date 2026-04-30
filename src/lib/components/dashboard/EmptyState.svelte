<script lang="ts">
	interface Props {
		// Plain mode — a single static message.
		message?: string;
		// Lens-aware mode — composes "No {items} for {lensName}." when the lens
		// is active, otherwise renders `fallback`.
		items?: string;
		lensActive?: boolean;
		lensName?: string | null;
		fallback?: string;
		align?: 'left' | 'center';
	}

	let {
		message,
		items,
		lensActive = false,
		lensName = null,
		fallback,
		align = 'left'
	}: Props = $props();

	const text = $derived.by(() => {
		if (message !== undefined) return message;
		if (items !== undefined && fallback !== undefined) {
			return lensActive ? `No ${items} for ${lensName}.` : fallback;
		}
		return '';
	});

	const alignClass = $derived(align === 'center' ? 'text-center' : '');
</script>

{#if text}
	<p class="text-xs text-base-content/40 italic {alignClass}">{text}</p>
{/if}
