<script lang="ts">
	import { onMount } from 'svelte';
	import { getDashboardStore } from '$lib/stores/dashboard.svelte';
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import { getRefreshStore } from '$lib/stores/refresh.svelte';
	import { readPrep } from '$lib/services/dashboard';
	import { isTauri } from '$lib/services/tauri';
	import type { DashboardQuestion, MeetingPrep } from '$lib/types';
	import DealPill from '$lib/components/dashboard/DealPill.svelte';
	import UrgencyDot from '$lib/components/dashboard/UrgencyDot.svelte';
	import SectionCard from '$lib/components/dashboard/SectionCard.svelte';
	import ExternalLink from '$lib/components/dashboard/ExternalLink.svelte';
	import MarkdownViewer from '$lib/components/dashboard/MarkdownViewer.svelte';
	import QuestionEditor from '$lib/components/dashboard/QuestionEditor.svelte';
	import QuestionStatusPill from '$lib/components/dashboard/QuestionStatusPill.svelte';
	import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte';
	import DealLensBar from '$lib/components/dashboard/DealLensBar.svelte';
	import CommandPalette from '$lib/components/dashboard/CommandPalette.svelte';
	import type { SearchItem } from '$lib/components/dashboard/CommandPalette.svelte';

	const dashboard = getDashboardStore();
	const settings = getSettingsStore();
	const refresh = getRefreshStore();

	const TAB_KEYS = ['summary', 'calendar', 'email', 'slack', 'research'] as const;
	type TabKey = (typeof TAB_KEYS)[number];

	let tab = $state<TabKey>('summary');
	let memoryOpen = $state(false);
	let menuOpen = $state(false);
	let funShowJoke = $state(false);
	let now = $state(new Date());
	let actionsOpen = $state(true);
	let prepsOpen = $state(false);
	let prepDrawerOpen = $state(false);
	let prepLoading = $state(false);
	let prepContent = $state<string | null>(null);
	let prepError = $state<string | null>(null);
	let prepMeta = $state<{ title: string; time: string; filename: string } | null>(null);
	let questionEditorOpen = $state(false);
	let editingQuestion = $state<DashboardQuestion | null>(null);
	let editorError = $state<string | null>(null);
	let showOpenQuestionsOnly = $state(true);
	let dealLens = $state<string | null>(null);
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
		menuOpen = false;
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

	function liveMinutesAway(startsAt: string | null | undefined): number | null {
		if (!startsAt) return null;
		const t = Date.parse(startsAt);
		if (Number.isNaN(t)) return null;
		return Math.round((t - now.getTime()) / 60000);
	}

	function staleness(generatedAt: string | null | undefined): { label: string; tone: 'fresh' | 'aging' | 'stale' } {
		if (!generatedAt) return { label: '—', tone: 'stale' };
		const ageMs = now.getTime() - Date.parse(generatedAt);
		if (Number.isNaN(ageMs)) return { label: '—', tone: 'stale' };
		const mins = Math.max(0, Math.round(ageMs / 60000));
		if (mins < 30) return { label: `${mins}m`, tone: 'fresh' };
		if (mins < 240) {
			const h = Math.floor(mins / 60);
			const m = mins % 60;
			return { label: `${h}h ${m}m`, tone: 'aging' };
		}
		const h = Math.round(mins / 60);
		return { label: `${h}h`, tone: 'stale' };
	}

	function fmtMinutesAway(m: number | null): string {
		if (m === null) return '';
		if (m <= 0) return 'now';
		if (m < 60) return `${m}m`;
		const h = Math.floor(m / 60);
		const mm = m % 60;
		return mm === 0 ? `${h}h` : `${h}h ${mm}m`;
	}

	function eventClass(type: string): string {
		if (type === 'declined') return 'opacity-50 line-through';
		if (type === 'personal_block' || type === 'personal') return 'opacity-70';
		return '';
	}

	function eventBorder(type: string, urgency: string): string {
		if (type === 'declined') return 'border-l-base-content/20';
		if (type === 'personal_block' || type === 'personal') return 'border-l-base-content/20';
		if (type === 'external' && (urgency === 'critical' || urgency === 'high')) return 'border-l-error';
		if (type === 'external') return 'border-l-warning';
		if (type === 'internal' && urgency === 'critical') return 'border-l-warning';
		if (type === 'internal') return 'border-l-success';
		return 'border-l-base-content/20';
	}

	function priorityRank(p: string): number {
		return p === 'critical' ? 0 : p === 'high' ? 1 : p === 'medium' ? 2 : 3;
	}

	// ── Deal-lens filtering ─────────────────────────────────────────────────
	const lensActive = $derived(dealLens !== null);
	const lensDeal = $derived(lensActive ? dashboard.dealById(dealLens) : null);
	const lensName = $derived(lensDeal?.name ?? dealLens);

	function tagsMatchDeal(tags: string[] | null | undefined, dealId: string): boolean {
		if (!tags) return false;
		const id = dealId.toLowerCase();
		return tags.some((t) => t.toLowerCase() === id);
	}

	const filteredActions = $derived.by(() => {
		const all = dashboard.briefing?.action_items ?? [];
		return lensActive ? all.filter((a) => a.deal_tag === dealLens) : all;
	});

	const filteredPreps = $derived.by(() => {
		const all = dashboard.briefing?.meeting_preps ?? [];
		return lensActive ? all.filter((p) => p.deal_tag === dealLens) : all;
	});

	const filteredEvents = $derived.by(() => {
		const all = dashboard.briefing?.calendar?.events ?? [];
		return lensActive ? all.filter((e) => e.deal_tag === dealLens) : all;
	});

	const filteredConflicts = $derived.by(() => {
		const all = dashboard.briefing?.calendar?.conflicts ?? [];
		if (!lensActive) return all;
		const visibleTitles = new Set(filteredEvents.map((e) => e.title));
		return all.filter((c) => c.event_titles.some((t) => visibleTitles.has(t)));
	});

	const filteredEmailActToday = $derived.by(() => {
		const all = dashboard.briefing?.email?.act_today ?? [];
		return lensActive ? all.filter((m) => m.deal_tag === dealLens) : all;
	});

	const filteredEmailFyi = $derived.by(() => {
		const all = dashboard.briefing?.email?.fyi ?? [];
		return lensActive ? all.filter((m) => m.deal_tag === dealLens) : all;
	});

	const filteredChannels = $derived.by(() => {
		const all = dashboard.briefing?.slack?.channels ?? [];
		return lensActive ? all.filter((ch) => ch.deal_tag === dealLens) : all;
	});

	const filteredIntel = $derived.by(() => {
		const all = dashboard.briefing?.intelligence ?? [];
		if (!lensActive) return all;
		return all
			.map((cat) => ({
				...cat,
				items: cat.items.filter((it) => tagsMatchDeal(it.tags, dealLens!))
			}))
			.filter((cat) => cat.items.length > 0);
	});

	const counts = $derived.by(() => {
		const b = dashboard.briefing;
		if (!b) return { calendar: 0, email: 0, slack: 0, research: 0, conflicts: 0, pending: 0 };
		return {
			calendar: filteredEvents.length,
			email: filteredEmailActToday.length + filteredEmailFyi.length,
			slack: filteredChannels.length,
			research: filteredIntel.reduce((n, c) => n + c.items.length, 0),
			conflicts: filteredConflicts.length,
			pending: dashboard.questions.filter((q) => q.status === 'PENDING').length
		};
	});

	// ── Cmd-K search index ──────────────────────────────────────────────────
	const searchItems = $derived.by(() => {
		const items: SearchItem[] = [];
		const lc = (s: string | null | undefined) => (s ?? '').toLowerCase();

		filteredActions.forEach((a, i) => {
			items.push({
				id: `action:${a.id}`,
				kind: 'action',
				title: a.text,
				subtitle: [a.deadline, a.deal_tag].filter(Boolean).join(' · ') || undefined,
				hay: lc([a.text, a.deadline, a.deal_tag, a.source_type].filter(Boolean).join(' ')),
				url: a.url
			});
		});

		filteredEmailActToday.concat(filteredEmailFyi).forEach((m) => {
			items.push({
				id: `email:${m.id}`,
				kind: 'email',
				title: m.subject,
				subtitle: `${m.from}${m.deal_tag ? ' · ' + m.deal_tag : ''}`,
				hay: lc([m.from, m.subject, m.summary, m.action, m.context, m.deal_tag, ...(m.tags ?? [])].filter(Boolean).join(' ')),
				url: m.url
			});
		});

		filteredChannels.forEach((ch) => {
			items.push({
				id: `channel:${ch.channel_id}`,
				kind: 'slack-channel',
				title: ch.channel_name,
				subtitle: `${ch.activity_level}${ch.deal_tag ? ' · ' + ch.deal_tag : ''}`,
				hay: lc([ch.channel_name, ch.deal_tag, ch.activity_level].filter(Boolean).join(' ')),
				url: ch.url
			});
			ch.messages.forEach((msg, mi) => {
				items.push({
					id: `msg:${ch.channel_id}:${mi}`,
					kind: 'slack-message',
					title: msg.summary,
					subtitle: `${msg.author ?? 'unknown'} · ${ch.channel_name}`,
					hay: lc([msg.author, msg.summary, msg.action, ch.channel_name].filter(Boolean).join(' ')),
					url: ch.url
				});
			});
		});

		filteredEvents.forEach((e, i) => {
			items.push({
				id: `event:${i}`,
				kind: 'event',
				title: e.title,
				subtitle: `${e.start}–${e.end}${e.deal_tag ? ' · ' + e.deal_tag : ''}`,
				hay: lc([e.title, e.notes, e.initiative, e.deal_tag, ...(e.participants ?? [])].filter(Boolean).join(' ')),
				url: e.links?.zoom ?? e.links?.doc ?? e.links?.other ?? null
			});
		});

		filteredPreps.forEach((p, i) => {
			items.push({
				id: `prep:${i}`,
				kind: 'prep',
				title: p.title,
				subtitle: `${p.time}${p.deal_tag ? ' · ' + p.deal_tag : ''}`,
				hay: lc([p.title, p.deal_tag, p.time].filter(Boolean).join(' ')),
				prepIndex: i
			});
		});

		filteredIntel.forEach((cat) => {
			cat.items.forEach((it, i) => {
				items.push({
					id: `intel:${cat.category_id}:${i}`,
					kind: 'intel',
					title: it.headline,
					subtitle: it.source ?? cat.category_id,
					hay: lc([it.headline, it.detail, it.relevance, ...(it.tags ?? [])].filter(Boolean).join(' ')),
					url: it.url
				});
			});
		});

		return items;
	});

	async function dispatchSearchSelection(item: SearchItem) {
		paletteOpen = false;
		if (item.kind === 'prep') {
			const prep = filteredPreps[item.prepIndex ?? -1];
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
	<!-- Top strip -->
	<header class="md:shrink-0 flex items-center gap-3 py-3 border-b border-base-content/5">
		<a href="/" class="btn btn-ghost btn-sm text-xs">← Back</a>
		<div class="flex-1 min-w-0">
			<h1 class="text-base font-semibold text-base-content leading-tight">Dashboard</h1>
			{#if dashboard.briefing}
				<p class="text-[10px] text-base-content/50 font-mono">
					{dashboard.briefing.meta.briefing_date} · {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
				</p>
			{/if}
		</div>

		{#if dashboard.briefing}
			{@const b = dashboard.briefing}
			{@const stale = staleness(b.meta.generated_at)}
			{@const nextMins = liveMinutesAway(b.meta.next_meeting?.starts_at)}

			{#if b.meta.next_meeting && nextMins !== null}
				<div class="hidden lg:flex items-center gap-1.5 text-xs text-base-content/70 max-w-xs">
					<span class="opacity-60">next:</span>
					<span class="font-medium text-base-content truncate">{b.meta.next_meeting.title}</span>
					<span
						class="font-mono"
						class:text-error={nextMins <= 5 && nextMins > 0}
						class:text-warning={nextMins > 5 && nextMins <= 15}
					>
						{fmtMinutesAway(nextMins)}
					</span>
				</div>
			{/if}

			<span
				class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium font-mono"
				class:bg-success={stale.tone === 'fresh'}
				class:text-success-content={stale.tone === 'fresh'}
				class:bg-warning={stale.tone === 'aging'}
				class:text-warning-content={stale.tone === 'aging'}
				class:bg-error={stale.tone === 'stale'}
				class:text-error-content={stale.tone === 'stale'}
				title="Time since briefing was generated"
			>
				{stale.label}
			</span>
		{/if}

		<button
			class="btn btn-ghost btn-sm text-[11px] gap-1.5 hidden sm:inline-flex"
			onclick={() => (paletteOpen = true)}
			title="Search today (⌘K)"
		>
			🔎
			<kbd class="text-[9px] font-mono px-1 py-0.5 bg-base-300/50 rounded border border-base-content/10">⌘K</kbd>
		</button>
		<div class="relative">
			<button
				class="btn btn-ghost btn-sm text-xs"
				onclick={() => (menuOpen = !menuOpen)}
				aria-expanded={menuOpen}
				aria-label="More"
			>
				⋯
			</button>
			{#if menuOpen}
				<div
					class="absolute right-0 mt-1 w-48 rounded-lg bg-base-200 border border-base-content/10 shadow-lg overflow-hidden z-30"
				>
					<button
						class="w-full text-left px-3 py-2 text-xs hover:bg-base-300 transition-colors flex items-center gap-2"
						onclick={openMemory}
					>
						<span>📒</span> View memory
					</button>
					<a
						href="/briefings"
						class="block px-3 py-2 text-xs hover:bg-base-300 transition-colors"
						onclick={() => (menuOpen = false)}
					>
						📋 Briefings archive
					</a>
					<a
						href="/settings"
						class="block px-3 py-2 text-xs hover:bg-base-300 transition-colors"
						onclick={() => (menuOpen = false)}
					>
						⚙️ Settings
					</a>
				</div>
			{/if}
		</div>
	</header>

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
			selected={dealLens}
			onSelect={(id) => (dealLens = id)}
		/>

		<!-- Two-pane body -->
		<div
			class="md:flex-1 md:min-h-0 flex flex-col md:flex-row gap-4 pt-3 pb-4"
		>
			<!-- Left rail (independent scroll on md+) -->
			<aside
				class="order-2 md:order-none md:w-80 md:shrink-0 flex flex-col gap-3 md:min-h-0"
			>
				<!-- Actions: takes share of remaining height when open, scrolls internally -->
				<div class={actionsOpen ? 'md:flex-1 md:min-h-0' : 'md:shrink-0'}>
					<SectionCard
						fillHeight={actionsOpen}
						collapsible
						defaultOpen
						onToggle={(o) => (actionsOpen = o)}
						icon="⚡"
						title="Action items"
						count={filteredActions.length}
					>
						{#if filteredActions.length === 0}
							<p class="text-xs text-base-content/40 italic">
								{lensActive ? `No actions for ${lensName}.` : 'Nothing queued.'}
							</p>
						{:else}
							<ul class="flex flex-col gap-2">
								{#each [...filteredActions].sort((a, c) => priorityRank(a.priority) - priorityRank(c.priority)) as a}
									{@const deal = dashboard.dealById(a.deal_tag)}
									<li class="rounded-lg bg-base-100/40 border border-base-content/5 px-3 py-2.5 flex flex-col gap-1.5">
										<div class="flex items-start gap-2">
											<UrgencyDot urgency={a.priority} size="md" />
											<p class="flex-1 min-w-0 text-xs text-base-content/85 leading-snug break-words">{a.text}</p>
										</div>
										<div class="flex items-center gap-1.5 flex-wrap text-[10px] text-base-content/50">
											{#if a.deadline}<span class="font-mono">⏰ {a.deadline}</span>{/if}
											{#if a.source_type}<span class="opacity-60">· {a.source_type}</span>{/if}
											<DealPill {deal} fallbackId={a.deal_tag} />
											{#if a.url}<ExternalLink href={a.url} label="open" />{/if}
										</div>
									</li>
								{/each}
							</ul>
						{/if}
					</SectionCard>
				</div>

				<!-- Meeting preps: takes share of remaining height when open, scrolls internally -->
				{#if filteredPreps.length > 0}
					<div class={prepsOpen ? 'md:flex-1 md:min-h-0' : 'md:shrink-0'}>
						<SectionCard
							fillHeight={prepsOpen}
							collapsible
							defaultOpen={false}
							onToggle={(o) => (prepsOpen = o)}
							icon="📝"
							title="Meeting preps"
							count={filteredPreps.length}
						>
							<ul class="flex flex-col gap-1.5">
								{#each filteredPreps as p}
									{@const deal = dashboard.dealById(p.deal_tag)}
									<li class="flex items-center gap-2 text-xs">
										<span class="font-mono text-base-content/50 w-12">{p.time}</span>
										<span class="flex-1 truncate text-base-content/80" title={p.title}>{p.title}</span>
										<DealPill {deal} fallbackId={p.deal_tag} />
										{#if p.file}
											<button
												class="text-[11px] text-primary hover:underline"
												onclick={() => openPrep(p)}
												title="Open prep document"
											>open</button>
										{/if}
									</li>
								{/each}
							</ul>
						</SectionCard>
					</div>
				{/if}

				<!-- Fun: pinned at the bottom -->
				{#if b.fun && (b.fun.fact || b.fun.joke)}
					<button
						class="md:shrink-0 rounded-xl bg-gradient-to-br from-secondary/10 via-accent/5 to-primary/10 border border-base-content/5 p-3 text-left hover:scale-[1.01] transition-transform"
						onclick={() => (funShowJoke = !funShowJoke)}
						title="Click to flip"
					>
						<div class="text-[10px] uppercase tracking-wider text-base-content/50 mb-1">
							{funShowJoke ? '😄 Joke' : '✨ Fun fact'}
						</div>
						<p class="text-xs text-base-content/80 leading-relaxed line-clamp-4">
							{funShowJoke ? (b.fun.joke ?? b.fun.fact) : (b.fun.fact ?? b.fun.joke)}
						</p>
					</button>
				{/if}
			</aside>

			<!-- Right pane: tabs + content (independent scroll on md+) -->
			<div class="order-1 md:order-none md:flex-1 md:min-w-0 md:min-h-0 flex flex-col">
				<!-- Tab strip -->
				<nav class="shrink-0 flex gap-1 border-b border-base-content/10 -mx-1 px-1 overflow-x-auto overflow-y-hidden">
					{#each TAB_KEYS as key}
						{@const active = tab === key}
						{@const count = key === 'summary' ? null : counts[key]}
						<button
							class="shrink-0 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 capitalize"
							class:border-primary={active}
							class:text-primary={active}
							class:border-transparent={!active}
							class:text-base-content={!active}
							class:opacity-60={!active}
							onclick={() => (tab = key)}
						>
							<span>{key}</span>
							{#if count !== null && count !== undefined && count > 0}
								<span
									class="rounded-full bg-base-300/60 px-1.5 py-0.5 text-[10px] font-mono"
									class:bg-primary={active}
									class:text-primary-content={active}
								>
									{count}
								</span>
							{/if}
							{#if key === 'calendar' && counts.conflicts > 0}
								<span class="text-warning" title="{counts.conflicts} conflict{counts.conflicts > 1 ? 's' : ''}">⚠</span>
							{/if}
						</button>
					{/each}
				</nav>

				<!-- Tab content -->
				<div class="md:flex-1 md:min-w-0 md:overflow-y-auto md:min-h-0 pt-4">
					{#if tab === 'summary'}
						<div class="flex flex-col gap-4">
							{#if b.greeting}
								<section class="rounded-xl bg-gradient-to-br from-primary/10 via-base-200/40 to-secondary/10 border border-base-content/5 px-5 py-4">
									<h2 class="text-lg font-semibold text-base-content">{b.greeting.text}</h2>
									{#if b.greeting.context_note}
										<div class="mt-2 rounded-lg bg-base-100/60 border border-base-content/10 px-3.5 py-2 text-sm text-base-content/80">
											💡 {b.greeting.context_note}
										</div>
									{/if}
								</section>
							{/if}

							{#if b.focus_prompt}
								<section class="rounded-xl bg-primary/5 border-l-4 border-primary px-5 py-4">
									<div class="text-[10px] uppercase tracking-wider text-primary/70 font-semibold mb-1.5">Today's focus</div>
									<p class="text-sm text-base-content/80 leading-relaxed whitespace-pre-wrap">{b.focus_prompt}</p>
								</section>
							{/if}

							{#if dashboard.questions.length > 0}
								{@const visibleQuestions = showOpenQuestionsOnly
									? dashboard.questions.filter((q) => q.status === 'PENDING')
									: dashboard.questions}
								<SectionCard
									icon="❓"
									title="Questions"
									subtitle={counts.pending > 0
										? `${counts.pending} pending of ${dashboard.questions.length}`
										: `All ${dashboard.questions.length} answered`}
									count={visibleQuestions.length}
								>
									{#snippet actions()}
										<button
											class="btn btn-ghost btn-xs h-7 min-h-7 text-[11px] gap-1.5 normal-case"
											class:btn-active={showOpenQuestionsOnly}
											onclick={() => (showOpenQuestionsOnly = !showOpenQuestionsOnly)}
											aria-pressed={showOpenQuestionsOnly}
											title="Toggle filter"
										>
											<span class="inline-block w-3 h-3 rounded-sm border border-base-content/30 flex items-center justify-center text-[10px] leading-none"
												class:bg-primary={showOpenQuestionsOnly}
												class:border-primary={showOpenQuestionsOnly}
												class:text-primary-content={showOpenQuestionsOnly}
											>
												{showOpenQuestionsOnly ? '✓' : ''}
											</span>
											Open only
										</button>
									{/snippet}

									{#if visibleQuestions.length === 0}
										<p class="text-xs text-base-content/40 italic">
											{showOpenQuestionsOnly
												? 'No open questions. Toggle the filter to see answered ones.'
												: 'No questions today.'}
										</p>
									{:else}
										<ul class="flex flex-col gap-2.5">
											{#each visibleQuestions as q (q.title)}
												{@const editable = q.status !== 'PROCESSED'}
												<li
													class="group rounded-lg border bg-base-100/40 px-4 py-3 transition-colors"
													class:border-warning={q.status === 'PENDING'}
													class:border-opacity-30={q.status === 'PENDING'}
													class:border-success={q.status === 'ANSWERED'}
													class:border-opacity-25={q.status === 'ANSWERED'}
													class:border-base-content={q.status === 'PROCESSED'}
													class:border-opacity-10={q.status === 'PROCESSED'}
													class:opacity-70={q.status === 'PROCESSED'}
												>
													<div class="flex items-start gap-2 mb-1.5">
														<QuestionStatusPill status={q.status} />
														<h4 class="flex-1 text-sm font-medium text-base-content leading-snug">{q.title}</h4>
														{#if editable}
															<button
																class="shrink-0 btn btn-xs h-7 min-h-7 normal-case text-[11px]"
																class:btn-primary={q.status === 'PENDING'}
																class:btn-ghost={q.status === 'ANSWERED'}
																onclick={() => openQuestionEditor(q)}
															>
																{q.status === 'PENDING' ? 'Answer' : 'Edit'}
															</button>
														{/if}
													</div>

													{#if q.context}
														<p class="text-xs text-base-content/55 italic mb-1.5 leading-snug">{q.context}</p>
													{/if}

													{#if q.body}
														<div class="text-xs text-base-content/75 leading-relaxed">
															<MarkdownRenderer markdown={q.body} />
														</div>
													{/if}

													{#if q.answer}
														<div class="mt-2.5 rounded-md bg-success/5 border-l-2 border-success/50 px-3 py-2">
															<div class="text-[10px] uppercase tracking-wider text-success/80 font-semibold mb-0.5">
																Your answer
															</div>
															<p class="text-xs text-base-content/85 whitespace-pre-wrap leading-snug">{q.answer}</p>
														</div>
													{/if}

													{#if q.asked || q.run}
														<div class="flex items-center gap-1.5 text-[10px] text-base-content/35 font-mono mt-2">
															{#if q.asked}<span>asked {q.asked}</span>{/if}
															{#if q.run}<span>· run {q.run}</span>{/if}
														</div>
													{/if}
												</li>
											{/each}
										</ul>
									{/if}
								</SectionCard>
							{/if}

							<footer class="text-[10px] text-base-content/40 pt-2">
								Generated {b.meta.generated_at} · timezone {b.meta.timezone ?? '?'}
								· run {b.meta.run_type ?? '?'} #{b.meta.update_sequence ?? 1}
								{#if dashboard.lastLoaded}· loaded {dashboard.lastLoaded.toLocaleTimeString()}{/if}
							</footer>
						</div>

					{:else if tab === 'calendar' && b.calendar}
						<div class="flex flex-col gap-3">
							{#if b.calendar.summary && !lensActive}
								<p class="text-xs text-base-content/60 italic">{b.calendar.summary}</p>
							{/if}
							{#if filteredConflicts.length > 0}
								<div class="flex flex-col gap-2">
									{#each filteredConflicts as c}
										<div class="min-w-0 rounded-lg bg-warning/10 border border-warning/20 px-3 py-2.5">
											<div class="flex items-center gap-2 text-xs font-medium text-warning mb-1">⚠️ Conflict at {c.time}</div>
											<p class="text-xs text-base-content/80 break-words">{c.description}</p>
											{#if c.action_needed}
												<p class="text-xs font-semibold text-base-content/90 mt-1.5 break-words">→ {c.action_needed}</p>
											{/if}
										</div>
									{/each}
								</div>
							{/if}
							{#if filteredEvents.length === 0}
								<p class="text-xs text-base-content/40 italic">
									{lensActive ? `No events for ${lensName}.` : 'No events today.'}
								</p>
							{/if}
							<ul class="flex flex-col gap-1">
								{#each filteredEvents as e}
									{@const deal = dashboard.dealById(e.deal_tag)}
									<li
										class="flex items-stretch gap-3 rounded-lg border-l-2 {eventBorder(e.type, e.urgency)} bg-base-100/30 px-3 py-2 text-xs {eventClass(e.type)}"
									>
										<div class="font-mono text-base-content/60 w-24 shrink-0 pt-0.5">{e.start}–{e.end}</div>
										<div class="flex-1 min-w-0 flex flex-col gap-0.5">
											<div class="flex items-center gap-1.5 flex-wrap">
												<UrgencyDot urgency={e.urgency} />
												<span class="font-medium text-base-content/90 truncate">{e.title}</span>
												<DealPill {deal} fallbackId={e.deal_tag} />
												{#if e.initiative}<span class="text-[10px] text-base-content/50">· {e.initiative}</span>{/if}
											</div>
											{#if e.notes}<p class="text-[11px] text-base-content/55 leading-snug break-words">{e.notes}</p>{/if}
											{#if e.participants.length > 0}
												<p class="text-[10px] text-base-content/40 truncate">{e.participants.join(', ')}</p>
											{/if}
										</div>
										<div class="flex items-center gap-1 shrink-0">
											{#if e.links?.zoom}<ExternalLink href={e.links.zoom} icon="📹" title="Zoom" />{/if}
											{#if e.links?.doc}<ExternalLink href={e.links.doc} icon="📄" title="Doc" />{/if}
											{#if e.links?.other}<ExternalLink href={e.links.other} icon="🔗" title="Link" />{/if}
										</div>
									</li>
								{/each}
							</ul>
						</div>

					{:else if tab === 'email' && b.email}
						<div class="flex flex-col gap-4">
							{#if filteredEmailActToday.length === 0 && filteredEmailFyi.length === 0}
								<p class="text-xs text-base-content/40 italic">
									{lensActive ? `No email for ${lensName}.` : 'No email today.'}
								</p>
							{/if}
							{#if filteredEmailActToday.length > 0}
								<div>
									<div class="text-[10px] uppercase tracking-wider text-base-content/50 font-semibold mb-2">Act today</div>
									<ul class="flex flex-col gap-2">
										{#each filteredEmailActToday as m}
											{@const deal = dashboard.dealById(m.deal_tag)}
											<li class="rounded-lg border-l-4 border-error/60 bg-base-100/40 px-3 py-2.5">
												<div class="flex items-center gap-2 mb-1 flex-wrap">
													<UrgencyDot urgency={m.urgency} />
													<span class="text-xs font-medium text-base-content">{m.from}</span>
													<DealPill {deal} fallbackId={m.deal_tag} />
													{#if m.url}<ExternalLink href={m.url} label="gmail" />{/if}
												</div>
												<p class="text-xs text-base-content/85 mb-0.5 break-words">{m.subject}</p>
												<p class="text-[11px] text-base-content/65 leading-snug break-words">{m.summary}</p>
												{#if m.action}<p class="text-[11px] text-base-content/85 font-medium mt-1 break-words">→ {m.action}</p>{/if}
											</li>
										{/each}
									</ul>
								</div>
							{/if}
							{#if filteredEmailFyi.length > 0}
								<div>
									<div class="text-[10px] uppercase tracking-wider text-base-content/50 font-semibold mb-2">FYI</div>
									<ul class="flex flex-col gap-1.5">
										{#each filteredEmailFyi as m}
											{@const deal = dashboard.dealById(m.deal_tag)}
											<li class="rounded-lg border border-base-content/10 bg-base-100/20 px-3 py-2 text-xs">
												<div class="flex items-center gap-2 mb-0.5 flex-wrap">
													<UrgencyDot urgency={m.urgency} />
													<span class="font-medium text-base-content/80">{m.from}</span>
													<span class="text-base-content/50">— {m.subject}</span>
													<DealPill {deal} fallbackId={m.deal_tag} />
													{#if m.url}<ExternalLink href={m.url} label="gmail" />{/if}
												</div>
												<p class="text-[11px] text-base-content/60 leading-snug break-words">{m.summary}</p>
												{#if m.context}<p class="text-[11px] text-base-content/50 italic mt-0.5 break-words">{m.context}</p>{/if}
											</li>
										{/each}
									</ul>
								</div>
							{/if}
							{#if b.email.no_action_summary && !lensActive}
								<p class="text-[10px] text-base-content/40 italic border-t border-base-content/5 pt-2">
									{b.email.no_action_summary}
								</p>
							{/if}
						</div>

					{:else if tab === 'slack' && b.slack}
						<div class="flex flex-col gap-3">
							{#if b.slack.since && !lensActive}
								<p class="text-[10px] text-base-content/50">Since {b.slack.since}</p>
							{/if}
							{#if filteredChannels.length === 0}
								<p class="text-xs text-base-content/40 italic">
									{lensActive ? `No slack channels for ${lensName}.` : 'No slack activity.'}
								</p>
							{/if}
							<ul class="flex flex-col gap-3">
								{#each filteredChannels as ch}
									{@const deal = dashboard.dealById(ch.deal_tag)}
									<li class="rounded-lg bg-base-100/30 border border-base-content/5 p-3">
										<div class="flex items-center gap-2 mb-2 flex-wrap">
											<span class="text-xs font-mono font-medium text-base-content/85">{ch.channel_name}</span>
											<DealPill {deal} fallbackId={ch.deal_tag} />
											<span
												class="text-[10px] uppercase tracking-wider rounded-full px-1.5 py-0.5"
												class:bg-success={ch.activity_level === 'high'}
												class:bg-warning={ch.activity_level === 'medium'}
												class:bg-base-300={ch.activity_level === 'low' || ch.activity_level === 'quiet'}
												class:text-success-content={ch.activity_level === 'high'}
												class:text-warning-content={ch.activity_level === 'medium'}
											>
												{ch.activity_level}
											</span>
											{#if ch.url}<ExternalLink href={ch.url} label="open" />{/if}
										</div>
										{#if ch.messages.length === 0}
											<p class="text-[11px] text-base-content/40">No messages.</p>
										{:else}
											<ul class="flex flex-col gap-1.5">
												{#each ch.messages as msg}
													<li class="text-[11px] border-l border-base-content/10 pl-2.5">
														<div class="flex items-center gap-1.5 mb-0.5">
															{#if msg.author}<span class="font-medium text-base-content/80">{msg.author}</span>{/if}
															{#if msg.timestamp}<span class="text-base-content/40 text-[10px]">{msg.timestamp.slice(11, 16)}</span>{/if}
														</div>
														<p class="text-base-content/65 leading-snug break-words">{msg.summary}</p>
														{#if msg.links.length > 0}
															<div class="flex flex-wrap gap-1 mt-1">
																{#each msg.links as l}<ExternalLink href={l.url} label={l.label} />{/each}
															</div>
														{/if}
														{#if msg.action}<p class="text-base-content/85 font-medium mt-0.5 break-words">→ {msg.action}</p>{/if}
													</li>
												{/each}
											</ul>
										{/if}
									</li>
								{/each}
							</ul>
							{#if !lensActive && b.slack.dms.length > 0}
								<div>
									<div class="text-[10px] uppercase tracking-wider text-base-content/50 font-semibold mb-2">DMs</div>
									<ul class="flex flex-col gap-1.5">
										{#each b.slack.dms as dm}
											<li class="rounded-lg bg-base-100/30 px-3 py-2 text-xs">
												<div class="flex items-center gap-2 mb-0.5">
													<span class="font-medium text-base-content/80">{dm.with}</span>
													{#if dm.url}<ExternalLink href={dm.url} label="open" />{/if}
												</div>
												<p class="text-[11px] text-base-content/60 break-words">{dm.summary}</p>
												{#if dm.action}<p class="text-[11px] text-base-content/85 font-medium mt-0.5 break-words">→ {dm.action}</p>{/if}
											</li>
										{/each}
									</ul>
								</div>
							{/if}
						</div>

					{:else if tab === 'research'}
						<div class="flex flex-col gap-3">
							{#if filteredIntel.length === 0}
								<p class="text-xs text-base-content/40 italic">
									{lensActive ? `No intel tagged for ${lensName}.` : 'No intelligence items today.'}
								</p>
							{/if}
							{#each filteredIntel as cat}
								{@const def = dashboard.categoryById(cat.category_id)}
								<SectionCard
									icon={def?.icon ?? '📰'}
									title={def?.label ?? cat.category_id}
									count={cat.items.length}
									collapsible={true}
									defaultOpen={cat.items.length <= 3}
								>
									<ul class="flex flex-col gap-2">
										{#each cat.items as it}
											<li class="rounded-lg bg-base-100/30 px-3 py-2.5">
												<div class="flex items-start gap-2 mb-1 flex-wrap">
													<h4 class="text-xs font-semibold text-base-content/90 flex-1 min-w-0 break-words">{it.headline}</h4>
													{#if it.url}<ExternalLink href={it.url} label={it.source ?? 'source'} />{/if}
												</div>
												<p class="text-[11px] text-base-content/65 leading-snug break-words">{it.detail}</p>
												{#if it.relevance}<p class="text-[11px] text-primary/80 italic mt-1.5 break-words">↳ {it.relevance}</p>{/if}
											</li>
										{/each}
									</ul>
								</SectionCard>
							{/each}
						</div>
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
	items={searchItems}
	onClose={() => (paletteOpen = false)}
	onSelect={dispatchSearchSelection}
/>
