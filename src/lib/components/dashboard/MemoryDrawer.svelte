<script lang="ts">
	import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte';

	interface Props {
		open: boolean;
		memory: string | null;
		onClose: () => void;
	}

	let { open, memory, onClose }: Props = $props();
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
		onclick={onClose}
		onkeydown={(e) => e.key === 'Escape' && onClose()}
		role="dialog"
		tabindex="-1"
		aria-modal="true"
	>
		<aside class="h-full w-full max-w-xl bg-base-100 border-l border-base-content/10 shadow-xl overflow-hidden flex flex-col">
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="contents"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
				role="presentation"
			>
				<header class="flex items-center justify-between px-5 py-3 border-b border-base-content/10">
					<h2 class="text-sm font-semibold text-base-content">📒 Memory</h2>
					<button class="btn btn-ghost btn-sm text-xs" onclick={onClose}>Close</button>
				</header>
				<div class="flex-1 overflow-y-auto px-5 py-4">
					{#if memory}
						<MarkdownRenderer markdown={memory} />
					{:else}
						<p class="text-xs text-base-content/40">No memory file found.</p>
					{/if}
				</div>
			</div>
		</aside>
	</div>
{/if}
