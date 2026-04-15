<script lang="ts">
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import { getSystemStore } from '$lib/stores/system.svelte';
	import PixelBorder from '$lib/components/PixelBorder.svelte';
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

<div class="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-8">
	<!-- Header -->
	<div class="flex items-center gap-3">
		<a href="/" class="btn btn-ghost btn-sm font-pixel text-[10px]">← BACK</a>
		<h1 class="font-pixel text-lg text-primary retro-glow">SETTINGS</h1>
	</div>

	<!-- Settings Form -->
	<div class="flex flex-col gap-6">
		<!-- Theme -->
		<PixelBorder class="bg-base-200/50 rounded-lg p-5">
			<h2 class="font-pixel text-[11px] text-secondary mb-4">APPEARANCE</h2>

			<div class="form-control mb-4">
				<label class="label" for="theme-select">
					<span class="label-text font-semibold">Theme</span>
				</label>
				<select
					id="theme-select"
					class="select select-bordered w-full max-w-xs"
					value={settings.current.theme}
					onchange={(e) => settings.update({ theme: e.currentTarget.value as 'dark' | 'light' | 'auto' })}
				>
					<option value="dark">Dark (Macchiato)</option>
					<option value="light">Light (Latte)</option>
					<option value="auto">Auto (System)</option>
				</select>
			</div>

			<!-- Accent Color -->
			<div class="form-control mb-4">
				<span class="label">
					<span class="label-text font-semibold">Accent Color</span>
				</span>
				<div class="flex flex-wrap gap-2">
					{#each accentColors as color}
						<button
							class="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110
								{settings.current.accent_color === color.name ? 'border-base-content scale-110 ring-2 ring-base-content/30' : 'border-transparent'}"
							style="background-color: {color.hex}"
							title={color.name}
							onclick={() => settings.update({ accent_color: color.name })}
						></button>
					{/each}
				</div>
			</div>

			<!-- Pixel Font Toggle -->
			<div class="form-control">
				<label class="label cursor-pointer justify-start gap-3">
					<input
						type="checkbox"
						class="toggle toggle-primary"
						checked={settings.current.pixel_font_headings}
						onchange={(e) => settings.update({ pixel_font_headings: e.currentTarget.checked })}
					/>
					<span class="label-text font-semibold">Pixel font for headings</span>
				</label>
			</div>

			<!-- Window Opacity -->
			<div class="form-control mt-2">
				<label class="label" for="opacity-slider">
					<span class="label-text font-semibold">Window Opacity</span>
					<span class="label-text-alt">{Math.round(settings.current.window_opacity * 100)}%</span>
				</label>
				<input
					id="opacity-slider"
					type="range"
					min="0.5"
					max="1"
					step="0.05"
					value={settings.current.window_opacity}
					oninput={(e) => settings.update({ window_opacity: parseFloat(e.currentTarget.value) })}
					class="range range-primary range-sm"
				/>
			</div>
		</PixelBorder>

		<!-- System -->
		<PixelBorder color="oklch(var(--s))" class="bg-base-200/50 rounded-lg p-5">
			<h2 class="font-pixel text-[11px] text-secondary mb-4">SYSTEM</h2>

			<!-- Python Path -->
			<div class="form-control mb-4">
				<label class="label" for="python-path">
					<span class="label-text font-semibold">Python Path</span>
				</label>
				<input
					id="python-path"
					type="text"
					class="input input-bordered w-full font-mono text-sm"
					value={settings.current.python_path}
					oninput={(e) => settings.update({ python_path: e.currentTarget.value })}
				/>
			</div>

			<!-- Launch at Startup -->
			<div class="form-control mb-4">
				<label class="label cursor-pointer justify-start gap-3">
					<input
						type="checkbox"
						class="toggle toggle-primary"
						checked={settings.current.launch_at_startup}
						onchange={(e) => settings.update({ launch_at_startup: e.currentTarget.checked })}
					/>
					<span class="label-text font-semibold">Launch at startup</span>
				</label>
			</div>

			<!-- Data Directory -->
			<div class="form-control">
				<span class="label">
					<span class="label-text font-semibold">Data Directory</span>
				</span>
				<div class="input input-bordered flex items-center font-mono text-sm bg-base-300/50 cursor-default">
					{settings.current.data_directory}
				</div>
			</div>
		</PixelBorder>

		<!-- System Status -->
		<PixelBorder color="oklch(var(--a))" class="bg-base-200/50 rounded-lg p-5">
			<div class="flex items-center justify-between mb-4">
				<h2 class="font-pixel text-[11px] text-accent">SYSTEM STATUS</h2>
				<button
					class="btn btn-ghost btn-xs font-pixel text-[8px]"
					onclick={() => system.load(settings.current.python_path)}
					disabled={system.current.loading}
				>
					{system.current.loading ? '...' : 'REFRESH'}
				</button>
			</div>

			{#if system.current.loading}
				<div class="flex justify-center py-4">
					<span class="loading loading-dots loading-sm"></span>
				</div>
			{:else if system.current.error}
				<div class="alert alert-error text-sm">
					<span>{system.current.error}</span>
				</div>
			{:else}
				<div class="grid grid-cols-2 gap-3">
					{#if system.current.info}
						<div class="stat bg-base-300/50 rounded-lg p-3">
							<div class="stat-title text-[10px]">App Version</div>
							<div class="stat-value text-sm font-mono">v{system.current.info.app_version}</div>
						</div>
						<div class="stat bg-base-300/50 rounded-lg p-3">
							<div class="stat-title text-[10px]">OS / Arch</div>
							<div class="stat-value text-sm font-mono">{system.current.info.os} / {system.current.info.arch}</div>
						</div>
						<div class="stat bg-base-300/50 rounded-lg p-3">
							<div class="stat-title text-[10px]">Rust</div>
							<div class="stat-value text-xs font-mono">{system.current.info.rust_version}</div>
						</div>
					{/if}
					<div class="stat bg-base-300/50 rounded-lg p-3">
						<div class="stat-title text-[10px]">Python</div>
						<div class="stat-value text-sm font-mono">{system.current.pythonVersion || '—'}</div>
					</div>
					<div class="stat bg-base-300/50 rounded-lg p-3">
						<div class="stat-title text-[10px]">SQLite</div>
						<div class="stat-value text-sm font-mono">{system.current.sqliteVersion || '—'}</div>
					</div>
					<div class="stat bg-base-300/50 rounded-lg p-3">
						<div class="stat-title text-[10px]">Data Size</div>
						<div class="stat-value text-sm font-mono">{system.current.dataDirSize || '—'}</div>
					</div>
				</div>
			{/if}
		</PixelBorder>
	</div>

	<!-- Action buttons -->
	<div class="flex items-center gap-3">
		<button
			class="btn btn-primary font-pixel text-[10px]"
			onclick={handleSave}
			disabled={settings.saving}
		>
			{settings.saving ? 'SAVING...' : 'SAVE'}
		</button>
		<button class="btn btn-ghost font-pixel text-[10px]" onclick={handleReset}>
			RESET
		</button>
		{#if saveMessage}
			<span class="text-success font-pixel text-[9px] animate-pulse">{saveMessage}</span>
		{/if}
		{#if settings.error}
			<span class="text-error text-sm">{settings.error}</span>
		{/if}
	</div>
</div>
