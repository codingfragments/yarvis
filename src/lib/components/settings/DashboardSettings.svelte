<script lang="ts">
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import SettingsSection from './SettingsSection.svelte';
	import SettingsTextField from './SettingsTextField.svelte';

	const settings = getSettingsStore();
</script>

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
