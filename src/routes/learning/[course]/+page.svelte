<script lang="ts">
	import { onMount } from 'svelte';
	import { getLearningStore } from '$lib/stores/learning.svelte';
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import LearningSidebar from '$lib/components/LearningSidebar.svelte';
	import SessionView from '$lib/components/SessionView.svelte';
	import SessionZeroView from '$lib/components/SessionZeroView.svelte';
	import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte';

	interface Props {
		data: { courseId: string };
	}

	let { data }: Props = $props();

	const store = getLearningStore();
	const settings = getSettingsStore();

	let mainContent = $state<HTMLDivElement>();

	onMount(async () => {
		if (!settings.loaded) await settings.load();
		const filename = data.courseId + '.md';
		await store.selectCourse(settings.current.learning_dir, filename);
	});

	function handleSessionSelect(n: number) {
		store.selectSession(n);
		if (mainContent) mainContent.scrollTop = 0;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
		if (!store.currentCourse) return;

		const sessions = store.allSessions;
		const currentIdx = sessions.findIndex((s) =>
			store.currentSessionNumber === -1 ? false : s.number === store.currentSessionNumber
		);

		if (e.key === 'ArrowUp' && currentIdx > 0) {
			e.preventDefault();
			handleSessionSelect(sessions[currentIdx - 1].number);
		} else if (e.key === 'ArrowDown' && currentIdx < sessions.length - 1) {
			e.preventDefault();
			handleSessionSelect(sessions[currentIdx + 1].number);
		}
	}

	async function handleResetCourse() {
		if (!store.currentCourse) return;
		if (!confirm(`Reset all progress for "${store.currentCourse.title}"?`)) return;
		await store.resetCourse(store.currentCourse.id);
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if store.loading && !store.currentCourse}
	<div class="flex items-center justify-center h-full">
		<span class="loading loading-dots loading-md text-primary"></span>
	</div>
{:else if store.error}
	<div class="flex flex-col items-center gap-4 p-8">
		<div class="rounded-xl bg-error/10 border border-error/20 p-4 text-sm text-error max-w-lg">
			{store.error}
		</div>
		<a href="/learning" class="text-xs text-base-content/40 hover:text-base-content/70">← Back to courses</a>
	</div>
{:else if store.currentCourse}
	<div class="flex h-[calc(100vh-3.5rem-2.5rem)] overflow-hidden">
		<LearningSidebar
			course={store.currentCourse}
			currentSessionNumber={store.currentSessionNumber}
			xpEarned={store.totalXpEarned}
			rank={store.currentRank}
			nextRank={store.nextRank}
			isSessionCompleted={store.isSessionCompleted.bind(store)}
			sessionXpEarned={store.sessionXpEarned.bind(store)}
			onSessionSelect={handleSessionSelect}
			onResetCourse={handleResetCourse}
		/>

		<div class="flex-1 overflow-y-auto" bind:this={mainContent}>
			<div class="max-w-3xl mx-auto px-6 py-6">
				{#if store.currentSessionNumber === -1 && store.currentCourse.appendix_markdown}
					<!-- Appendix -->
					<div class="flex flex-col gap-4">
						<h1 class="text-lg font-bold text-base-content">📚 Appendix</h1>
						<MarkdownRenderer markdown={store.currentCourse.appendix_markdown} />
					</div>
				{:else if store.currentSession}
					{#if store.currentSession.is_session_zero}
						<SessionZeroView session={store.currentSession} />
					{:else}
						{#key store.currentSessionNumber}
							<SessionView
								session={store.currentSession}
								isExerciseCompleted={(idx) => store.isExerciseCompleted(store.currentSessionNumber, idx)}
								isBossCompleted={store.isBossCompleted(store.currentSessionNumber)}
								onToggleExercise={(idx, xp) => store.toggleExercise(store.currentSessionNumber, idx, xp)}
								onToggleBoss={(xp) => store.toggleBoss(store.currentSessionNumber, xp)}
							/>
						{/key}

						<!-- Session complete toggle -->
						<div class="mt-8 pt-6 border-t border-base-content/5">
							<label class="flex items-center gap-3 cursor-pointer">
								<input
									type="checkbox"
									class="checkbox checkbox-success checkbox-sm"
									checked={store.isSessionCompleted(store.currentSessionNumber)}
									onchange={() => store.markSessionComplete(store.currentSessionNumber)}
								/>
								<span class="text-sm text-base-content/60">Mark session as complete</span>
							</label>
						</div>
					{/if}
				{:else}
					<div class="text-center text-base-content/30 py-20">Select a session from the sidebar</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
