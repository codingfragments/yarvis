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

	let renderError = $state<{ message: string; reset: () => void } | null>(null);

	function handleRenderError(error: unknown, reset: () => void) {
		console.error('[Yarvis] Render error:', error);
		renderError = {
			message: error instanceof Error ? error.message : String(error),
			reset
		};
	}
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
		<svelte:boundary onerror={handleRenderError}>
			{@render children()}
			{#snippet failed()}
				<div class="flex flex-col items-center justify-center h-64 gap-2 text-base-content/30">
					<span class="text-2xl" aria-hidden="true">⚠️</span>
					<span class="text-sm">Page content unavailable — see error dialog</span>
				</div>
			{/snippet}
		</svelte:boundary>
	</main>

	{#if renderError}
		<!-- Error overlay dialog -->
		<div class="fixed inset-0 z-50 flex items-center justify-center">
			<button
				type="button"
				class="absolute inset-0 bg-base-300/60 backdrop-blur-sm cursor-default"
				aria-label="Close error dialog"
				onclick={() => (renderError = null)}
			></button>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="render-error-title"
				class="relative bg-base-100 border border-base-content/10 rounded-xl shadow-xl max-w-lg w-full mx-4 p-5"
			>
				<div class="flex items-start gap-3 mb-3">
					<span class="text-xl mt-0.5" aria-hidden="true">⚠️</span>
					<div>
						<h2 id="render-error-title" class="text-sm font-semibold text-error">Rendering error</h2>
						<p class="text-xs text-base-content/60 mt-0.5">A component crashed and could not be displayed.</p>
					</div>
				</div>
				<pre class="text-xs font-mono bg-base-200 rounded-lg px-3 py-2 overflow-auto max-h-40 text-error/80 whitespace-pre-wrap mb-4">{renderError.message}</pre>
				<div class="flex justify-end gap-2">
					<button
						class="btn btn-sm btn-ghost"
						onclick={() => { const r = renderError!.reset; renderError = null; r(); }}
					>Retry</button>
					<button
						class="btn btn-sm btn-primary"
						onclick={() => window.location.reload()}
					>Reload App</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Status bar -->
	<StatusBar version={appVersion} />
</div>
