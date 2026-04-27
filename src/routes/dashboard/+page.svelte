<script lang="ts">
	import { onMount } from 'svelte';
	import { getDashboardStore } from '$lib/stores/dashboard.svelte';
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import DealPill from '$lib/components/dashboard/DealPill.svelte';
	import UrgencyDot from '$lib/components/dashboard/UrgencyDot.svelte';
	import SectionCard from '$lib/components/dashboard/SectionCard.svelte';
	import ExternalLink from '$lib/components/dashboard/ExternalLink.svelte';
	import MemoryDrawer from '$lib/components/dashboard/MemoryDrawer.svelte';

	const dashboard = getDashboardStore();
	const settings = getSettingsStore();

	let memoryOpen = $state(false);
	let menuOpen = $state(false);
	let funShowJoke = $state(false);
	let now = $state(new Date());

	onMount(() => {
		const t = setInterval(() => (now = new Date()), 30_000);
		void load();
		return () => clearInterval(t);
	});

	async function load() {
		await settings.load();
		const { daily_dir, daily_src_dir } = settings.current;
		await dashboard.load(daily_dir, daily_src_dir);
	}

	async function openMemory() {
		menuOpen = false;
		await dashboard.loadMemory(settings.current.daily_dir);
		memoryOpen = true;
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
		if (mins < 30) return { label: `${mins} min ago`, tone: 'fresh' };
		if (mins < 240) {
			const h = Math.floor(mins / 60);
			const m = mins % 60;
			return { label: `${h}h ${m}m ago`, tone: 'aging' };
		}
		const h = Math.round(mins / 60);
		return { label: `${h}h ago`, tone: 'stale' };
	}

	function fmtMinutesAway(m: number | null): string {
		if (m === null) return '';
		if (m <= 0) return 'now';
		if (m < 60) return `${m} min`;
		const h = Math.floor(m / 60);
		const mm = m % 60;
		return mm === 0 ? `${h}h` : `${h}h ${mm}m`;
	}

	function eventClass(type: string, urgency: string): string {
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
</script>

<div class="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-5">
	<!-- Top bar -->
	<header class="flex items-center gap-3">
		<a href="/" class="btn btn-ghost btn-sm text-xs">← Back</a>
		<h1 class="text-lg font-semibold text-base-content flex-1">Dashboard</h1>
		<button
			class="btn btn-primary btn-sm text-xs"
			onclick={load}
			disabled={dashboard.loading}
			title="Re-read daily.json"
		>
			{dashboard.loading ? 'Loading…' : '↻ Refresh'}
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
		<div class="rounded-xl bg-error/10 text-error border border-error/20 px-4 py-3 text-sm">
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
		{@const stale = staleness(b.meta.generated_at)}
		{@const nextMins = liveMinutesAway(b.meta.next_meeting?.starts_at)}

		<!-- Hero -->
		<section
			class="rounded-2xl bg-gradient-to-br from-primary/10 via-base-200/40 to-secondary/10 border border-base-content/5 px-6 py-5 flex flex-col gap-3"
		>
			<div class="flex items-start gap-3 flex-wrap">
				<div class="flex-1 min-w-0">
					<h2 class="text-xl font-semibold text-base-content">
						{b.greeting?.text ?? `Today — ${b.meta.briefing_date}`}
					</h2>
					{#if b.meta.run_type}
						<p class="text-[11px] uppercase tracking-wider text-base-content/50 mt-0.5">
							{b.meta.run_type} · update #{b.meta.update_sequence ?? 1}
						</p>
					{/if}
				</div>
				<div class="flex flex-col items-end gap-1">
					<span
						class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
						class:bg-success={stale.tone === 'fresh'}
						class:text-success-content={stale.tone === 'fresh'}
						class:bg-warning={stale.tone === 'aging'}
						class:text-warning-content={stale.tone === 'aging'}
						class:bg-error={stale.tone === 'stale'}
						class:text-error-content={stale.tone === 'stale'}
					>
						{stale.label}
					</span>
					{#if dashboard.questions.length > 0}
						{@const pending = dashboard.questions.filter((q) => q.status === 'PENDING').length}
						{#if pending > 0}
							<span class="text-[10px] text-base-content/60">
								{pending} pending {pending === 1 ? 'question' : 'questions'}
							</span>
						{/if}
					{/if}
				</div>
			</div>

			{#if b.greeting?.context_note}
				<div
					class="rounded-lg bg-base-100/60 border border-base-content/10 px-4 py-2.5 text-sm text-base-content/80"
				>
					💡 {b.greeting.context_note}
				</div>
			{/if}

			{#if b.meta.next_meeting && nextMins !== null}
				<div class="flex items-center gap-2 text-xs text-base-content/70">
					<span class="opacity-60">Next:</span>
					<span class="font-medium text-base-content">{b.meta.next_meeting.title}</span>
					<span class="opacity-60">in</span>
					<span
						class="font-mono"
						class:text-error={nextMins <= 5 && nextMins > 0}
						class:text-warning={nextMins > 5 && nextMins <= 15}
					>
						{fmtMinutesAway(nextMins)}
					</span>
					<span class="opacity-40">·</span>
					<span class="opacity-60">{b.meta.next_meeting.starts_at.slice(11, 16)}</span>
				</div>
			{/if}
		</section>

		<!-- Focus prompt -->
		{#if b.focus_prompt}
			<section class="rounded-xl bg-primary/5 border-l-4 border-primary px-5 py-4">
				<div class="text-[10px] uppercase tracking-wider text-primary/70 font-semibold mb-1.5">
					Today's focus
				</div>
				<p class="text-sm text-base-content/80 leading-relaxed whitespace-pre-wrap">
					{b.focus_prompt}
				</p>
			</section>
		{/if}

		<!-- Pending questions banner -->
		{#if dashboard.questions.filter((q) => q.status === 'PENDING').length > 0}
			<SectionCard
				icon="❓"
				title="Pending questions"
				subtitle="The skill is asking — answer in question.md (inline editor lands in Phase 2)"
				count={dashboard.questions.filter((q) => q.status === 'PENDING').length}
				collapsible={true}
			>
				<ul class="flex flex-col gap-2.5">
					{#each dashboard.questions as q}
						<li
							class="rounded-lg border px-3.5 py-2.5"
							class:border-warning={q.status === 'PENDING'}
							class:bg-warning={q.status === 'PENDING'}
							class:bg-opacity-5={q.status === 'PENDING'}
							class:border-base-content={q.status !== 'PENDING'}
							class:border-opacity-10={q.status !== 'PENDING'}
						>
							<div class="flex items-center gap-2 mb-1">
								<span
									class="text-[10px] font-mono uppercase tracking-wider"
									class:text-warning={q.status === 'PENDING'}
									class:text-success={q.status === 'ANSWERED'}
									class:text-base-content={q.status === 'PROCESSED'}
									class:opacity-50={q.status === 'PROCESSED'}
								>
									[{q.status}]
								</span>
								<h4 class="text-sm font-medium text-base-content">{q.title}</h4>
							</div>
							{#if q.context}
								<p class="text-xs text-base-content/60 mb-1">{q.context}</p>
							{/if}
							{#if q.body}
								<p class="text-xs text-base-content/70 whitespace-pre-wrap">{q.body}</p>
							{/if}
							{#if q.answer}
								<div class="mt-2 rounded bg-base-300/40 px-2.5 py-1.5 text-xs text-base-content/80">
									{q.answer}
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			</SectionCard>
		{/if}

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
			<!-- Action items rail -->
			<div class="lg:col-span-1 flex flex-col gap-5">
				<SectionCard
					icon="⚡"
					title="Action items"
					count={b.action_items.length}
				>
					{#if b.action_items.length === 0}
						<p class="text-xs text-base-content/40">Nothing queued.</p>
					{:else}
						<ul class="flex flex-col gap-2">
							{#each [...b.action_items].sort((a, c) => priorityRank(a.priority) - priorityRank(c.priority)) as a}
								{@const deal = dashboard.dealById(a.deal_tag)}
								<li class="rounded-lg bg-base-100/40 border border-base-content/5 px-3 py-2.5 flex flex-col gap-1.5">
									<div class="flex items-start gap-2">
										<UrgencyDot urgency={a.priority} size="md" />
										<p class="flex-1 text-xs text-base-content/85 leading-snug">
											{a.text}
										</p>
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

				<!-- Meeting preps -->
				{#if b.meeting_preps.length > 0}
					<SectionCard icon="📝" title="Meeting preps" count={b.meeting_preps.length}>
						<ul class="flex flex-col gap-1.5">
							{#each b.meeting_preps as p}
								{@const deal = dashboard.dealById(p.deal_tag)}
								<li class="flex items-center gap-2 text-xs">
									<span class="font-mono text-base-content/50 w-12">{p.time}</span>
									<span class="flex-1 truncate text-base-content/80" title={p.title}>{p.title}</span>
									<DealPill {deal} fallbackId={p.deal_tag} />
									{#if p.file}
										<a
											href="/briefings"
											class="text-[11px] text-primary hover:underline"
											title="Open in Briefings viewer"
										>
											open
										</a>
									{/if}
								</li>
							{/each}
						</ul>
					</SectionCard>
				{/if}

				<!-- Fun -->
				{#if b.fun && (b.fun.fact || b.fun.joke)}
					<button
						class="rounded-xl bg-gradient-to-br from-secondary/10 via-accent/5 to-primary/10 border border-base-content/5 p-4 text-left hover:scale-[1.01] transition-transform"
						onclick={() => (funShowJoke = !funShowJoke)}
						title="Click to flip"
					>
						<div class="text-[10px] uppercase tracking-wider text-base-content/50 mb-1.5">
							{funShowJoke ? '😄 Joke' : '✨ Fun fact'}
						</div>
						<p class="text-xs text-base-content/80 leading-relaxed">
							{funShowJoke ? (b.fun.joke ?? b.fun.fact) : (b.fun.fact ?? b.fun.joke)}
						</p>
					</button>
				{/if}
			</div>

			<!-- Main column -->
			<div class="lg:col-span-2 flex flex-col gap-5">
				<!-- Calendar -->
				{#if b.calendar}
					<SectionCard
						icon="📅"
						title="Today's calendar"
						subtitle={b.calendar.summary}
						count={b.calendar.events.length}
					>
						{#if b.calendar.conflicts.length > 0}
							<div class="mb-3 flex flex-col gap-2">
								{#each b.calendar.conflicts as c}
									<div class="rounded-lg bg-warning/10 border border-warning/20 px-3 py-2.5">
										<div class="flex items-center gap-2 text-xs font-medium text-warning mb-1">
											⚠️ Conflict at {c.time}
										</div>
										<p class="text-xs text-base-content/80">{c.description}</p>
										{#if c.action_needed}
											<p class="text-xs font-semibold text-base-content/90 mt-1.5">
												→ {c.action_needed}
											</p>
										{/if}
									</div>
								{/each}
							</div>
						{/if}

						<ul class="flex flex-col gap-1">
							{#each b.calendar.events as e}
								{@const deal = dashboard.dealById(e.deal_tag)}
								<li
									class="flex items-stretch gap-3 rounded-lg border-l-2 {eventBorder(e.type, e.urgency)} bg-base-100/30 px-3 py-2 text-xs {eventClass(e.type, e.urgency)}"
								>
									<div class="font-mono text-base-content/60 w-24 shrink-0 pt-0.5">
										{e.start}–{e.end}
									</div>
									<div class="flex-1 min-w-0 flex flex-col gap-0.5">
										<div class="flex items-center gap-1.5 flex-wrap">
											<UrgencyDot urgency={e.urgency} />
											<span class="font-medium text-base-content/90 truncate">{e.title}</span>
											<DealPill {deal} fallbackId={e.deal_tag} />
											{#if e.initiative}
												<span class="text-[10px] text-base-content/50">· {e.initiative}</span>
											{/if}
										</div>
										{#if e.notes}
											<p class="text-[11px] text-base-content/55 leading-snug">{e.notes}</p>
										{/if}
										{#if e.participants.length > 0}
											<p class="text-[10px] text-base-content/40 truncate">
												{e.participants.join(', ')}
											</p>
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
					</SectionCard>
				{/if}

				<!-- Email -->
				{#if b.email}
					<SectionCard
						icon="✉️"
						title="Email"
						subtitle={b.email.no_action_summary}
						count={b.email.act_today.length + b.email.fyi.length}
					>
						{#if b.email.act_today.length > 0}
							<div class="mb-3">
								<div class="text-[10px] uppercase tracking-wider text-base-content/50 font-semibold mb-2">
									Act today
								</div>
								<ul class="flex flex-col gap-2">
									{#each b.email.act_today as m}
										{@const deal = dashboard.dealById(m.deal_tag)}
										<li class="rounded-lg border-l-4 border-error/60 bg-base-100/40 px-3 py-2.5">
											<div class="flex items-center gap-2 mb-1 flex-wrap">
												<UrgencyDot urgency={m.urgency} />
												<span class="text-xs font-medium text-base-content">{m.from}</span>
												<DealPill {deal} fallbackId={m.deal_tag} />
												{#if m.url}<ExternalLink href={m.url} label="gmail" />{/if}
											</div>
											<p class="text-xs text-base-content/85 mb-0.5">{m.subject}</p>
											<p class="text-[11px] text-base-content/65 leading-snug">{m.summary}</p>
											{#if m.action}
												<p class="text-[11px] text-base-content/85 font-medium mt-1">
													→ {m.action}
												</p>
											{/if}
										</li>
									{/each}
								</ul>
							</div>
						{/if}

						{#if b.email.fyi.length > 0}
							<div>
								<div class="text-[10px] uppercase tracking-wider text-base-content/50 font-semibold mb-2">
									FYI
								</div>
								<ul class="flex flex-col gap-1.5">
									{#each b.email.fyi as m}
										{@const deal = dashboard.dealById(m.deal_tag)}
										<li class="rounded-lg border border-base-content/10 bg-base-100/20 px-3 py-2 text-xs">
											<div class="flex items-center gap-2 mb-0.5 flex-wrap">
												<UrgencyDot urgency={m.urgency} />
												<span class="font-medium text-base-content/80">{m.from}</span>
												<span class="text-base-content/50">— {m.subject}</span>
												<DealPill {deal} fallbackId={m.deal_tag} />
												{#if m.url}<ExternalLink href={m.url} label="gmail" />{/if}
											</div>
											<p class="text-[11px] text-base-content/60 leading-snug">{m.summary}</p>
											{#if m.context}
												<p class="text-[11px] text-base-content/50 italic mt-0.5">{m.context}</p>
											{/if}
										</li>
									{/each}
								</ul>
							</div>
						{/if}
					</SectionCard>
				{/if}

				<!-- Slack -->
				{#if b.slack && (b.slack.channels.length > 0 || b.slack.dms.length > 0)}
					<SectionCard
						icon="💬"
						title="Slack"
						subtitle={b.slack.since ? `Since ${b.slack.since}` : null}
						count={b.slack.channels.length}
					>
						<ul class="flex flex-col gap-3">
							{#each b.slack.channels as ch}
								{@const deal = dashboard.dealById(ch.deal_tag)}
								<li class="rounded-lg bg-base-100/30 border border-base-content/5 p-3">
									<div class="flex items-center gap-2 mb-2 flex-wrap">
										<span class="text-xs font-mono font-medium text-base-content/85">
											{ch.channel_name}
										</span>
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
														{#if msg.author}
															<span class="font-medium text-base-content/80">{msg.author}</span>
														{/if}
														{#if msg.timestamp}
															<span class="text-base-content/40 text-[10px]">{msg.timestamp.slice(11, 16)}</span>
														{/if}
													</div>
													<p class="text-base-content/65 leading-snug">{msg.summary}</p>
													{#if msg.links.length > 0}
														<div class="flex flex-wrap gap-1 mt-1">
															{#each msg.links as l}
																<ExternalLink href={l.url} label={l.label} />
															{/each}
														</div>
													{/if}
													{#if msg.action}
														<p class="text-base-content/85 font-medium mt-0.5">→ {msg.action}</p>
													{/if}
												</li>
											{/each}
										</ul>
									{/if}
								</li>
							{/each}
						</ul>
						{#if b.slack.dms.length > 0}
							<div class="mt-3">
								<div class="text-[10px] uppercase tracking-wider text-base-content/50 font-semibold mb-2">
									DMs
								</div>
								<ul class="flex flex-col gap-1.5">
									{#each b.slack.dms as dm}
										<li class="rounded-lg bg-base-100/30 px-3 py-2 text-xs">
											<div class="flex items-center gap-2 mb-0.5">
												<span class="font-medium text-base-content/80">{dm.with}</span>
												{#if dm.url}<ExternalLink href={dm.url} label="open" />{/if}
											</div>
											<p class="text-[11px] text-base-content/60">{dm.summary}</p>
											{#if dm.action}
												<p class="text-[11px] text-base-content/85 font-medium mt-0.5">→ {dm.action}</p>
											{/if}
										</li>
									{/each}
								</ul>
							</div>
						{/if}
					</SectionCard>
				{/if}

				<!-- Intelligence -->
				{#if b.intelligence.length > 0}
					{#each b.intelligence as cat}
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
											<h4 class="text-xs font-semibold text-base-content/90 flex-1 min-w-0">
												{it.headline}
											</h4>
											{#if it.url}<ExternalLink href={it.url} label={it.source ?? 'source'} />{/if}
										</div>
										<p class="text-[11px] text-base-content/65 leading-snug">{it.detail}</p>
										{#if it.relevance}
											<p class="text-[11px] text-primary/80 italic mt-1.5">↳ {it.relevance}</p>
										{/if}
									</li>
								{/each}
							</ul>
						</SectionCard>
					{/each}
				{/if}
			</div>
		</div>

		<footer class="text-[10px] text-base-content/40 text-center py-2">
			Generated {b.meta.generated_at} · timezone {b.meta.timezone ?? '?'}
			{#if dashboard.lastLoaded}
				· loaded {dashboard.lastLoaded.toLocaleTimeString()}
			{/if}
		</footer>
	{:else if !dashboard.error && !dashboard.loading}
		<div class="rounded-xl bg-base-200/40 border border-base-content/5 px-6 py-10 text-center">
			<p class="text-sm text-base-content/60">No daily.json yet — run the briefing skill, then click Refresh.</p>
		</div>
	{:else if dashboard.loading}
		<div class="flex justify-center py-12">
			<span class="loading loading-dots loading-md"></span>
		</div>
	{/if}
</div>

<MemoryDrawer open={memoryOpen} memory={dashboard.memory} onClose={() => (memoryOpen = false)} />
