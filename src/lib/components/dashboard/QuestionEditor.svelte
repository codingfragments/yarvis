<script lang="ts">
	import type { DashboardQuestion } from '$lib/types';
	import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte';
	import Chip from './Chip.svelte';
	import Callout from './Callout.svelte';
	import Overlay from './Overlay.svelte';
	import { questionTone } from '$lib/dashboard/format';

	interface Props {
		open: boolean;
		question: DashboardQuestion | null;
		saving: boolean;
		error: string | null;
		onSave: (answer: string) => void;
		onClose: () => void;
	}

	let { open, question, saving, error, onSave, onClose }: Props = $props();

	let draft = $state('');
	let textareaEl: HTMLTextAreaElement | undefined = $state();

	$effect(() => {
		if (open && question) {
			draft = question.answer ?? '';
			queueMicrotask(() => textareaEl?.focus());
		}
	});

	function handleSave() {
		if (saving) return;
		onSave(draft);
	}

	function handleKey(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
			e.preventDefault();
			handleSave();
		}
	}
</script>

{#if question}
	<Overlay {open} {onClose} onKeydown={handleKey} ariaLabel="Answer question">
		{#snippet header()}
			<header class="shrink-0 px-5 py-3.5 border-b border-base-content/10">
				<div class="flex items-center gap-2 mb-1.5 flex-wrap">
					<Chip variant="status" tone={questionTone(question.status)} labelOverride={question.status.toLowerCase()} />
					{#if question.asked}
						<span class="text-xs font-mono text-base-content/40">asked {question.asked}</span>
					{/if}
					{#if question.run}
						<span class="text-xs font-mono text-base-content/40">· run {question.run}</span>
					{/if}
				</div>
				<h2 class="text-base font-semibold text-base-content leading-snug">{question.title}</h2>
			</header>
		{/snippet}

		<div class="flex-1 min-h-0 overflow-y-auto px-5 py-4 flex flex-col gap-3">
			{#if question.context}
				<Callout tone="info" title="Context">
					<p class="text-xs text-base-content/75 leading-snug">{question.context}</p>
				</Callout>
			{/if}

			{#if question.body}
				<div class="text-sm text-base-content/85 leading-relaxed">
					<MarkdownRenderer markdown={question.body} />
				</div>
			{/if}

			<label class="form-control">
				<span class="label-text text-xs uppercase tracking-wider text-base-content/50 font-semibold mb-1.5">
					Your answer
				</span>
				<textarea
					bind:this={textareaEl}
					bind:value={draft}
					class="textarea textarea-bordered w-full font-sans text-sm leading-relaxed min-h-[8rem] resize-y"
					placeholder="Type your answer…"
					disabled={saving}
				></textarea>
				<span class="label-text-alt text-xs text-base-content/40 mt-1">
					Markdown supported · ⌘/Ctrl + Enter to save · Esc to cancel · empty answer reverts to pending
				</span>
			</label>

			{#if error}
				<div class="rounded-lg bg-error/10 text-error border border-error/20 px-3 py-2 text-xs font-mono whitespace-pre-wrap">
					{error}
				</div>
			{/if}
		</div>

		{#snippet footer()}
			<footer class="px-5 py-3 border-t border-base-content/10 shrink-0 flex items-center justify-end gap-2">
				<button class="btn btn-ghost btn-sm text-xs" onclick={onClose} disabled={saving}>
					Cancel
				</button>
				<button class="btn btn-primary btn-sm text-xs" onclick={handleSave} disabled={saving}>
					{saving ? 'Saving…' : 'Save'}
				</button>
			</footer>
		{/snippet}
	</Overlay>
{/if}
