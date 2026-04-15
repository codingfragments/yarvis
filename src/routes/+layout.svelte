<script lang="ts">
	import '../app.css';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import StatusBar from '$lib/components/StatusBar.svelte';
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import { onMount } from 'svelte';

	let { children } = $props();
	const settingsStore = getSettingsStore();

	const resolvedTheme = $derived(
		settingsStore.current.theme === 'auto'
			? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
				? 'catppuccin-macchiato'
				: 'catppuccin-latte')
			: settingsStore.current.theme === 'dark'
				? 'catppuccin-macchiato'
				: 'catppuccin-latte'
	);

	onMount(() => {
		settingsStore.load();
	});
</script>

<div
	data-theme={resolvedTheme}
	class="min-h-screen bg-base-100 text-base-content relative scanlines"
	class:font-pixel={settingsStore.current.pixel_font_headings}
>
	<!-- Header bar -->
	<header class="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-2 bg-base-100/80 backdrop-blur-sm border-b border-base-content/5">
		<a href="/" class="flex items-center gap-2 no-underline">
			<span class="font-pixel text-[12px] retro-glow text-primary">YARVIS</span>
		</a>
		<ThemeToggle
			value={settingsStore.current.theme}
			onchange={(mode) => {
				settingsStore.update({ theme: mode });
				settingsStore.save();
			}}
			pixelFont={settingsStore.current.pixel_font_headings}
		/>
	</header>

	<!-- Main content -->
	<main class="pt-14 pb-10 min-h-screen">
		{@render children()}
	</main>

	<!-- Status bar -->
	<StatusBar />
</div>
