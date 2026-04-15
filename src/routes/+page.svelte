<script lang="ts">
	import AppLauncher from '$lib/components/AppLauncher.svelte';
	import { getSettingsStore } from '$lib/stores/settings.svelte';

	const settings = getSettingsStore();
</script>

<div class="flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] gap-6 px-4">
	<!-- Title area -->
	<div class="text-center mb-4">
		<h1 class="font-pixel text-2xl text-primary retro-glow mb-2">YARVIS</h1>
		<p class="text-sm text-base-content/50">Personal Knowledge Assistant</p>
	</div>

	<!-- Launcher grid -->
	<AppLauncher pixelFont={settings.current.pixel_font_headings} />
</div>
