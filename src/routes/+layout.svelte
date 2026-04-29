<script lang="ts">
	import '../app.css';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import StatusBar from '$lib/components/StatusBar.svelte';
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import { getRefreshStore } from '$lib/stores/refresh.svelte';
	import { onMount } from 'svelte';
	import pkg from '../../package.json';

	const appVersion = pkg.version;

	let { children } = $props();
	const settingsStore = getSettingsStore();
	const refresh = getRefreshStore();

	const resolvedTheme = $derived(
		settingsStore.current.theme === 'auto'
			? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
				? 'macchiato'
				: 'latte')
			: settingsStore.current.theme === 'dark'
				? 'macchiato'
				: 'latte'
	);

	onMount(() => {
		settingsStore.load();

		const onKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && (e.key === 'r' || e.key === 'R')) {
				const target = e.target as HTMLElement | null;
				const tag = target?.tagName;
				if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
				e.preventDefault();
				void refresh.triggerNow();
			}
		};
		window.addEventListener('keydown', onKey);
		return () => {
			window.removeEventListener('keydown', onKey);
			refresh.stop();
		};
	});

	$effect(() => {
		if (!settingsStore.loaded) return;
		refresh.configure({
			enabled: settingsStore.current.auto_refresh_enabled,
			intervalMinutes: settingsStore.current.auto_refresh_interval_minutes
		});
		refresh.start();
	});
</script>

<div
	data-theme={resolvedTheme}
	class="min-h-screen bg-base-100 text-base-content"
>
	<!-- Header bar -->
	<header class="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-2.5 bg-base-100/80 backdrop-blur-sm border-b border-base-content/5">
		<a href="/" class="flex items-center gap-2 no-underline">
			<span class="font-pixel text-[9px] tracking-wider text-primary retro-glow">YARVIS</span>
		</a>
		<ThemeToggle
			value={settingsStore.current.theme}
			onchange={(mode) => {
				settingsStore.update({ theme: mode });
				settingsStore.save();
			}}
		/>
	</header>

	<!-- Main content -->
	<main class="pt-14 pb-10 min-h-screen">
		{@render children()}
	</main>

	<!-- Status bar -->
	<StatusBar version={appVersion} />
</div>
