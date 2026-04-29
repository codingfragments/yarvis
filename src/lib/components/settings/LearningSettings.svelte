<script lang="ts">
	import { onMount } from 'svelte';
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import { getLearningStore } from '$lib/stores/learning.svelte';
	import SettingsSection from './SettingsSection.svelte';
	import SettingsTextField from './SettingsTextField.svelte';

	interface Props {
		onMessage?: (msg: string) => void;
	}

	let { onMessage }: Props = $props();

	const settings = getSettingsStore();
	const learning = getLearningStore();

	let resetConfirm = $state<string | null>(null);

	onMount(async () => {
		await learning.loadCourses(settings.current.learning_dir);
	});

	function courseXp(courseId: string): number {
		const cp = learning.progress.courses[courseId];
		if (!cp) return 0;
		return Object.values(cp.sessions_completed).reduce((sum, sp) => sum + sp.xp_earned, 0);
	}

	async function confirmReset() {
		if (!resetConfirm) return;
		if (resetConfirm === 'all') {
			await learning.resetAll();
			onMessage?.('All learning progress reset!');
		} else {
			await learning.resetCourse(resetConfirm);
			onMessage?.('Progress reset for course!');
		}
		resetConfirm = null;
	}
</script>

<SettingsSection title="Learning">
	<SettingsTextField
		label="Learning Courses Directory"
		value={settings.current.learning_dir}
		onChange={(v) => settings.update({ learning_dir: v })}
	>
		{#snippet hint()}
			Directory containing *-curriculum.md files
		{/snippet}
	</SettingsTextField>

	{#if learning.courses.length > 0}
		<div class="flex flex-col gap-1.5">
			<span class="text-xs text-base-content/40">Course Progress</span>
			<div class="flex flex-col gap-1.5 max-h-[12.5rem] overflow-y-auto">
				{#each learning.courses as course}
					{@const xp = courseXp(course.id)}
					{@const hasProgress = xp > 0 || learning.progress.courses[course.id]}
					<div class="flex items-center gap-2 bg-base-300/30 rounded-lg px-3 py-2">
						<span class="text-sm">{course.emoji}</span>
						<span class="flex-1 text-sm text-base-content/70 truncate">{course.title}</span>
						{#if hasProgress}
							<span class="text-[10px] font-mono text-base-content/40">{xp} / {course.total_xp} XP</span>
							<button
								class="text-[10px] text-warning/60 hover:text-warning transition-colors"
								onclick={() => (resetConfirm = course.id)}
							>Reset</button>
						{:else}
							<span class="text-[10px] text-base-content/20">Not started</span>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{:else if !learning.loading}
		<div class="text-xs text-base-content/30">No courses found in configured directory</div>
	{/if}

	<button
		class="btn btn-ghost btn-sm text-xs text-warning w-fit"
		onclick={() => (resetConfirm = 'all')}
	>
		Reset All XP
	</button>
</SettingsSection>

{#if resetConfirm}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
		<div class="bg-base-100 rounded-xl border border-base-content/10 p-6 max-w-sm w-full mx-4 shadow-xl">
			<h3 class="text-sm font-semibold text-base-content mb-2">Reset Progress?</h3>
			<p class="text-xs text-base-content/60 mb-4">
				{#if resetConfirm === 'all'}
					This will reset all XP and progress for every course. This cannot be undone.
				{:else}
					This will reset all XP and progress for this course. This cannot be undone.
				{/if}
			</p>
			<div class="flex justify-end gap-2">
				<button class="btn btn-ghost btn-sm text-xs" onclick={() => (resetConfirm = null)}>Cancel</button>
				<button class="btn btn-warning btn-sm text-xs" onclick={confirmReset}>Reset</button>
			</div>
		</div>
	</div>
{/if}
