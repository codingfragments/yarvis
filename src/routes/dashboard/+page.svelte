<script lang="ts">
	import { onMount } from 'svelte';
	import { getDashboardStore } from '$lib/stores/dashboard.svelte';
	import { getDashboardViewStore } from '$lib/stores/dashboardView.svelte';
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import { getRefreshStore } from '$lib/stores/refresh.svelte';
	import { readPrep } from '$lib/services/dashboard';
	import { isTauri } from '$lib/services/tauri';
	import type { DashboardQuestion, MeetingPrep } from '$lib/types';
	import MarkdownViewer from '$lib/components/dashboard/MarkdownViewer.svelte';
	import QuestionEditor from '$lib/components/dashboard/QuestionEditor.svelte';
	import DealLensBar from '$lib/components/dashboard/DealLensBar.svelte';
	import CommandPalette from '$lib/components/dashboard/CommandPalette.svelte';
	import DashboardHeader from '$lib/components/dashboard/DashboardHeader.svelte';
	import DashboardSidebar from '$lib/components/dashboard/DashboardSidebar.svelte';
	import DashboardTabStrip, { TAB_KEYS, type TabKey } from '$lib/components/dashboard/DashboardTabStrip.svelte';
	import SummaryTab from '$lib/components/dashboard/tabs/SummaryTab.svelte';
	import CalendarTab from '$lib/components/dashboard/tabs/CalendarTab.svelte';
	import EmailTab from '$lib/components/dashboard/tabs/EmailTab.svelte';
	import SlackTab from '$lib/components/dashboard/tabs/SlackTab.svelte';
	import ResearchTab from '$lib/components/dashboard/tabs/ResearchTab.svelte';
	import type { SearchItem } from '$lib/components/dashboard/CommandPalette.svelte';

	const dashboard = getDashboardStore();
	const view = getDashboardViewStore();
	const settings = getSettingsStore();
	const refresh = getRefreshStore();

	let tab = $state<TabKey>('summary');
	let memoryOpen = $state(false);
	let now = $state(new Date());
	let prepDrawerOpen = $state(false);
	let prepLoading = $state(false);
	let prepContent = $state<string | null>(null);
	let prepError = $state<string | null>(null);
	let prepMeta = $state<{ title: string; time: string; filename: string } | null>(null);
	let questionEditorOpen = $state(false);
	let editingQuestion = $state<DashboardQuestion | null>(null);
	let editorError = $state<string | null>(null);
	let paletteOpen = $state(false);

	onMount(() => {
		const h = window.location.hash.slice(1);
		if ((TAB_KEYS as readonly string[]).includes(h)) tab = h as TabKey;
		const t = setInterval(() => (now = new Date()), 30_000);
		const onKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				// Defer to the MarkdownViewer when one is open
				if (memoryOpen || prepDrawerOpen) return;
				e.preventDefault();
				paletteOpen = !paletteOpen;
			}
		};
		window.addEventListener('keydown', onKey);
		void load();
		const unregister = refresh.register({
			id: 'dashboard',
			softRefresh: async () => {
				if (!settings.loaded) return;
				const { daily_dir, daily_src_dir, briefings_dir } = settings.current;
				await dashboard.softRefresh(daily_dir, daily_src_dir, briefings_dir);
			},
			isBusy: () => dashboard.isBusy()
		});
		return () => {
			clearInterval(t);
			window.removeEventListener('keydown', onKey);
			unregister();
		};
	});

	$effect(() => {
		if (typeof window !== 'undefined') {
			history.replaceState(null, '', `#${tab}`);
		}
	});

	async function load() {
		await settings.load();
		const { daily_dir, daily_src_dir, briefings_dir } = settings.current;
		await dashboard.load(daily_dir, daily_src_dir, briefings_dir);
	}

	async function openMemory() {
		await dashboard.loadMemory(settings.current.daily_dir);
		memoryOpen = true;
	}

	function openQuestionEditor(q: DashboardQuestion) {
		editingQuestion = q;
		editorError = null;
		questionEditorOpen = true;
	}

	async function saveQuestionAnswer(answer: string) {
		if (!editingQuestion) return;
		editorError = null;
		try {
			await dashboard.answerQuestion(
				settings.current.daily_dir,
				editingQuestion.title,
				answer
			);
			questionEditorOpen = false;
			editingQuestion = null;
		} catch (e) {
			editorError = String(e);
		}
	}

	async function openPrep(p: MeetingPrep) {
		if (!p.file || !dashboard.briefing) return;
		prepMeta = { title: p.title, time: p.time, filename: p.file };
		prepContent = null;
		prepError = null;
		prepLoading = true;
		prepDrawerOpen = true;
		try {
			prepContent = await readPrep(
				settings.current.briefings_dir,
				dashboard.briefing.meta.briefing_date,
				p.file
			);
		} catch (e) {
			prepError = String(e);
		} finally {
			prepLoading = false;
		}
	}

	async function dispatchSearchSelection(item: SearchItem) {
		paletteOpen = false;
		if (item.kind === 'prep') {
			const prep = view.filteredPreps[item.prepIndex ?? -1];
			if (prep) await openPrep(prep);
			return;
		}
		if (item.url) {
			if (isTauri()) {
				const { open } = await import('@tauri-apps/plugin-shell');
				await open(item.url);
			} else {
				window.open(item.url, '_blank', 'noopener');
			}
		}
	}
</script>

<div
	class="max-w-7xl mx-auto px-4 md:h-[calc(100dvh-6rem)] md:flex md:flex-col"
>
	<DashboardHeader
		briefing={dashboard.briefing}
		{now}
		onPalette={() => (paletteOpen = true)}
		onMemory={openMemory}
	/>

	{#if dashboard.error}
		<div class="rounded-xl bg-error/10 text-error border border-error/20 px-4 py-3 text-sm my-3">
			<div class="font-semibold mb-1">Could not load dashboard</div>
			<div class="text-xs opacity-80 font-mono whitespace-pre-wrap">{dashboard.error}</div>
			<div class="text-xs mt-2 opacity-70">
				Check the <a href="/settings" class="underline">paths in Settings</a> — daily directory is{' '}
				<code class="font-mono">{settings.current.daily_dir}</code>.
			</div>
		</div>
	{/if}

	{#if dashboard.briefing}
		{@const b = dashboard.briefing}

		<DealLensBar
			deals={dashboard.config?.active_deals ?? []}
			selected={view.dealLens}
			onSelect={(id) => (view.dealLens = id)}
		/>

		<!-- Two-pane body -->
		<div
			class="md:flex-1 md:min-h-0 flex flex-col md:flex-row gap-4 pt-3 pb-4"
		>
			<DashboardSidebar
				actions={view.filteredActions}
				preps={view.filteredPreps}
				fun={b.fun ?? null}
				lensActive={view.lensActive}
				lensName={view.lensName}
				dealById={(id) => dashboard.dealById(id)}
				onOpenPrep={openPrep}
			/>

			<!-- Right pane: tabs + content (independent scroll on md+) -->
			<div class="order-1 md:order-none md:flex-1 md:min-w-0 md:min-h-0 flex flex-col">
				<DashboardTabStrip {tab} counts={view.counts} onSelect={(k) => (tab = k)} />

				<!-- Tab content -->
				<div class="md:flex-1 md:min-w-0 md:overflow-y-auto md:min-h-0 pt-4">
					{#if tab === 'summary'}
						<SummaryTab
							briefing={b}
							questions={dashboard.questions}
							pendingCount={view.counts.pending}
							lastLoaded={dashboard.lastLoaded}
							onEditQuestion={openQuestionEditor}
						/>
					{:else if tab === 'calendar' && b.calendar}
						<CalendarTab
							calendar={b.calendar}
							events={view.filteredEvents}
							conflicts={view.filteredConflicts}
							lensActive={view.lensActive}
							lensName={view.lensName}
							dealById={(id) => dashboard.dealById(id)}
						/>
					{:else if tab === 'email' && b.email}
						<EmailTab
							email={b.email}
							actToday={view.filteredEmailActToday}
							fyi={view.filteredEmailFyi}
							lensActive={view.lensActive}
							lensName={view.lensName}
							dealById={(id) => dashboard.dealById(id)}
						/>
					{:else if tab === 'slack' && b.slack}
						<SlackTab
							slack={b.slack}
							channels={view.filteredChannels}
							lensActive={view.lensActive}
							lensName={view.lensName}
							dealById={(id) => dashboard.dealById(id)}
						/>
					{:else if tab === 'research'}
						<ResearchTab
							intel={view.filteredIntel}
							lensActive={view.lensActive}
							lensName={view.lensName}
							categoryById={(id) => dashboard.categoryById(id)}
						/>
					{:else}
						<p class="text-xs text-base-content/40">Nothing to show.</p>
					{/if}
				</div>
			</div>
		</div>
	{:else if !dashboard.error && !dashboard.loading}
		<div class="rounded-xl bg-base-200/40 border border-base-content/5 px-6 py-10 text-center mt-3">
			<p class="text-sm text-base-content/60">No daily.json yet — run the briefing skill; auto-refresh will pick it up.</p>
		</div>
	{:else if dashboard.loading}
		<div class="flex justify-center py-12">
			<span class="loading loading-dots loading-md"></span>
		</div>
	{/if}
</div>

<MarkdownViewer
	open={memoryOpen}
	icon="📒"
	title="Memory"
	subtitle={null}
	content={dashboard.memory}
	onClose={() => (memoryOpen = false)}
/>

<MarkdownViewer
	open={prepDrawerOpen}
	icon="📝"
	title={prepMeta?.title ?? 'Meeting prep'}
	subtitle={prepMeta ? `${prepMeta.time} · ${prepMeta.filename}` : null}
	content={prepContent}
	loading={prepLoading}
	error={prepError}
	onClose={() => (prepDrawerOpen = false)}
/>

<QuestionEditor
	open={questionEditorOpen}
	question={editingQuestion}
	saving={dashboard.submittingAnswer}
	error={editorError}
	onSave={saveQuestionAnswer}
	onClose={() => {
		questionEditorOpen = false;
		editingQuestion = null;
		editorError = null;
	}}
/>

<CommandPalette
	open={paletteOpen}
	items={view.searchItems}
	onClose={() => (paletteOpen = false)}
	onSelect={dispatchSearchSelection}
/>
