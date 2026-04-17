<script lang="ts">
	import type { LearningCourse, CourseProgress } from '$lib/types';
	import XpProgressBar from './XpProgressBar.svelte';
	import type { XpRank } from '$lib/types';

	interface Props {
		course: LearningCourse;
		progress: CourseProgress | null;
		xpEarned: number;
		rank: XpRank | null;
		nextRank: XpRank | null;
		firstIncomplete: number;
		isSessionCompleted: (n: number) => boolean;
		sessionXpEarned: (n: number) => number;
		onSessionSelect: (n: number) => void;
	}

	let {
		course,
		progress,
		xpEarned,
		rank,
		nextRank,
		firstIncomplete,
		isSessionCompleted,
		sessionXpEarned,
		onSessionSelect
	}: Props = $props();

	const started = $derived(progress !== null && Object.keys(progress?.sessions_completed ?? {}).length > 0);
</script>

<div class="flex flex-col gap-8">
	<!-- Course header -->
	<div class="flex flex-col gap-4">
		<div class="flex items-start gap-4">
			<span class="text-4xl">{course.emoji}</span>
			<div class="flex flex-col gap-1">
				<h1 class="text-xl font-bold text-base-content">{course.title}</h1>
				{#if course.subtitle}
					<p class="text-sm text-base-content/50">{course.subtitle}</p>
				{/if}
				<p class="text-xs text-base-content/30">{course.time_metadata}</p>
			</div>
		</div>

		<!-- XP + Continue -->
		<div class="flex items-center gap-4">
			<div class="flex-1 max-w-sm">
				<XpProgressBar {xpEarned} totalXp={course.total_xp} {rank} {nextRank} />
			</div>
			<button
				class="btn btn-primary btn-sm"
				onclick={() => onSessionSelect(firstIncomplete)}
			>
				{started ? 'Continue' : 'Start Learning'}
			</button>
		</div>
	</div>

	<!-- Session 0 tile -->
	{#if course.session_zero}
		<div>
			<button
				class="tile-glow w-full text-left rounded-xl bg-info/5 border border-info/15
					hover:border-info/30 hover:bg-info/10 transition-all p-4"
				onclick={() => onSessionSelect(0)}
			>
				<div class="flex items-center gap-3">
					<span class="text-2xl">🎬</span>
					<div>
						<span class="text-sm font-semibold text-base-content">Session 0 — Before We Begin</span>
						<p class="text-xs text-base-content/40 mt-0.5">Prerequisites, context & fun facts</p>
					</div>
				</div>
			</button>
		</div>
	{/if}

	<!-- Phases with session tiles -->
	{#each course.phases as phase}
		{@const phaseSessionsDone = phase.sessions.filter((s) => isSessionCompleted(s.number)).length}
		<div class="flex flex-col gap-3">
			<div class="flex items-center gap-2">
				<span class="text-[10px] font-semibold uppercase tracking-wider text-base-content/30">
					{phase.emoji} Phase {phase.number} — {phase.name}
				</span>
				<span class="flex-1 h-px bg-base-content/5"></span>
				<span class="text-[10px] text-base-content/30">
					{phaseSessionsDone}/{phase.sessions.length}
				</span>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
				{#each phase.sessions as session}
					{@const completed = isSessionCompleted(session.number)}
					{@const xp = sessionXpEarned(session.number)}
					<button
						class="tile-glow text-left rounded-lg p-3 transition-all
							{completed
								? 'bg-success/5 border border-success/15 hover:border-success/30'
								: 'bg-base-200/30 border border-base-content/5 hover:border-base-content/10 hover:bg-base-200/50'}"
						onclick={() => onSessionSelect(session.number)}
					>
						<div class="flex items-start gap-2.5">
							{#if completed}
								<span class="text-success text-sm mt-0.5">✓</span>
							{:else}
								<span class="text-base-content/20 text-sm font-mono mt-0.5">{session.number}</span>
							{/if}
							<div class="flex-1 min-w-0">
								<div class="text-sm font-medium text-base-content truncate {completed ? 'opacity-70' : ''}">
									{session.title}
								</div>
								{#if session.goal}
									<p class="text-xs text-base-content/40 mt-0.5 line-clamp-2">{session.goal}</p>
								{/if}
								<div class="flex items-center gap-2 mt-1.5">
									{#if session.time}
										<span class="text-[10px] text-base-content/30">⏱ {session.time.replace(/\*\*/g, '').split('|')[0].trim()}</span>
									{/if}
									{#if session.xp_available}
										<span class="bg-warning/15 text-warning text-[9px] font-bold px-1 py-0.5 rounded-full">
											{#if xp > 0}{xp}/{/if}{session.xp_available.total} XP
										</span>
									{/if}
								</div>
							</div>
						</div>
					</button>
				{/each}
			</div>
		</div>
	{/each}

	<!-- Appendix tile -->
	{#if course.appendix_markdown}
		<div>
			<button
				class="tile-glow w-full text-left rounded-xl bg-base-200/20 border border-base-content/5
					hover:border-base-content/10 hover:bg-base-200/40 transition-all p-4"
				onclick={() => onSessionSelect(-1)}
			>
				<div class="flex items-center gap-3">
					<span class="text-2xl">📚</span>
					<div>
						<span class="text-sm font-semibold text-base-content">Appendix</span>
						<p class="text-xs text-base-content/40 mt-0.5">Cheat sheet, resources & communities</p>
					</div>
				</div>
			</button>
		</div>
	{/if}
</div>
