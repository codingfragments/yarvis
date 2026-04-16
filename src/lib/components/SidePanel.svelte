<script lang="ts">
	import MarkdownRenderer from './MarkdownRenderer.svelte';

	interface Props {
		filename: string | null;
		markdown: string | null;
		onClose: () => void;
		onCheckboxToggle?: (index: number, checked: boolean) => void;
		onLocalLink?: (filename: string) => void;
	}

	let { filename, markdown, onClose, onCheckboxToggle, onLocalLink }: Props = $props();

	let panelWidth = $state(30); // percentage
	let dragging = $state(false);

	const label = $derived(
		filename
			? filename
					.replace(/\.md$/, '')
					.replace(/[-_]/g, ' ')
					.replace(/\b\w/g, (c) => c.toUpperCase())
			: ''
	);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && filename) {
			onClose();
		}
	}

	function startDrag(e: MouseEvent) {
		e.preventDefault();
		dragging = true;

		const onMove = (ev: MouseEvent) => {
			const container = (e.target as HTMLElement).closest('.side-panel-wrapper')?.parentElement;
			if (!container) return;
			const rect = container.getBoundingClientRect();
			const pct = ((rect.right - ev.clientX) / rect.width) * 100;
			panelWidth = Math.max(15, Math.min(60, pct));
		};

		const onUp = () => {
			dragging = false;
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mouseup', onUp);
		};

		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', onUp);
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if filename && markdown}
	<div
		class="side-panel-wrapper flex-shrink-0 border-l border-base-content/5 bg-base-100 flex flex-col h-full hidden lg:flex relative"
		style="width: {panelWidth}%"
	>
		<!-- Drag handle -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10 group hover:bg-primary/20 transition-colors
				{dragging ? 'bg-primary/30' : ''}"
			onmousedown={startDrag}
		>
			<div class="absolute left-0.5 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-full bg-base-content/10 group-hover:bg-primary/50 transition-colors
				{dragging ? 'bg-primary/60' : ''}"></div>
		</div>

		<!-- Header -->
		<div class="flex items-center justify-between px-4 py-2.5 border-b border-base-content/5 flex-shrink-0 bg-base-200/30">
			<span class="text-xs font-semibold text-base-content/70 truncate flex items-center gap-2">
				<span class="text-sm">📄</span>
				{label}
			</span>
			<button
				class="btn btn-ghost btn-sm text-base-content/40 hover:text-base-content text-lg"
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

{#if dragging}
	<!-- Overlay to prevent text selection and iframe issues during drag -->
	<div class="fixed inset-0 z-50 cursor-col-resize" style="user-select: none;"></div>
{/if}
