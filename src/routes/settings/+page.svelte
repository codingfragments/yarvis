<script lang="ts">
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import { getSystemStore } from '$lib/stores/system.svelte';
	import { onMount } from 'svelte';

	const settings = getSettingsStore();
	const system = getSystemStore();

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

	onMount(() => {
		system.load(settings.current.python_path);
	});
</script>

<div class="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
	<!-- Header -->
	<div class="flex items-center gap-3">
		<a href="/" class="btn btn-ghost btn-sm text-xs">← Back</a>
		<h1 class="text-lg font-semibold text-base-content">Settings</h1>
	</div>

	<!-- Appearance -->
	<section class="rounded-xl bg-base-200/40 border border-base-content/5 p-5 flex flex-col gap-4">
		<h2 class="text-xs font-semibold uppercase tracking-wider text-base-content/50">Appearance</h2>

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

		<div class="form-control">
			<label class="label cursor-pointer justify-start gap-3">
				<input
					type="checkbox"
					class="toggle toggle-primary toggle-sm"
					checked={settings.current.pixel_font_headings}
					onchange={(e) => settings.update({ pixel_font_headings: e.currentTarget.checked })}
				/>
				<span class="label-text">Retro pixel font accents</span>
			</label>
		</div>

		<div class="form-control">
			<label class="label" for="opacity-slider">
				<span class="label-text">Window Opacity</span>
				<span class="label-text-alt text-base-content/40">{Math.round(settings.current.window_opacity * 100)}%</span>
			</label>
			<input
				id="opacity-slider"
				type="range"
				min="0.5"
				max="1"
				step="0.05"
				value={settings.current.window_opacity}
				oninput={(e) => settings.update({ window_opacity: parseFloat(e.currentTarget.value) })}
				class="range range-primary range-xs"
			/>
		</div>
	</section>

	<!-- System -->
	<section class="rounded-xl bg-base-200/40 border border-base-content/5 p-5 flex flex-col gap-4">
		<h2 class="text-xs font-semibold uppercase tracking-wider text-base-content/50">System</h2>

		<div class="form-control">
			<label class="label" for="python-path">
				<span class="label-text">Python Path</span>
			</label>
			<input
				id="python-path"
				type="text"
				class="input input-bordered input-sm w-full font-mono text-sm"
				value={settings.current.python_path}
				oninput={(e) => settings.update({ python_path: e.currentTarget.value })}
			/>
		</div>

		<div class="form-control">
			<label class="label cursor-pointer justify-start gap-3">
				<input
					type="checkbox"
					class="toggle toggle-primary toggle-sm"
					checked={settings.current.launch_at_startup}
					onchange={(e) => settings.update({ launch_at_startup: e.currentTarget.checked })}
				/>
				<span class="label-text">Launch at startup</span>
			</label>
		</div>

		<div class="form-control">
			<span class="label">
				<span class="label-text">Data Directory</span>
			</span>
			<div class="bg-base-300/40 rounded-lg px-3 py-2 font-mono text-sm text-base-content/60">
				{settings.current.data_directory}
			</div>
		</div>
	</section>

	<!-- Briefings -->
	<section class="rounded-xl bg-base-200/40 border border-base-content/5 p-5 flex flex-col gap-4">
		<h2 class="text-xs font-semibold uppercase tracking-wider text-base-content/50">Briefings</h2>

		<div class="form-control">
			<label class="label" for="briefings-dir">
				<span class="label-text">Briefings Directory</span>
			</label>
			<input
				id="briefings-dir"
				type="text"
				class="input input-bordered input-sm w-full font-mono text-sm"
				value={settings.current.briefings_dir}
				oninput={(e) => settings.update({ briefings_dir: e.currentTarget.value })}
			/>
		</div>

		<div class="form-control">
			<label class="label" for="briefings-max-days">
				<span class="label-text">Max Days to Show</span>
				<span class="label-text-alt text-base-content/40">{settings.current.briefings_max_days} days</span>
			</label>
			<input
				id="briefings-max-days"
				type="range"
				min="1"
				max="30"
				step="1"
				value={settings.current.briefings_max_days}
				oninput={(e) => settings.update({ briefings_max_days: parseInt(e.currentTarget.value) })}
				class="range range-primary range-xs"
			/>
		</div>
	</section>

	<!-- System Status -->
	<section class="rounded-xl bg-base-200/40 border border-base-content/5 p-5">
		<div class="flex items-center justify-between mb-4">
			<h2 class="text-xs font-semibold uppercase tracking-wider text-base-content/50">System Status</h2>
			<button
				class="btn btn-ghost btn-xs text-[11px]"
				onclick={() => system.load(settings.current.python_path)}
				disabled={system.current.loading}
			>
				{system.current.loading ? '...' : 'Refresh'}
			</button>
		</div>

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
	</section>

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
