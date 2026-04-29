<script lang="ts">
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import SettingsSection from './SettingsSection.svelte';
	import SettingsTextField from './SettingsTextField.svelte';
	import SettingsRangeField from './SettingsRangeField.svelte';

	const settings = getSettingsStore();
</script>

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
