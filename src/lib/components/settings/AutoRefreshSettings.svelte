<script lang="ts">
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import SettingsSection from './SettingsSection.svelte';
	import SettingsToggleField from './SettingsToggleField.svelte';
	import SettingsRangeField from './SettingsRangeField.svelte';

	const settings = getSettingsStore();
</script>

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
