<script lang="ts">
	import type { DailyBriefing } from '$lib/types';
	import { fmtClock, fmtMinutesAway, liveMinutesAway, staleness } from '$lib/dashboard/format';

	interface Props {
		briefing: DailyBriefing | null;
		now: Date;
		onPalette: () => void;
		onMemory: () => void;
	}

	let { briefing, now, onPalette, onMemory }: Props = $props();

	let menuOpen = $state(false);
</script>

<header class="md:shrink-0 flex items-center gap-3 py-3 border-b border-base-content/5">
	<a href="/" class="btn btn-ghost btn-sm text-xs">← Back</a>
	<div class="flex-1 min-w-0">
		<h1 class="text-base font-semibold text-base-content leading-tight">Dashboard</h1>
		{#if briefing}
			<p class="text-xs text-base-content/50 font-mono">
				{briefing.meta.briefing_date} · {fmtClock(now)}
			</p>
		{/if}
	</div>

	{#if briefing}
		{@const b = briefing}
		{@const stale = staleness(b.meta.generated_at, now.getTime())}
		{@const updateAgeMins = b.meta.generated_at
			? Math.max(0, Math.round((now.getTime() - Date.parse(b.meta.generated_at)) / 60000))
			: null}
		{@const updateStale = updateAgeMins !== null && updateAgeMins >= 120}
		{@const nextMins = liveMinutesAway(b.meta.next_meeting?.starts_at, now.getTime())}

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
			class="hidden sm:inline text-xs font-mono {updateStale
				? 'text-warning font-semibold'
				: 'text-base-content/50'}"
			title="Briefing generated at {fmtClock(b.meta.generated_at)} ({b.meta.run_type ?? '?'} run)"
		>
			updated {fmtClock(b.meta.generated_at)}
		</span>

		<span
			class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium font-mono"
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
		class="btn btn-ghost btn-sm text-xs gap-1.5 hidden sm:inline-flex"
		onclick={onPalette}
		title="Search today (⌘K)"
	>
		🔎
		<kbd class="text-xs font-mono px-1 py-0.5 bg-base-300/50 rounded border border-base-content/10">⌘K</kbd>
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
					onclick={() => {
						menuOpen = false;
						onMemory();
					}}
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
