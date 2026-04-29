<script lang="ts">
	import AppLauncher from '$lib/components/AppLauncher.svelte';
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import { getRefreshStore } from '$lib/stores/refresh.svelte';
	import { readDaily, getDailyStatus } from '$lib/services/dashboard';
	import { isTauri } from '$lib/services/tauri';
	import { onMount } from 'svelte';
	import type { ActionItem, DailyBriefing } from '$lib/types';

	const settings = getSettingsStore();
	const refresh = getRefreshStore();

	let briefing = $state<DailyBriefing | null>(null);
	let pendingQuestions = $state(0);
	let dailyExists = $state(true);
	let loaded = $state(false);
	let loadError = $state<string | null>(null);
	let now = $state(new Date());
	let funShowJoke = $state(false);

	onMount(() => {
		if (!isTauri()) return;
		const tick = setInterval(() => (now = new Date()), 30_000);
		void load();
		const unregister = refresh.register({
			id: 'home',
			softRefresh: softRefreshHome
		});
		return () => {
			clearInterval(tick);
			unregister();
		};
	});

	async function load() {
		await new Promise<void>((resolve) => {
			const check = () => (settings.loaded ? resolve() : setTimeout(check, 50));
			check();
		});
		const { daily_dir, briefings_dir } = settings.current;
		try {
			const [b, status] = await Promise.allSettled([
				readDaily(daily_dir, briefings_dir),
				getDailyStatus(daily_dir)
			]);
			if (status.status === 'fulfilled') {
				pendingQuestions = status.value.pending_questions;
				dailyExists = status.value.exists;
			}
			if (b.status === 'fulfilled') {
				briefing = b.value;
			} else if (dailyExists) {
				// only flag a real error when the file should be there
				loadError = String(b.reason);
			}
			loaded = true;
		} catch (e) {
			loadError = String(e);
			loaded = true;
		}
	}

	async function softRefreshHome() {
		if (!isTauri() || !settings.loaded) return;
		const { daily_dir, briefings_dir } = settings.current;
		const [b, status] = await Promise.allSettled([
			readDaily(daily_dir, briefings_dir),
			getDailyStatus(daily_dir)
		]);
		if (status.status === 'fulfilled') {
			pendingQuestions = status.value.pending_questions;
			dailyExists = status.value.exists;
		}
		if (b.status === 'fulfilled') {
			briefing = b.value;
		}
	}

	function priorityRank(p: string): number {
		return p === 'critical' ? 0 : p === 'high' ? 1 : p === 'medium' ? 2 : 3;
	}

	function liveMinutesAway(startsAt: string | null | undefined): number | null {
		if (!startsAt) return null;
		const t = Date.parse(startsAt);
		if (Number.isNaN(t)) return null;
		return Math.round((t - now.getTime()) / 60000);
	}

	function fmtMinutesAway(m: number | null): string {
		if (m === null) return '';
		if (m <= 0) return 'now';
		if (m < 60) return `${m} min`;
		const h = Math.floor(m / 60);
		const mm = m % 60;
		return mm === 0 ? `${h}h` : `${h}h ${mm}m`;
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

	const topActions = $derived.by((): ActionItem[] => {
		if (!briefing) return [];
		return [...briefing.action_items]
			.sort((a, c) => priorityRank(a.priority) - priorityRank(c.priority))
			.slice(0, 3);
	});

	async function openUrl(url: string | null | undefined) {
		if (!url) return;
		if (isTauri()) {
			const { open } = await import('@tauri-apps/plugin-shell');
			await open(url);
		} else {
			window.open(url, '_blank', 'noopener');
		}
	}
</script>

<div class="flex flex-col items-center min-h-[calc(100vh-6rem)] gap-6 px-4 py-6">
	<!-- Brand -->
	<div class="text-center">
		<h1 class="font-pixel text-lg tracking-wider text-primary retro-glow mb-1">YARVIS</h1>
		<p class="text-xs text-base-content/40">
			<span class="text-primary/70 font-semibold">Y</span>our
			<span class="text-primary/70 font-semibold">A</span>utonomous
			<span class="text-primary/70 font-semibold">R</span>esource
			<span class="text-primary/70 font-semibold">V</span>ault &amp;
			<span class="text-primary/70 font-semibold">I</span>ntelligence
			<span class="text-primary/70 font-semibold">S</span>uite
		</p>
	</div>

	<AppLauncher />

	<!-- Today panel -->
	<div class="w-full max-w-3xl flex flex-col gap-3">
		{#if briefing}
			{@const b = briefing}
			{@const stale = staleness(b.meta.generated_at)}
			{@const nextMins = liveMinutesAway(b.meta.next_meeting?.starts_at)}

			<!-- A. Greeting banner -->
			{#if b.greeting}
				<section
					class="rounded-2xl bg-gradient-to-br from-primary/10 via-base-200/40 to-secondary/10 border border-base-content/5 px-5 py-4"
				>
					<h2 class="text-base font-semibold text-base-content leading-snug">{b.greeting.text}</h2>
					{#if b.greeting.context_note}
						<p class="text-xs text-base-content/70 mt-1.5 leading-relaxed break-words">
							💡 {b.greeting.context_note}
						</p>
					{/if}
				</section>
			{/if}

			<!-- B + E + D strip -->
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
				<!-- B. Next meeting -->
				<a
					href="/dashboard#calendar"
					class="rounded-xl bg-base-200/40 border border-base-content/5 p-3 flex flex-col gap-1 hover:bg-base-200/60 transition-colors no-underline"
				>
					<div class="text-[10px] uppercase tracking-wider text-base-content/40 font-semibold">
						Next meeting
					</div>
					{#if b.meta.next_meeting && nextMins !== null}
						<div class="text-sm font-medium text-base-content truncate">{b.meta.next_meeting.title}</div>
						<div class="flex items-baseline gap-1.5">
							<span
								class="text-base font-mono"
								class:text-error={nextMins <= 5 && nextMins > 0}
								class:text-warning={nextMins > 5 && nextMins <= 15}
								class:text-success={nextMins > 15}
							>
								{fmtMinutesAway(nextMins)}
							</span>
							<span class="text-[10px] text-base-content/40">
								· {b.meta.next_meeting.starts_at.slice(11, 16)}
							</span>
						</div>
					{:else}
						<p class="text-xs text-base-content/40 italic">No more meetings today.</p>
					{/if}
				</a>

				<!-- E. Day pulse -->
				<a
					href="/dashboard"
					class="rounded-xl bg-base-200/40 border border-base-content/5 p-3 flex flex-col gap-1 hover:bg-base-200/60 transition-colors no-underline"
				>
					<div class="text-[10px] uppercase tracking-wider text-base-content/40 font-semibold">
						Day pulse
					</div>
					<div class="flex items-baseline gap-3 text-sm font-mono mt-0.5">
						<span title="Events today">📅 {b.calendar?.events.length ?? 0}</span>
						<span title="Conflicts">⚠ {b.calendar?.conflicts.length ?? 0}</span>
						<span title="Action items">⚡ {b.action_items.length}</span>
					</div>
					<div class="text-[10px] mt-1">
						<span
							class:text-success={stale.tone === 'fresh'}
							class:text-warning={stale.tone === 'aging'}
							class:text-error={stale.tone === 'stale'}
						>
							{stale.label} ago
						</span>
						<span class="text-base-content/40">· {b.meta.run_type ?? '?'}</span>
					</div>
				</a>

				<!-- D. Pending questions -->
				<a
					href="/dashboard#summary"
					class="rounded-xl bg-base-200/40 border border-base-content/5 p-3 flex flex-col gap-1 hover:bg-base-200/60 transition-colors no-underline"
				>
					<div class="text-[10px] uppercase tracking-wider text-base-content/40 font-semibold">
						Questions
					</div>
					{#if pendingQuestions > 0}
						<div class="flex items-baseline gap-1.5">
							<span class="text-base font-mono text-warning">{pendingQuestions}</span>
							<span class="text-xs text-base-content/60">open</span>
						</div>
						<div class="text-[10px] text-base-content/40">Click to answer →</div>
					{:else}
						<div class="text-sm text-base-content/40 italic">All caught up</div>
					{/if}
				</a>
			</div>

			<!-- C. Top actions -->
			{#if topActions.length > 0}
				<section class="rounded-xl bg-base-200/40 border border-base-content/5 p-3">
					<div class="flex items-center gap-2 mb-2">
						<span class="text-[10px] uppercase tracking-wider text-base-content/40 font-semibold">
							⚡ Top actions
						</span>
						<a href="/dashboard" class="text-[10px] text-primary hover:underline ml-auto">all →</a>
					</div>
					<ul class="flex flex-col gap-1.5">
						{#each topActions as a}
							<li class="flex items-start gap-2 text-xs">
								<span
									class="inline-block w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
									class:bg-error={a.priority === 'critical'}
									class:bg-warning={a.priority === 'high'}
									class:bg-info={a.priority === 'medium'}
									class:bg-base-content={a.priority === 'low'}
									class:bg-opacity-40={a.priority === 'low'}
								></span>
								{#if a.url}
									<button
										class="flex-1 min-w-0 text-left text-base-content/85 leading-snug break-words hover:text-primary transition-colors"
										onclick={() => openUrl(a.url)}
									>
										{a.text}
									</button>
								{:else}
									<p class="flex-1 min-w-0 text-base-content/85 leading-snug break-words">{a.text}</p>
								{/if}
								{#if a.deadline}
									<span class="text-[10px] text-base-content/45 font-mono shrink-0 mt-0.5">{a.deadline}</span>
								{/if}
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			<!-- Focus + Fun -->
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
				{#if b.focus_prompt}
					<section class="rounded-xl bg-primary/5 border-l-4 border-primary px-4 py-3">
						<div class="text-[10px] uppercase tracking-wider text-primary/70 font-semibold mb-1.5">
							🎯 Today's focus
						</div>
						<p class="text-xs text-base-content/80 leading-relaxed whitespace-pre-wrap break-words">
							{b.focus_prompt}
						</p>
					</section>
				{/if}

				{#if b.fun && (b.fun.fact || b.fun.joke)}
					<button
						class="rounded-xl bg-gradient-to-br from-secondary/10 via-accent/5 to-primary/10 border border-base-content/5 px-4 py-3 text-left hover:scale-[1.01] transition-transform"
						onclick={() => (funShowJoke = !funShowJoke)}
						title="Click to flip"
					>
						<div class="text-[10px] uppercase tracking-wider text-base-content/50 font-semibold mb-1.5">
							{funShowJoke ? '😄 Joke' : '✨ Fun fact'}
						</div>
						<p class="text-xs text-base-content/80 leading-relaxed break-words">
							{funShowJoke ? (b.fun.joke ?? b.fun.fact) : (b.fun.fact ?? b.fun.joke)}
						</p>
					</button>
				{/if}
			</div>
		{:else if loaded && !dailyExists}
			<div class="rounded-xl bg-base-200/40 border border-base-content/5 px-4 py-6 text-center">
				<p class="text-sm text-base-content/60">No briefing yet today.</p>
				<p class="text-xs text-base-content/40 mt-1">
					Run the briefing skill in <code class="font-mono">~/claude-chats</code>, then come back.
				</p>
			</div>
		{:else if loadError && loaded}
			<div class="rounded-xl bg-error/10 border border-error/20 px-4 py-3 text-xs text-error">
				<div class="font-semibold mb-1">Couldn't load today's briefing</div>
				<div class="font-mono opacity-80 whitespace-pre-wrap break-words">{loadError}</div>
				<div class="mt-1.5 opacity-80">
					Check the daily directory in <a href="/settings" class="underline">Settings</a>.
				</div>
			</div>
		{/if}
	</div>
</div>
