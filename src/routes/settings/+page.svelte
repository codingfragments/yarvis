<script lang="ts">
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import { getSystemStore } from '$lib/stores/system.svelte';
	import { getLearningStore } from '$lib/stores/learning.svelte';
	import { onMount } from 'svelte';
	import SettingsSection from '$lib/components/settings/SettingsSection.svelte';
	import SettingsTextField from '$lib/components/settings/SettingsTextField.svelte';
	import SettingsToggleField from '$lib/components/settings/SettingsToggleField.svelte';
	import SettingsRangeField from '$lib/components/settings/SettingsRangeField.svelte';

	const settings = getSettingsStore();
	const system = getSystemStore();
	const learning = getLearningStore();

	const accentColors = [
		{ name: 'mauve', hex: '#c6a0f6' },
		{ name: 'pink', hex: '#f5bde6' },
		{ name: 'red', hex: '#ed8796' },
		{ name: 'peach', hex: '#f5a97f' },
		{ name: 'yellow', hex: '#eed49f' },
		{ name: 'green', hex: '#a6da95' },
		{ name: 'teal', hex: '#8bd5ca' },
		{ name: 'blue', hex: '#8aadf4' },
		{ name: 'lavender', hex: '#b7bdf8' }
	];

	let saveMessage = $state('');

	async function handleSave() {
		await settings.save();
		if (!settings.error) {
			saveMessage = 'Settings saved!';
			setTimeout(() => (saveMessage = ''), 2000);
		}
	}

	async function handleReset() {
		await settings.reset();
		saveMessage = 'Settings reset to defaults!';
		setTimeout(() => (saveMessage = ''), 2000);
	}

	let resetConfirm = $state<string | null>(null); // null = hidden, 'all' or courseId

	onMount(async () => {
		system.load(settings.current.python_path);
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
			saveMessage = 'All learning progress reset!';
		} else {
			await learning.resetCourse(resetConfirm);
			saveMessage = `Progress reset for course!`;
		}
		resetConfirm = null;
		setTimeout(() => (saveMessage = ''), 2000);
	}
</script>

<div class="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
	<!-- Header -->
	<div class="flex items-center gap-3">
		<a href="/" class="btn btn-ghost btn-sm text-xs">← Back</a>
		<h1 class="text-lg font-semibold text-base-content">Settings</h1>
	</div>

	<SettingsSection title="Appearance">
		<div class="form-control">
			<label class="label" for="theme-select">
				<span class="label-text">Theme</span>
			</label>
			<select
				id="theme-select"
				class="select select-bordered w-full max-w-xs select-sm"
				value={settings.current.theme}
				onchange={(e) => settings.update({ theme: e.currentTarget.value as 'dark' | 'light' | 'auto' })}
			>
				<option value="dark">Dark (Macchiato)</option>
				<option value="light">Light (Latte)</option>
				<option value="auto">Auto (System)</option>
			</select>
		</div>

		<div class="form-control">
			<span class="label">
				<span class="label-text">Accent Color</span>
			</span>
			<div class="flex flex-wrap gap-2">
				{#each accentColors as color}
					<button
						class="w-7 h-7 rounded-full border-2 transition-all hover:scale-110
							{settings.current.accent_color === color.name ? 'border-base-content scale-110 ring-2 ring-base-content/20' : 'border-transparent'}"
						style="background-color: {color.hex}"
						title={color.name}
						onclick={() => settings.update({ accent_color: color.name })}
					></button>
				{/each}
			</div>
		</div>

		<SettingsToggleField
			label="Retro pixel font accents"
			checked={settings.current.pixel_font_headings}
			onChange={(v) => settings.update({ pixel_font_headings: v })}
		/>

		<SettingsRangeField
			label="Window Opacity"
			display={`${Math.round(settings.current.window_opacity * 100)}%`}
			value={settings.current.window_opacity}
			min={0.5}
			max={1}
			step={0.05}
			onChange={(v) => settings.update({ window_opacity: v })}
		/>
	</SettingsSection>

	<SettingsSection title="System">
		<SettingsTextField
			label="Python Path"
			value={settings.current.python_path}
			onChange={(v) => settings.update({ python_path: v })}
		/>

		<SettingsToggleField
			label="Launch at startup"
			checked={settings.current.launch_at_startup}
			onChange={(v) => settings.update({ launch_at_startup: v })}
		/>

		<div class="form-control">
			<span class="label">
				<span class="label-text">Data Directory</span>
			</span>
			<div class="bg-base-300/40 rounded-lg px-3 py-2 font-mono text-sm text-base-content/60">
				{settings.current.data_directory}
			</div>
		</div>
	</SettingsSection>

	<SettingsSection title="Dashboard">
		<SettingsTextField
			label="Daily Briefing Directory"
			value={settings.current.daily_dir}
			onChange={(v) => settings.update({ daily_dir: v })}
		>
			{#snippet hint()}
				Folder containing <code>daily.json</code>, <code>question.md</code>, <code>memory.md</code>
			{/snippet}
		</SettingsTextField>

		<SettingsTextField
			label="Briefing Config Directory"
			value={settings.current.daily_src_dir}
			onChange={(v) => settings.update({ daily_src_dir: v })}
		>
			{#snippet hint()}
				Folder containing <code>briefing_config.yaml</code> (intelligence categories, deal colours)
			{/snippet}
		</SettingsTextField>
	</SettingsSection>

	<SettingsSection title="Auto-refresh">
		<SettingsToggleField
			label="Refresh data automatically"
			checked={settings.current.auto_refresh_enabled}
			onChange={(v) => settings.update({ auto_refresh_enabled: v })}
		>
			{#snippet hint()}
				Pulls new and updated data without changing the page or losing focus.
			{/snippet}
		</SettingsToggleField>

		<SettingsRangeField
			label="Refresh every"
			display={`${settings.current.auto_refresh_interval_minutes} min`}
			value={settings.current.auto_refresh_interval_minutes}
			min={1}
			max={60}
			disabled={!settings.current.auto_refresh_enabled}
			onChange={(v) => settings.update({ auto_refresh_interval_minutes: v })}
		/>
	</SettingsSection>

	<SettingsSection title="Briefings">
		<SettingsTextField
			label="Briefings Directory"
			value={settings.current.briefings_dir}
			onChange={(v) => settings.update({ briefings_dir: v })}
		/>

		<SettingsRangeField
			label="Max Days to Show"
			display={`${settings.current.briefings_max_days} days`}
			value={settings.current.briefings_max_days}
			min={1}
			max={30}
			onChange={(v) => settings.update({ briefings_max_days: v })}
		/>
	</SettingsSection>

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

		<!-- Course progress list -->
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

	<!-- Reset confirmation dialog -->
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

	<SettingsSection title="System Status">
		{#snippet actions()}
			<button
				class="btn btn-ghost btn-xs text-[11px]"
				onclick={() => system.load(settings.current.python_path)}
				disabled={system.current.loading}
			>
				{system.current.loading ? '...' : 'Refresh'}
			</button>
		{/snippet}

		{#if system.current.loading}
			<div class="flex justify-center py-4">
				<span class="loading loading-dots loading-sm"></span>
			</div>
		{:else if system.current.error}
			<div class="rounded-lg bg-warning/10 text-warning px-3 py-2 text-xs">
				{system.current.error}
			</div>
		{:else}
			<div class="grid grid-cols-2 gap-2.5">
				{#if system.current.info}
					<div class="bg-base-300/40 rounded-lg px-3 py-2.5">
						<div class="text-[10px] text-base-content/40 mb-0.5">App Version</div>
						<div class="text-sm font-mono">v{system.current.info.app_version}</div>
					</div>
					<div class="bg-base-300/40 rounded-lg px-3 py-2.5">
						<div class="text-[10px] text-base-content/40 mb-0.5">OS / Arch</div>
						<div class="text-sm font-mono">{system.current.info.os} / {system.current.info.arch}</div>
					</div>
					<div class="bg-base-300/40 rounded-lg px-3 py-2.5">
						<div class="text-[10px] text-base-content/40 mb-0.5">Rust</div>
						<div class="text-xs font-mono">{system.current.info.rust_version}</div>
					</div>
				{/if}
				<div class="bg-base-300/40 rounded-lg px-3 py-2.5">
					<div class="text-[10px] text-base-content/40 mb-0.5">Python</div>
					<div class="text-sm font-mono">{system.current.pythonVersion || '—'}</div>
				</div>
				<div class="bg-base-300/40 rounded-lg px-3 py-2.5">
					<div class="text-[10px] text-base-content/40 mb-0.5">SQLite</div>
					<div class="text-sm font-mono">{system.current.sqliteVersion || '—'}</div>
				</div>
				<div class="bg-base-300/40 rounded-lg px-3 py-2.5">
					<div class="text-[10px] text-base-content/40 mb-0.5">Data Size</div>
					<div class="text-sm font-mono">{system.current.dataDirSize || '—'}</div>
				</div>
			</div>
		{/if}
	</SettingsSection>

	<!-- Action buttons -->
	<div class="flex items-center gap-3">
		<button
			class="btn btn-primary btn-sm"
			onclick={handleSave}
			disabled={settings.saving}
		>
			{settings.saving ? 'Saving...' : 'Save'}
		</button>
		<button class="btn btn-ghost btn-sm" onclick={handleReset}>
			Reset
		</button>
		{#if saveMessage}
			<span class="text-success text-xs animate-pulse">{saveMessage}</span>
		{/if}
		{#if settings.error}
			<span class="text-error text-xs">{settings.error}</span>
		{/if}
	</div>
</div>
