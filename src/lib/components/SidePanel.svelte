<script lang="ts">
	import MarkdownRenderer from './MarkdownRenderer.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		filename: string | null;
		markdown: string | null;
		onClose: () => void;
		onCheckboxToggle?: (index: number, checked: boolean) => void;
		onLocalLink?: (filename: string) => void;
	}

	let { filename, markdown, onClose, onCheckboxToggle, onLocalLink }: Props = $props();

	const label = $derived(
		filename
			? filename
					.replace(/\.md$/, '')
					.replace(/[-_]/g, ' ')
					.replace(/\b\w/g, (c) => c.toUpperCase())
			: ''
	);

	// Close on Escape
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && filename) {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if filename && markdown}
	<div class="w-1/2 flex-shrink-0 border-l border-base-content/5 bg-base-100 flex flex-col h-full hidden lg:flex">
		<!-- Header -->
		<div class="flex items-center justify-between px-4 py-2.5 border-b border-base-content/5 flex-shrink-0 bg-base-200/30">
			<span class="text-xs font-semibold text-base-content/70 truncate flex items-center gap-2">
				<span class="text-sm">📄</span>
				{label}
			</span>
			<button
				class="btn btn-ghost btn-xs text-base-content/40 hover:text-base-content"
				onclick={onClose}
				title="Close (Esc)"
			>
				✕
			</button>
		</div>

		<!-- Content -->
		<div class="flex-1 overflow-y-auto px-5 py-4">
			<MarkdownRenderer
				{markdown}
				{onCheckboxToggle}
				{onLocalLink}
			/>
		</div>
	</div>
{/if}
