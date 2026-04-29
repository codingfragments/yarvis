<script lang="ts">
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import SettingsSection from './SettingsSection.svelte';
	import SettingsTextField from './SettingsTextField.svelte';
	import SettingsToggleField from './SettingsToggleField.svelte';

	const settings = getSettingsStore();
</script>

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
