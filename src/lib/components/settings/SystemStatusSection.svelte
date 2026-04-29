<script lang="ts">
	import { onMount } from 'svelte';
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import { getSystemStore } from '$lib/stores/system.svelte';
	import SettingsSection from './SettingsSection.svelte';

	const settings = getSettingsStore();
	const system = getSystemStore();

	onMount(() => {
		system.load(settings.current.python_path);
	});
</script>

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
