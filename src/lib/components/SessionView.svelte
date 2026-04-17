<script lang="ts">
	import type { LearningSession } from '$lib/types';
	import MarkdownRenderer from './MarkdownRenderer.svelte';
	import SessionTimer from './SessionTimer.svelte';
	import XpPopup from './XpPopup.svelte';

	interface Props {
		session: LearningSession;
		isExerciseCompleted: (index: number) => boolean;
		isBossCompleted: boolean;
		onToggleExercise: (index: number, xp: number) => Promise<number | undefined>;
		onToggleBoss: (xp: number) => Promise<number | undefined>;
	}

	let { session, isExerciseCompleted, isBossCompleted, onToggleExercise, onToggleBoss }: Props =
		$props();

	let xpPopups = $state<Record<string, { xp: number; visible: boolean }>>({});

	async function handleExerciseToggle(index: number, xp: number) {
		const delta = await onToggleExercise(index, xp);
		if (delta && delta > 0) showXpPopup(`ex-${index}`, delta);
	}

	async function handleBossToggle(xp: number) {
		const delta = await onToggleBoss(xp);
		if (delta && delta > 0) showXpPopup('boss', delta);
	}

	function showXpPopup(key: string, xp: number) {
		xpPopups = { ...xpPopups, [key]: { xp, visible: true } };
		setTimeout(() => {
			xpPopups = { ...xpPopups, [key]: { xp, visible: false } };
		}, 800);
	}
</script>

<div class="flex flex-col gap-6">
	<!-- Session header -->
	<div class="flex flex-col gap-2">
		<div class="flex items-center gap-3 flex-wrap">
			<h1 class="text-lg font-bold text-base-content">
				Session {session.number}: {session.title}
			</h1>
			{#if session.xp_available}
				<span class="bg-warning/15 text-warning text-[11px] font-bold px-2 py-0.5 rounded-full">
					{session.xp_available.total} XP
				</span>
			{/if}
		</div>

		{#if session.goal}
			<p class="text-sm text-base-content/60">{session.goal}</p>
		{/if}

		<div class="flex items-center gap-3 flex-wrap">
			{#if session.time}
				<SessionTimer timeString={session.time} />
			{/if}
			{#if session.level}
				<span class="text-xs text-base-content/40">{session.level}</span>
			{/if}
			{#if session.prerequisites}
				<span class="text-xs text-base-content/30">Prereq: {session.prerequisites}</span>
			{/if}
		</div>
	</div>

	<!-- Concept & Theory -->
	{#if session.theory_markdown}
		<section>
			<div class="section-header">
				<span>Concept & Theory</span>
				<span class="flex-1 h-px bg-base-content/5"></span>
			</div>
			<div class="mt-3">
				<MarkdownRenderer markdown={session.theory_markdown} />
			</div>
		</section>
	{/if}

	<!-- Warm-up Drill -->
	{#if session.warmup_markdown}
		<section>
			<div class="section-header">
				<span>🔥 Warm-up Drill</span>
				<span class="flex-1 h-px bg-base-content/5"></span>
			</div>
			<div class="mt-3 rounded-lg bg-base-200/30 border border-base-content/5 p-4">
				<MarkdownRenderer markdown={session.warmup_markdown} />
			</div>
		</section>
	{/if}

	<!-- Exercises -->
	{#if session.exercises.length > 0}
		<section>
			<div class="section-header">
				<span>💪 Exercises</span>
				<span class="flex-1 h-px bg-base-content/5"></span>
			</div>
			<div class="mt-3 flex flex-col gap-3">
				{#each session.exercises as exercise}
					{@const completed = isExerciseCompleted(exercise.index)}
					<div class="rounded-lg border border-base-content/5 p-4 transition-all
						{completed ? 'bg-success/5 border-success/15' : 'bg-base-200/20'}">
						<div class="flex items-start gap-3">
							<div class="relative">
								<input
									type="checkbox"
									class="checkbox checkbox-primary checkbox-sm mt-0.5"
									checked={completed}
									onchange={() => handleExerciseToggle(exercise.index, exercise.xp)}
								/>
								{#if xpPopups[`ex-${exercise.index}`]?.visible}
									<XpPopup xp={xpPopups[`ex-${exercise.index}`].xp} visible={true} />
								{/if}
							</div>
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 mb-1">
									<span class="text-sm font-semibold text-base-content {completed ? 'line-through opacity-60' : ''}">
										{exercise.title}
									</span>
									<span class="bg-warning/15 text-warning text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
										{exercise.xp} XP
									</span>
								</div>
								{#if exercise.description_markdown}
									<div class="text-sm {completed ? 'opacity-50' : ''}">
										<MarkdownRenderer markdown={exercise.description_markdown} />
									</div>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Boss Challenge -->
	{#if session.boss_challenge}
		{@const boss = session.boss_challenge}
		<section>
			<div class="section-header">
				<span>🏆 Boss Challenge</span>
				<span class="flex-1 h-px bg-base-content/5"></span>
				<span class="bg-warning/15 text-warning text-[9px] font-bold px-1.5 py-0.5 rounded-full">
					{boss.xp} XP
				</span>
			</div>
			<div class="mt-3 rounded-lg border-2 border-warning/20 bg-warning/5 p-4 relative">
				<div class="flex items-start gap-3">
					<div class="relative">
						<input
							type="checkbox"
							class="checkbox checkbox-warning checkbox-sm mt-0.5"
							checked={isBossCompleted}
							onchange={() => handleBossToggle(boss.xp)}
						/>
						{#if xpPopups['boss']?.visible}
							<XpPopup xp={xpPopups['boss'].xp} visible={true} />
						{/if}
					</div>
					<div class="flex-1 min-w-0 {isBossCompleted ? 'opacity-50' : ''}">
						<MarkdownRenderer markdown={boss.description_markdown} />
					</div>
				</div>
			</div>
		</section>
	{/if}

	<!-- Summary -->
	{#if session.summary_points.length > 0}
		<section>
			<div class="section-header">
				<span>📌 If You Remember Only 3 Things</span>
				<span class="flex-1 h-px bg-base-content/5"></span>
			</div>
			<div class="mt-3 rounded-lg bg-primary/5 border border-primary/10 p-4">
				<ol class="list-decimal list-inside flex flex-col gap-2">
					{#each session.summary_points as point}
						<li class="text-sm text-base-content/80">
							{@html point.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}
						</li>
					{/each}
				</ol>
			</div>
		</section>
	{/if}

	<!-- Resources -->
	{#if session.resources_markdown}
		<section>
			<div class="section-header">
				<span>📚 Resources</span>
				<span class="flex-1 h-px bg-base-content/5"></span>
			</div>
			<div class="mt-3">
				<MarkdownRenderer markdown={session.resources_markdown} />
			</div>
		</section>
	{/if}
</div>

<style>
	.section-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: oklch(var(--bc) / 0.3);
	}
</style>
