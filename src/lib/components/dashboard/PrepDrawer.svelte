<script lang="ts">
	import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte';

	interface Props {
		open: boolean;
		title: string | null;
		time: string | null;
		filename: string | null;
		content: string | null;
		loading: boolean;
		error: string | null;
		onClose: () => void;
	}

	let { open, title, time, filename, content, loading, error, onClose }: Props = $props();
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
		onclick={onClose}
		onkeydown={(e) => e.key === 'Escape' && onClose()}
		role="dialog"
		tabindex="-1"
		aria-modal="true"
		aria-label="Meeting prep"
	>
		<aside
			class="h-full w-full max-w-3xl bg-base-100 border-l border-base-content/10 shadow-xl overflow-hidden flex flex-col"
		>
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="contents"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
				role="presentation"
			>
				<header class="flex items-start justify-between gap-3 px-5 py-3 border-b border-base-content/10 shrink-0">
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 text-[10px] text-base-content/50 font-mono mb-0.5">
							{#if time}<span>📝 {time}</span>{/if}
							{#if filename}<span class="truncate">· {filename}</span>{/if}
						</div>
						<h2 class="text-sm font-semibold text-base-content leading-tight">
							{title ?? 'Meeting prep'}
						</h2>
					</div>
					<button class="btn btn-ghost btn-sm text-xs shrink-0" onclick={onClose}>Close</button>
				</header>

				<div class="flex-1 min-h-0 overflow-y-auto px-5 py-4">
					{#if loading}
						<div class="flex justify-center py-12">
							<span class="loading loading-dots loading-md"></span>
						</div>
					{:else if error}
						<div class="rounded-lg bg-error/10 text-error border border-error/20 px-4 py-3 text-xs font-mono whitespace-pre-wrap">
							{error}
						</div>
					{:else if content}
						<MarkdownRenderer markdown={content} />
					{:else}
						<p class="text-xs text-base-content/40">No content.</p>
					{/if}
				</div>
			</div>
		</aside>
	</div>
{/if}
