<script lang="ts">
	import { marked } from 'marked';
	import { onMount } from 'svelte';
	import { isTauri } from '$lib/services/tauri';

	interface Props {
		markdown: string;
		onCheckboxToggle?: (index: number, checked: boolean) => void;
		onLocalLink?: (filename: string) => void;
	}

	let { markdown, onCheckboxToggle, onLocalLink }: Props = $props();

	let container: HTMLDivElement;

	const html = $derived(
		marked.parse(markdown, { gfm: true, breaks: false }) as string
	);

	// Wire up interactive elements after each render
	$effect(() => {
		if (!container || !html) return;
		// Need a tick for the DOM to update
		requestAnimationFrame(() => wireInteractions());
	});

	function wireInteractions() {
		if (!container) return;

		// Heading IDs for anchor navigation
		const seen: Record<string, number> = {};
		container.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((h) => {
			const el = h as HTMLElement;
			const base =
				el.textContent
					?.replace(/[^\w\s-]/g, '')
					.trim()
					.toLowerCase()
					.replace(/\s+/g, '-') || 'section';
			seen[base] = (seen[base] || 0) + 1;
			el.id = seen[base] > 1 ? `${base}-${seen[base]}` : base;
			el.style.scrollMarginTop = '48px';
		});

		// Checkboxes
		container.querySelectorAll('input[type="checkbox"]').forEach((cb, idx) => {
			const input = cb as HTMLInputElement;
			input.disabled = false;
			input.dataset.cbIdx = String(idx);
			input.onchange = () => {
				onCheckboxToggle?.(idx, input.checked);
			};
		});

		// Links
		container.querySelectorAll('a[href]').forEach((a) => {
			const el = a as HTMLAnchorElement;
			const href = el.getAttribute('href');
			if (!href) return;

			if (/^https?:\/\//.test(href)) {
				// External links: open in system browser via Tauri, or new tab in browser mode
				el.addEventListener('click', async (e) => {
					if (isTauri()) {
						e.preventDefault();
						const { open } = await import('@tauri-apps/plugin-shell');
						open(href);
					} else {
						el.target = '_blank';
						el.rel = 'noopener noreferrer';
					}
				});
			} else if (href.endsWith('.md') && !href.startsWith('#')) {
				// Local .md links
				el.classList.add('local-link');
				el.addEventListener('click', (e) => {
					e.preventDefault();
					const filename = href.split('/').pop() || href;
					onLocalLink?.(filename);
				});
			} else if (href.startsWith('#')) {
				// Anchor links
				el.addEventListener('click', (e) => {
					e.preventDefault();
					const target = container.querySelector(href);
					if (target) target.scrollIntoView({ behavior: 'smooth' });
				});
			}
		});
	}
</script>

<div class="md-body" bind:this={container}>
	{@html html}
</div>

<style>
	/* Markdown theme — adapts to Catppuccin via DaisyUI CSS variables */
	.md-body :global(h1) {
		font-size: 1.25rem;
		font-weight: 700;
		color: oklch(var(--p));
		margin-bottom: 0.375rem;
		padding-bottom: 0.625rem;
		border-bottom: 1px solid oklch(var(--b3));
	}
	.md-body :global(h2) {
		font-size: 0.9rem;
		font-weight: 600;
		color: oklch(var(--p));
		margin: 1.75rem 0 0.625rem;
		opacity: 0.85;
	}
	.md-body :global(h3) {
		font-size: 0.8125rem;
		font-weight: 600;
		color: oklch(var(--s));
		margin: 1.125rem 0 0.5rem;
	}
	.md-body :global(h4) {
		font-size: 0.78rem;
		font-weight: 600;
		color: oklch(var(--a));
		margin: 0.875rem 0 0.375rem;
	}
	.md-body :global(p) {
		margin-bottom: 0.625rem;
		line-height: 1.65;
	}
	.md-body :global(a) {
		color: oklch(var(--p));
		text-decoration: none;
	}
	.md-body :global(a:hover) {
		text-decoration: underline;
		opacity: 0.85;
	}
	.md-body :global(a.local-link) {
		color: oklch(var(--su));
	}
	.md-body :global(ul),
	.md-body :global(ol) {
		margin: 0.375rem 0 0.625rem 1.375rem;
	}
	.md-body :global(li) {
		margin-bottom: 0.25rem;
	}
	.md-body :global(li p) {
		margin-bottom: 0.125rem;
	}
	.md-body :global(blockquote) {
		border-left: 3px solid oklch(var(--b3));
		background: oklch(var(--b2));
		padding: 0.5rem 1rem;
		margin: 0.625rem 0;
		border-radius: 0 0.375rem 0.375rem 0;
	}
	.md-body :global(blockquote p) {
		margin-bottom: 0;
	}
	.md-body :global(code) {
		background: oklch(var(--b3));
		color: oklch(var(--wa));
		padding: 0.125rem 0.3125rem;
		border-radius: 0.25rem;
		font-size: 0.78rem;
		font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
	}
	.md-body :global(pre) {
		background: oklch(var(--b2));
		border: 1px solid oklch(var(--b3));
		border-radius: 0.5rem;
		padding: 0.875rem 1rem;
		margin: 0.625rem 0;
		overflow-x: auto;
	}
	.md-body :global(pre code) {
		background: none;
		padding: 0;
		color: oklch(var(--bc));
		font-size: 0.78rem;
	}
	.md-body :global(hr) {
		border: none;
		border-top: 1px solid oklch(var(--b3));
		margin: 1.25rem 0;
	}
	.md-body :global(strong) {
		font-weight: 600;
	}
	.md-body :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin: 0.625rem 0;
		font-size: 0.8125rem;
	}
	.md-body :global(th) {
		background: oklch(var(--b3));
		padding: 0.4375rem 0.75rem;
		text-align: left;
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.03125rem;
	}
	.md-body :global(td) {
		padding: 0.4375rem 0.75rem;
		border-bottom: 1px solid oklch(var(--b3));
		vertical-align: top;
	}
	.md-body :global(tr:last-child td) {
		border-bottom: none;
	}
	.md-body :global(tr:hover td) {
		background: oklch(var(--b2));
	}
	.md-body :global(input[type='checkbox']) {
		accent-color: oklch(var(--p));
		margin-right: 0.375rem;
		cursor: pointer;
	}
</style>
