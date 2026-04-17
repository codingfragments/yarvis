<script lang="ts">
	import type { CourseSummary, CourseProgress, XpRank } from '$lib/types';

	interface Props {
		course: CourseSummary;
		progress?: CourseProgress | null;
		rank?: XpRank | null;
		totalXpEarned?: number;
	}

	let { course, progress = null, rank = null, totalXpEarned = 0 }: Props = $props();

	const sessionsCompleted = $derived(
		progress ? Object.values(progress.sessions_completed).filter((s) => s.completed).length : 0
	);
	const progressPercent = $derived(
		course.session_count > 0 ? Math.round((sessionsCompleted / course.session_count) * 100) : 0
	);
	const started = $derived(progress !== null && progress !== undefined && sessionsCompleted > 0);
</script>

<a
	href="/learning/{course.id}"
	class="tile-glow group flex flex-col gap-3
		rounded-xl bg-base-200/50 p-5 no-underline
		border border-base-content/5 hover:border-base-content/10
		hover:bg-base-200/80 transition-all"
>
	<div class="flex items-start gap-3">
		<span class="text-3xl shrink-0">{course.emoji}</span>
		<div class="flex flex-col gap-0.5 min-w-0">
			<span class="text-sm font-semibold text-base-content truncate">{course.title}</span>
			{#if course.subtitle}
				<span class="text-xs text-base-content/50 truncate">{course.subtitle}</span>
			{/if}
		</div>
	</div>

	<div class="flex items-center gap-2 text-[11px] text-base-content/40">
		<span>{course.session_count} Sessions</span>
		<span>·</span>
		<span>{course.total_xp} XP</span>
	</div>

	{#if started}
		<div class="flex flex-col gap-1.5">
			<div class="w-full bg-base-300/50 rounded-full h-1.5 overflow-hidden">
				<div
					class="h-full rounded-full bg-primary transition-all duration-500"
					style="width: {progressPercent}%"
				></div>
			</div>
			<div class="flex items-center justify-between text-[10px]">
				<span class="text-base-content/40">{progressPercent}% · {sessionsCompleted}/{course.session_count}</span>
				{#if rank}
					<span class="text-base-content/60">{rank.emoji} {rank.name}</span>
				{/if}
			</div>
		</div>
	{:else}
		<span class="text-[10px] text-base-content/30">Not started</span>
	{/if}
</a>
