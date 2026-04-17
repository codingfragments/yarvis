<script lang="ts">
	import { onMount } from 'svelte';
	import { getLearningStore } from '$lib/stores/learning.svelte';
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import CourseCard from '$lib/components/CourseCard.svelte';

	const store = getLearningStore();
	const settings = getSettingsStore();

	onMount(async () => {
		if (!settings.loaded) await settings.load();
		await store.loadCourses(settings.current.learning_dir);
	});

	function getCourseProgress(courseId: string) {
		return store.progress.courses[courseId] ?? null;
	}

	function getCourseXp(courseId: string) {
		const cp = store.progress.courses[courseId];
		if (!cp) return 0;
		return Object.values(cp.sessions_completed).reduce((sum, sp) => sum + sp.xp_earned, 0);
	}
</script>

<div class="flex flex-col gap-6 max-w-3xl mx-auto px-4 py-6">
	<div class="flex items-center gap-3">
		<a href="/" class="text-xs text-base-content/40 hover:text-base-content/70 transition-colors">← Back</a>
		<h1 class="text-lg font-semibold text-base-content">Learning</h1>
	</div>

	{#if store.loading}
		<div class="flex items-center justify-center py-20">
			<span class="loading loading-dots loading-md text-primary"></span>
		</div>
	{:else if store.error}
		<div class="rounded-xl bg-error/10 border border-error/20 p-4 text-sm text-error">
			{store.error}
		</div>
	{:else if store.courses.length === 0}
		<div class="flex flex-col items-center gap-3 py-20 text-base-content/40">
			<span class="text-4xl">📚</span>
			<p class="text-sm">No courses found</p>
			<p class="text-xs">Add <code>*-curriculum.md</code> files to <code>{settings.current.learning_dir}</code></p>
		</div>
	{:else}
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
			{#each store.courses as course (course.id)}
				<CourseCard
					{course}
					progress={getCourseProgress(course.id)}
					totalXpEarned={getCourseXp(course.id)}
				/>
			{/each}
		</div>
	{/if}
</div>
