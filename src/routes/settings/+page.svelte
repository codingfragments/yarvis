<script lang="ts">
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import AppearanceSettings from '$lib/components/settings/AppearanceSettings.svelte';
	import SystemSettings from '$lib/components/settings/SystemSettings.svelte';
	import DashboardSettings from '$lib/components/settings/DashboardSettings.svelte';
	import AutoRefreshSettings from '$lib/components/settings/AutoRefreshSettings.svelte';
	import BriefingsSettings from '$lib/components/settings/BriefingsSettings.svelte';
	import LearningSettings from '$lib/components/settings/LearningSettings.svelte';
	import SystemStatusSection from '$lib/components/settings/SystemStatusSection.svelte';

	const settings = getSettingsStore();

	let saveMessage = $state('');

	function flash(msg: string) {
		saveMessage = msg;
		setTimeout(() => (saveMessage = ''), 2000);
	}

	async function handleSave() {
		await settings.save();
		if (!settings.error) flash('Settings saved!');
	}

	async function handleReset() {
		await settings.reset();
		flash('Settings reset to defaults!');
	}
</script>

<div class="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
	<div class="flex items-center gap-3">
		<a href="/" class="btn btn-ghost btn-sm text-xs">← Back</a>
		<h1 class="text-lg font-semibold text-base-content">Settings</h1>
	</div>

	<AppearanceSettings />
	<SystemSettings />
	<DashboardSettings />
	<AutoRefreshSettings />
	<BriefingsSettings />
	<LearningSettings onMessage={flash} />
	<SystemStatusSection />

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
