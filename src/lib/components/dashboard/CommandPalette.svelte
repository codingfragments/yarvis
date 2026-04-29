<script lang="ts" module>
	export type { SearchItem, SearchKind } from '$lib/dashboard/searchIndex';
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SearchItem, SearchKind } from '$lib/dashboard/searchIndex';

	interface Props {
		open: boolean;
		items: SearchItem[];
		onClose: () => void;
		onSelect: (item: SearchItem) => void;
	}

	let { open, items, onClose, onSelect }: Props = $props();

	let query = $state('');
	let highlight = $state(0);
	let inputEl: HTMLInputElement | undefined = $state();

	const KIND_ORDER: SearchKind[] = ['action', 'email', 'slack-message', 'slack-channel', 'event', 'prep', 'intel'];

	const KIND_META: Record<SearchKind, { icon: string; label: string; tone: string }> = {
		action: { icon: '⚡', label: 'action', tone: 'text-warning' },
		email: { icon: '✉️', label: 'email', tone: 'text-error' },
		'slack-message': { icon: '💬', label: 'slack', tone: 'text-info' },
		'slack-channel': { icon: '#', label: 'channel', tone: 'text-info' },
		event: { icon: '📅', label: 'event', tone: 'text-success' },
		prep: { icon: '📝', label: 'prep', tone: 'text-primary' },
		intel: { icon: '📰', label: 'intel', tone: 'text-secondary' }
	};

	const results = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return items.slice(0, 30);
		const terms = q.split(/\s+/).filter(Boolean);
		const scored = items
			.map((it) => {
				let score = 0;
				for (const t of terms) {
					const pos = it.hay.indexOf(t);
					if (pos === -1) return null;
					score += 1;
					// boost if found in title
					if (it.title.toLowerCase().includes(t)) score += 2;
				}
				return { item: it, score };
			})
			.filter((r): r is { item: SearchItem; score: number } => r !== null);
		scored.sort((a, b) => {
			if (b.score !== a.score) return b.score - a.score;
			return KIND_ORDER.indexOf(a.item.kind) - KIND_ORDER.indexOf(b.item.kind);
		});
		return scored.slice(0, 30).map((r) => r.item);
	});

	$effect(() => {
		// Reset highlight when results change or palette opens
		query;
		open;
		highlight = 0;
	});

	$effect(() => {
		if (open) queueMicrotask(() => inputEl?.focus());
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			onClose();
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (results.length > 0) highlight = (highlight + 1) % results.length;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (results.length > 0) highlight = (highlight - 1 + results.length) % results.length;
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const sel = results[highlight];
			if (sel) onSelect(sel);
		}
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm pt-24 px-4"
		onclick={onClose}
		onkeydown={handleKeydown}
		role="dialog"
		tabindex="-1"
		aria-modal="true"
		aria-label="Search"
	>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			class="bg-base-100 rounded-xl border border-base-content/10 shadow-2xl w-full max-w-2xl max-h-[70vh] overflow-hidden flex flex-col"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="document"
		>
			<div class="px-4 py-3 border-b border-base-content/10 shrink-0 flex items-center gap-2">
				<span class="text-base-content/40 text-sm">🔎</span>
				<input
					bind:this={inputEl}
					bind:value={query}
					type="text"
					class="flex-1 bg-transparent outline-none text-sm text-base-content placeholder:text-base-content/40"
					placeholder="Search today's actions, email, slack, events…"
				/>
				<span class="text-[10px] text-base-content/30 font-mono">esc</span>
			</div>

			<div class="flex-1 min-h-0 overflow-y-auto">
				{#if results.length === 0}
					<p class="text-xs text-base-content/40 italic px-4 py-6 text-center">
						{query.trim() ? 'No matches.' : 'Type to search.'}
					</p>
				{:else}
					<ul>
						{#each results as r, i (r.id)}
							{@const meta = KIND_META[r.kind]}
							<li>
								<button
									class="w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors border-l-2"
									class:bg-base-200={i === highlight}
									class:border-primary={i === highlight}
									class:border-transparent={i !== highlight}
									onmouseenter={() => (highlight = i)}
									onclick={() => onSelect(r)}
								>
									<span class="text-base shrink-0 leading-tight">{meta.icon}</span>
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2">
											<span class="text-sm text-base-content truncate font-medium">{r.title}</span>
											<span class="text-[10px] uppercase tracking-wider {meta.tone} font-mono shrink-0">
												{meta.label}
											</span>
										</div>
										{#if r.subtitle}
											<p class="text-xs text-base-content/55 truncate leading-tight mt-0.5">
												{r.subtitle}
											</p>
										{/if}
									</div>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<footer class="px-4 py-2 border-t border-base-content/10 shrink-0 flex items-center justify-between text-[10px] text-base-content/40 font-mono">
				<span>↑↓ move · ⏎ open · esc close</span>
				<span>{results.length} {results.length === 1 ? 'match' : 'matches'}</span>
			</footer>
		</div>
	</div>
{/if}
