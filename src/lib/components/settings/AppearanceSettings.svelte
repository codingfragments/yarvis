<script lang="ts">
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import SettingsSection from './SettingsSection.svelte';
	import SettingsToggleField from './SettingsToggleField.svelte';
	import SettingsRangeField from './SettingsRangeField.svelte';

	const settings = getSettingsStore();

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
</script>

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
