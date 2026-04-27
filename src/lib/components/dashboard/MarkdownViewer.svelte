<script lang="ts">
	import { tick } from 'svelte';
	import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte';

	interface Props {
		open: boolean;
		title: string;
		subtitle?: string | null;
		icon?: string;
		content: string | null;
		loading?: boolean;
		error?: string | null;
		onClose: () => void;
	}

	let {
		open,
		title,
		subtitle = null,
		icon = '📄',
		content,
		loading = false,
		error = null,
		onClose
	}: Props = $props();

	let bodyEl: HTMLDivElement | undefined = $state();
	let searchInputEl: HTMLInputElement | undefined = $state();
	let navOpen = $state(false);
	let searchOpen = $state(false);
	let query = $state('');
	let matches: HTMLElement[] = $state([]);
	let currentIdx = $state(0);
	let headings = $state<Array<{ id: string; text: string; level: number }>>([]);

	// Re-extract outline + clear search when the document changes
	$effect(() => {
		content;
		open;
		queueMicrotask(() => {
			if (!bodyEl || !open) return;
			requestAnimationFrame(() => {
				if (!bodyEl) return;
				headings = Array.from(bodyEl.querySelectorAll('h1, h2, h3')).map((h) => ({
					id: h.id,
					text: h.textContent?.trim() ?? '',
					level: parseInt(h.tagName.slice(1), 10)
				}));
				if (query) applyHighlight();
			});
		});
	});

	// Reset transient state when opening / closing
	$effect(() => {
		if (!open) {
			searchOpen = false;
			query = '';
			matches = [];
			currentIdx = 0;
		}
	});

	$effect(() => {
		// Re-run highlight when query changes
		query;
		if (open && bodyEl) applyHighlight();
	});

	function clearMarks() {
		if (!bodyEl) return;
		bodyEl.querySelectorAll('mark.md-search-hit').forEach((m) => {
			const parent = m.parentNode;
			if (!parent) return;
			while (m.firstChild) parent.insertBefore(m.firstChild, m);
			parent.removeChild(m);
		});
		bodyEl.normalize();
	}

	function applyHighlight() {
		if (!bodyEl) return;
		clearMarks();
		matches = [];
		currentIdx = 0;
		const q = query.trim();
		if (!q) return;

		const lowerQ = q.toLowerCase();
		const walker = document.createTreeWalker(bodyEl, NodeFilter.SHOW_TEXT, {
			acceptNode(node) {
				let p = node.parentElement;
				while (p && p !== bodyEl) {
					if (p.tagName === 'PRE' || p.tagName === 'CODE') return NodeFilter.FILTER_REJECT;
					p = p.parentElement;
				}
				const v = node.nodeValue ?? '';
				return v.toLowerCase().includes(lowerQ)
					? NodeFilter.FILTER_ACCEPT
					: NodeFilter.FILTER_REJECT;
			}
		});

		const textNodes: Text[] = [];
		let n: Node | null;
		while ((n = walker.nextNode())) textNodes.push(n as Text);

		const collected: HTMLElement[] = [];
		for (const text of textNodes) {
			const value = text.nodeValue ?? '';
			const lower = value.toLowerCase();
			const frag = document.createDocumentFragment();
			let last = 0;
			let pos = lower.indexOf(lowerQ);
			while (pos !== -1) {
				if (pos > last) frag.appendChild(document.createTextNode(value.slice(last, pos)));
				const mark = document.createElement('mark');
				mark.className = 'md-search-hit';
				mark.textContent = value.slice(pos, pos + q.length);
				frag.appendChild(mark);
				collected.push(mark);
				last = pos + q.length;
				pos = lower.indexOf(lowerQ, last);
			}
			if (last < value.length) frag.appendChild(document.createTextNode(value.slice(last)));
			text.parentNode?.replaceChild(frag, text);
		}

		matches = collected;
		if (matches.length > 0) {
			currentIdx = 0;
			markCurrent();
		}
	}

	function markCurrent() {
		matches.forEach((m, i) => m.classList.toggle('current', i === currentIdx));
		matches[currentIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}

	function nextMatch() {
		if (matches.length === 0) return;
		currentIdx = (currentIdx + 1) % matches.length;
		markCurrent();
	}

	function prevMatch() {
		if (matches.length === 0) return;
		currentIdx = (currentIdx - 1 + matches.length) % matches.length;
		markCurrent();
	}

	async function openSearch() {
		searchOpen = true;
		await tick();
		searchInputEl?.focus();
		searchInputEl?.select();
	}

	function closeSearch() {
		searchOpen = false;
		query = '';
	}

	function scrollToHeading(id: string) {
		bodyEl?.querySelector(`#${CSS.escape(id)}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!open) return;
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault();
			e.stopPropagation();
			if (searchOpen) closeSearch();
			else void openSearch();
			return;
		}
		if (e.key === 'Escape') {
			e.preventDefault();
			e.stopPropagation();
			if (searchOpen) closeSearch();
			else onClose();
			return;
		}
		if (searchOpen && (e.key === 'Enter' || e.key === 'F3')) {
			e.preventDefault();
			if (e.shiftKey) prevMatch();
			else nextMatch();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
		onclick={onClose}
		role="presentation"
	>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_interactive_supports_focus -->
		<div
			class="bg-base-100 rounded-2xl border border-base-content/10 shadow-2xl w-[80vw] h-[80vh] max-w-[100rem] flex flex-col overflow-hidden"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			aria-label={title}
		>
			<header class="shrink-0 flex items-center gap-2.5 px-5 py-3 border-b border-base-content/10">
				<span class="text-lg leading-none">{icon}</span>
				<div class="flex-1 min-w-0">
					<h2 class="text-sm font-semibold text-base-content truncate leading-tight">{title}</h2>
					{#if subtitle}
						<p class="text-[11px] text-base-content/50 truncate font-mono">{subtitle}</p>
					{/if}
				</div>
				<button
					class="btn btn-ghost btn-sm h-8 min-h-8 w-8 px-0 text-base"
					class:btn-active={navOpen}
					onclick={() => (navOpen = !navOpen)}
					aria-pressed={navOpen}
					title="Toggle outline"
				>
					📑
				</button>
				<button
					class="btn btn-ghost btn-sm h-8 min-h-8 w-8 px-0 text-base"
					class:btn-active={searchOpen}
					onclick={() => (searchOpen ? closeSearch() : void openSearch())}
					aria-pressed={searchOpen}
					title="Search (⌘K)"
				>
					🔎
				</button>
				<button
					class="btn btn-ghost btn-sm h-8 min-h-8 w-8 px-0 text-lg leading-none"
					onclick={onClose}
					title="Close (Esc)"
					aria-label="Close"
				>
					×
				</button>
			</header>

			{#if searchOpen}
				<div class="shrink-0 flex items-center gap-2 px-5 py-2 border-b border-base-content/10 bg-base-200/40">
					<span class="text-base-content/50 text-sm">🔎</span>
					<input
						bind:this={searchInputEl}
						bind:value={query}
						type="text"
						class="flex-1 bg-transparent outline-none text-sm placeholder:text-base-content/40"
						placeholder="Search in document…"
					/>
					<span class="text-[10px] font-mono text-base-content/50 shrink-0">
						{matches.length === 0 ? '0' : `${currentIdx + 1}/${matches.length}`}
					</span>
					<button
						class="btn btn-ghost btn-xs h-7 min-h-7 w-7 px-0 text-base"
						onclick={prevMatch}
						disabled={matches.length === 0}
						title="Previous (Shift+Enter)"
						aria-label="Previous match"
					>↑</button>
					<button
						class="btn btn-ghost btn-xs h-7 min-h-7 w-7 px-0 text-base"
						onclick={nextMatch}
						disabled={matches.length === 0}
						title="Next (Enter)"
						aria-label="Next match"
					>↓</button>
					<button
						class="btn btn-ghost btn-xs h-7 min-h-7 w-7 px-0 text-base leading-none"
						onclick={closeSearch}
						title="Close search (Esc)"
						aria-label="Close search"
					>×</button>
				</div>
			{/if}

			<div class="flex-1 min-h-0 flex overflow-hidden">
				{#if navOpen}
					<aside class="w-60 shrink-0 border-r border-base-content/10 overflow-y-auto py-3 px-2 bg-base-200/20">
						<div class="text-[10px] uppercase tracking-wider text-base-content/40 font-semibold px-2 mb-2">
							Outline
						</div>
						{#if headings.length === 0}
							<p class="text-[11px] text-base-content/40 italic px-2">No headings.</p>
						{:else}
							<ul class="flex flex-col gap-0.5">
								{#each headings as h}
									<li>
										<button
											class="text-left text-xs w-full hover:bg-base-300/50 rounded px-2 py-1 leading-snug transition-colors text-base-content/75 hover:text-base-content"
											style:padding-left="{(h.level - 1) * 0.875 + 0.5}rem"
											onclick={() => scrollToHeading(h.id)}
											title={h.text}
										>
											{h.text}
										</button>
									</li>
								{/each}
							</ul>
						{/if}
					</aside>
				{/if}

				<div bind:this={bodyEl} class="flex-1 min-h-0 overflow-y-auto px-6 py-5">
					{#if loading}
						<div class="flex justify-center py-16">
							<span class="loading loading-dots loading-md"></span>
						</div>
					{:else if error}
						<div class="rounded-lg bg-error/10 text-error border border-error/20 px-4 py-3 text-xs font-mono whitespace-pre-wrap">
							{error}
						</div>
					{:else if content}
						<MarkdownRenderer markdown={content} />
					{:else}
						<p class="text-xs text-base-content/40 italic">No content.</p>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	:global(mark.md-search-hit) {
		background: oklch(var(--wa) / 0.45);
		color: oklch(var(--bc));
		border-radius: 2px;
		padding: 0 1px;
	}
	:global(mark.md-search-hit.current) {
		background: oklch(var(--p) / 0.55);
		outline: 1px solid oklch(var(--p));
		outline-offset: 1px;
	}
</style>
