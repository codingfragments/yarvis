<script lang="ts">
	import { onMount } from 'svelte';
	import { getBriefingsStore } from '$lib/stores/briefings.svelte';
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import BriefingSidebar from '$lib/components/BriefingSidebar.svelte';
	import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte';
	import SidePanel from '$lib/components/SidePanel.svelte';
	import type { Heading } from '$lib/types';

	const store = getBriefingsStore();
	const settings = getSettingsStore();

	let searchQuery = $state('');
	let mainContent: HTMLDivElement;
	let isWideScreen = $state(false);

	// Extract headings from rendered DOM for anchor nav
	let headings = $state<Heading[]>([]);

	function extractHeadings() {
		if (!mainContent) return;
		const seen: Record<string, number> = {};
		const els = mainContent.querySelectorAll('.md-body h1, .md-body h2, .md-body h3');
		headings = Array.from(els).map((el) => {
			const text = el.textContent || '';
			const base = text.replace(/[^\w\s-]/g, '').trim().toLowerCase().replace(/\s+/g, '-') || 'section';
			seen[base] = (seen[base] || 0) + 1;
			const id = seen[base] > 1 ? `${base}-${seen[base]}` : base;
			return { text, id, level: parseInt(el.tagName[1]) };
		});
	}

	// Extract H2 headings for quick-jump bar
	const quickJumpSections = $derived(
		headings.filter((h) => h.level === 2).slice(0, 8)
	);

	$effect(() => {
		// Re-extract headings when markdown changes
		if (store.rawMarkdown) {
			requestAnimationFrame(() => extractHeadings());
		}
	});

	function handleLocalLink(filename: string) {
		const dir = settings.current.briefings_dir;
		if (isWideScreen) {
			store.openInSidePanel(filename, dir);
		} else {
			store.selectFile(filename, dir);
		}
	}

	function handleCheckboxToggle(index: number, checked: boolean) {
		store.toggleCheckbox(index, checked, settings.current.briefings_dir);
	}

	function handleKeydown(e: KeyboardEvent) {
		// Skip if focused on an input
		if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

		const dir = settings.current.briefings_dir;
		const fileIdx = store.files.findIndex((f) => f.filename === store.currentFile);

		if (e.key === 'ArrowDown' && fileIdx < store.files.length - 1) {
			e.preventDefault();
			store.selectFile(store.files[fileIdx + 1].filename, dir);
		} else if (e.key === 'ArrowUp' && fileIdx > 0) {
			e.preventDefault();
			store.selectFile(store.files[fileIdx - 1].filename, dir);
		} else if (e.key === 'ArrowLeft') {
			e.preventDefault();
			const dateIdx = store.dates.findIndex((d) => d.key === store.currentDate);
			if (dateIdx < store.dates.length - 1) {
				store.selectDate(store.dates[dateIdx + 1].key, dir);
			}
		} else if (e.key === 'ArrowRight') {
			e.preventDefault();
			const dateIdx = store.dates.findIndex((d) => d.key === store.currentDate);
			if (dateIdx > 0) {
				store.selectDate(store.dates[dateIdx - 1].key, dir);
			}
		} else if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
			e.preventDefault();
			const input = document.querySelector<HTMLInputElement>('aside input[type="text"]');
			input?.focus();
		}
	}

	onMount(() => {
		// Check screen width
		const mq = window.matchMedia('(min-width: 1024px)');
		isWideScreen = mq.matches;
		mq.addEventListener('change', (e) => (isWideScreen = e.matches));

		// Load briefings
		if (settings.loaded) {
			store.load(settings.current.briefings_dir, settings.current.briefings_max_days);
		}
	});

	// Reload when settings change (e.g., navigated from settings page)
	$effect(() => {
		if (settings.loaded && settings.current.briefings_dir) {
			store.load(settings.current.briefings_dir, settings.current.briefings_max_days);
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex h-[calc(100vh-3.5rem-1.75rem)] -mt-4 -mx-0">
	<!-- Sidebar -->
	<BriefingSidebar
		dates={store.dates}
		files={store.files}
		currentDate={store.currentDate}
		currentFile={store.currentFile}
		{headings}
		{searchQuery}
		onDateChange={(key) => store.selectDate(key, settings.current.briefings_dir)}
		onFileSelect={(filename) => store.selectFile(filename, settings.current.briefings_dir)}
		onSearchChange={(q) => (searchQuery = q)}
	/>

	<!-- Main content -->
	<div class="flex-1 overflow-y-auto scroll-smooth" bind:this={mainContent}>
		{#if store.loading && !store.rawMarkdown}
			<div class="flex items-center justify-center h-full">
				<span class="loading loading-dots loading-md text-primary"></span>
			</div>
		{:else if store.error && !store.rawMarkdown}
			<div class="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
				<span class="text-3xl">📋</span>
				<p class="text-sm text-base-content/50 max-w-md">{store.error}</p>
				<a href="/settings" class="btn btn-ghost btn-sm text-xs">Configure in Settings</a>
			</div>
		{:else if store.rawMarkdown}
			<!-- Quick-jump bar -->
			{#if quickJumpSections.length > 1}
				<div class="sticky top-0 z-10 bg-base-100/90 backdrop-blur-sm border-b border-base-content/5 px-6 py-1.5 flex items-center gap-1.5 overflow-x-auto">
					{#each quickJumpSections as section}
						<button
							class="flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium
								bg-base-content/5 text-base-content/50 hover:bg-primary/10 hover:text-primary transition-colors"
							onclick={() => {
								const el = document.getElementById(section.id);
								if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
							}}
						>
							{section.text.replace(/^[^\w]*/, '').slice(0, 25)}
						</button>
					{/each}
				</div>
			{/if}

			<!-- Rendered content -->
			<div class="max-w-[860px] mx-auto px-8 py-6">
				<MarkdownRenderer
					markdown={store.rawMarkdown}
					onCheckboxToggle={handleCheckboxToggle}
					onLocalLink={handleLocalLink}
				/>
			</div>
		{:else}
			<div class="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
				<span class="text-4xl">📋</span>
				<p class="text-base font-semibold text-base-content/70">Briefings Viewer</p>
				<p class="text-xs text-base-content/40 max-w-sm">
					Configure your briefings directory in Settings to get started.
				</p>
				<a href="/settings" class="btn btn-primary btn-sm text-xs">Open Settings</a>
			</div>
		{/if}
	</div>

	<!-- Side panel for linked files -->
	<SidePanel
		filename={store.sidePanelFile}
		markdown={store.sidePanelMarkdown}
		onClose={() => store.closeSidePanel()}
		onLocalLink={handleLocalLink}
	/>
</div>
