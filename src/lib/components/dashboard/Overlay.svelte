<script lang="ts">
	import type { Snippet } from 'svelte';

	type Placement = 'center' | 'top';
	type Size = 'sm' | 'md' | 'lg' | 'xl' | 'full';

	interface Props {
		open: boolean;
		onClose: () => void;
		onKeydown?: (e: KeyboardEvent) => void;
		placement?: Placement;
		size?: Size;
		contentClass?: string;
		title?: string;
		subtitle?: string | null;
		icon?: string;
		ariaLabel?: string;
		header?: Snippet;
		actions?: Snippet;
		footer?: Snippet;
		children: Snippet;
	}

	let {
		open,
		onClose,
		onKeydown,
		placement = 'center',
		size = 'md',
		contentClass,
		title,
		subtitle = null,
		icon,
		ariaLabel,
		header,
		actions,
		footer,
		children
	}: Props = $props();

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			onClose();
			return;
		}
		onKeydown?.(e);
	}

	function handleBackdropClick(e: MouseEvent) {
		// Only close when the click landed on the backdrop itself, not on bubbled
		// content from inside the dialog.
		if (e.target === e.currentTarget) onClose();
	}

	const sizeClass = $derived.by(() => {
		switch (size) {
			case 'sm':
				return 'w-full max-w-md max-h-[80vh]';
			case 'md':
				return 'w-full max-w-2xl max-h-[85vh]';
			case 'lg':
				return 'w-full max-w-4xl max-h-[85vh]';
			case 'xl':
				return 'w-[80vw] h-[80vh] max-w-[100rem]';
			case 'full':
				return 'w-[95vw] h-[95vh]';
		}
	});

	const placementClass = $derived(
		placement === 'top' ? 'items-start pt-24' : 'items-center'
	);
</script>

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex justify-center bg-black/40 backdrop-blur-sm p-4 {placementClass}"
		onclick={handleBackdropClick}
		onkeydown={handleKey}
		role="dialog"
		tabindex="-1"
		aria-modal="true"
		aria-label={ariaLabel ?? title ?? 'Dialog'}
	>
		<div
			class="bg-base-100 rounded-xl border border-base-content/10 shadow-2xl flex flex-col overflow-hidden {contentClass ?? sizeClass}"
			role="document"
		>
			{#if header}
				{@render header()}
			{:else if title || icon}
				<header class="shrink-0 flex items-center gap-2.5 px-5 py-3 border-b border-base-content/10">
					{#if icon}<span class="text-lg leading-none">{icon}</span>{/if}
					<div class="flex-1 min-w-0">
						{#if title}<h2 class="text-sm font-semibold text-base-content truncate leading-tight">{title}</h2>{/if}
						{#if subtitle}<p class="text-xs text-base-content/50 truncate font-mono">{subtitle}</p>{/if}
					</div>
					{#if actions}{@render actions()}{/if}
					<button
						class="btn btn-ghost btn-sm h-8 min-h-8 w-8 px-0 text-lg leading-none"
						onclick={onClose}
						title="Close (Esc)"
						aria-label="Close"
					>
						×
					</button>
				</header>
			{/if}

			{@render children()}

			{#if footer}{@render footer()}{/if}
		</div>
	</div>
{/if}
