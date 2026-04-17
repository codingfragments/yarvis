<script lang="ts">
	import type { LearningCourse, XpRank } from '$lib/types';
	import XpProgressBar from './XpProgressBar.svelte';

	interface Props {
		course: LearningCourse;
		currentSessionNumber: number;
		xpEarned: number;
		rank: XpRank | null;
		nextRank: XpRank | null;
		isSessionCompleted: (n: number) => boolean;
		sessionXpEarned: (n: number) => number;
		onSessionSelect: (n: number) => void;
		onResetCourse: () => void;
	}

	let {
		course,
		currentSessionNumber,
		xpEarned,
		rank,
		nextRank,
		isSessionCompleted,
		sessionXpEarned,
		onSessionSelect,
		onResetCourse
	}: Props = $props();

	let collapsedPhases = $state<Set<number>>(new Set());

	function togglePhase(n: number) {
		const next = new Set(collapsedPhases);
		if (next.has(n)) next.delete(n);
		else next.add(n);
		collapsedPhases = next;
	}
</script>

<aside class="w-64 flex-shrink-0 bg-base-200/30 border-r border-base-content/5 flex flex-col h-full overflow-hidden">
	<!-- Header -->
	<div class="p-3 border-b border-base-content/5 flex-shrink-0">
		<div class="flex items-center gap-2 mb-2">
			<a href="/learning" class="text-xs text-base-content/40 hover:text-base-content/70 transition-colors">← Courses</a>
		</div>
		<div class="flex items-center gap-2 mb-3">
			<span class="text-xl">{course.emoji}</span>
			<span class="text-sm font-semibold text-base-content truncate">{course.title}</span>
		</div>
		<XpProgressBar
			{xpEarned}
			totalXp={course.total_xp}
			{rank}
			{nextRank}
		/>
	</div>

	<!-- Session navigation -->
	<div class="flex-1 overflow-y-auto px-2 py-2">
		<!-- Session 0 -->
		{#if course.session_zero}
			<button
				class="flex items-center gap-2 w-full px-2.5 py-2 rounded-md text-left text-sm transition-all mb-1
					{currentSessionNumber === 0
						? 'bg-primary/10 text-primary font-semibold shadow-[inset_3px_0_0] shadow-primary'
						: 'text-base-content/60 hover:bg-base-content/5 hover:text-base-content'}"
				onclick={() => onSessionSelect(0)}
			>
				<span class="flex-shrink-0 text-sm">🎬</span>
				<span class="flex-1 truncate">Before We Begin</span>
			</button>
			<div class="h-px bg-base-content/5 mx-1 my-1.5"></div>
		{/if}

		<!-- Phases -->
		{#each course.phases as phase}
			<button
				class="flex items-center gap-1.5 w-full px-2 py-1.5 text-left group"
				onclick={() => togglePhase(phase.number)}
			>
				<span class="text-[10px] text-base-content/30 transition-transform {collapsedPhases.has(phase.number) ? '' : 'rotate-90'}">▶</span>
				<span class="text-[10px] font-semibold uppercase tracking-wider text-base-content/30 truncate">
					{phase.emoji} Phase {phase.number} — {phase.name}
				</span>
			</button>

			{#if !collapsedPhases.has(phase.number)}
				{#each phase.sessions as session}
					{@const completed = isSessionCompleted(session.number)}
					{@const xp = sessionXpEarned(session.number)}
					<button
						class="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-left text-sm transition-all mb-0.5 ml-1
							{currentSessionNumber === session.number
								? 'bg-primary/10 text-primary font-semibold shadow-[inset_3px_0_0] shadow-primary'
								: 'text-base-content/60 hover:bg-base-content/5 hover:text-base-content'}"
						onclick={() => onSessionSelect(session.number)}
					>
						{#if completed}
							<span class="flex-shrink-0 text-xs text-success">✓</span>
						{:else}
							<span class="flex-shrink-0 text-xs text-base-content/20">{session.number}</span>
						{/if}
						<span class="flex-1 truncate text-xs">{session.title}</span>
						{#if session.xp_available && xp > 0}
							<span class="flex-shrink-0 bg-warning/15 text-warning text-[9px] font-bold px-1 py-0.5 rounded-full font-mono">
								{xp}
							</span>
						{/if}
					</button>
				{/each}
			{/if}
		{/each}

		<!-- Appendix -->
		{#if course.appendix_markdown}
			<div class="h-px bg-base-content/5 mx-1 my-1.5"></div>
			<button
				class="flex items-center gap-2 w-full px-2.5 py-2 rounded-md text-left text-sm transition-all
					{currentSessionNumber === -1
						? 'bg-primary/10 text-primary font-semibold shadow-[inset_3px_0_0] shadow-primary'
						: 'text-base-content/60 hover:bg-base-content/5 hover:text-base-content'}"
				onclick={() => onSessionSelect(-1)}
			>
				<span class="flex-shrink-0 text-sm">📚</span>
				<span class="flex-1 truncate">Appendix</span>
			</button>
		{/if}
	</div>

	<!-- Footer -->
	<div class="p-3 border-t border-base-content/5 flex-shrink-0">
		<button
			class="text-[10px] text-base-content/30 hover:text-warning transition-colors"
			onclick={onResetCourse}
		>
			Reset progress
		</button>
	</div>
</aside>
