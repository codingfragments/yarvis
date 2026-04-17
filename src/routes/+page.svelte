<script lang="ts">
	import AppLauncher from '$lib/components/AppLauncher.svelte';
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import { getTodayWidgets } from '$lib/services/briefings';
	import { isTauri } from '$lib/services/tauri';
	import { marked } from 'marked';
	import { onMount } from 'svelte';
	import type { TodayWidgets } from '$lib/types';

	const settings = getSettingsStore();

	let widgets = $state<TodayWidgets | null>(null);

	onMount(async () => {
		if (!isTauri()) return;
		// Wait for settings to load
		await new Promise<void>((resolve) => {
			const check = () => {
				if (settings.loaded) resolve();
				else setTimeout(check, 50);
			};
			check();
		});
		try {
			widgets = await getTodayWidgets(settings.current.briefings_dir);
		} catch {
			// Silently fail — widgets are optional
		}
	});

	const focusHtml = $derived(
		widgets?.focus ? marked.parse(widgets.focus, { gfm: true, breaks: false }) as string : ''
	);
	const funFactHtml = $derived(
		widgets?.fun_fact ? marked.parse(widgets.fun_fact, { gfm: true, breaks: false }) as string : ''
	);
</script>

<div class="flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] gap-6 px-4">
	<div class="text-center mb-2">
		<h1 class="font-pixel text-lg tracking-wider text-primary retro-glow mb-1">YARVIS</h1>
		<p class="text-xs text-base-content/40"><span class="text-primary/70 font-semibold">Y</span>our <span class="text-primary/70 font-semibold">A</span>utonomous <span class="text-primary/70 font-semibold">R</span>esource <span class="text-primary/70 font-semibold">V</span>ault & <span class="text-primary/70 font-semibold">I</span>ntelligence <span class="text-primary/70 font-semibold">S</span>uite</p>
	</div>

	<AppLauncher />

	<!-- Today's widgets -->
	{#if widgets?.focus || widgets?.fun_fact}
		<div class="w-full max-w-2xl px-4 mt-2 flex flex-col gap-3">
			{#if widgets.focus}
				<div class="rounded-xl bg-base-200/40 border border-base-content/5 p-4">
					<div class="flex items-center gap-2 mb-2">
						<span class="text-sm">🎯</span>
						<span class="text-[10px] font-semibold uppercase tracking-wider text-base-content/40">Today's Focus</span>
						<span class="text-[10px] text-base-content/25">· {widgets.date_display}</span>
					</div>
					<div class="text-sm text-base-content/70 leading-relaxed widget-md">
						{@html focusHtml}
					</div>
				</div>
			{/if}

			{#if widgets.fun_fact}
				<div class="rounded-xl bg-base-200/40 border border-base-content/5 p-4">
					<div class="flex items-center gap-2 mb-2">
						<span class="text-sm">🎲</span>
						<span class="text-[10px] font-semibold uppercase tracking-wider text-base-content/40">Fun Fact & Joke</span>
					</div>
					<div class="text-sm text-base-content/70 leading-relaxed widget-md">
						{@html funFactHtml}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.widget-md :global(p) {
		margin-bottom: 0.5rem;
	}
	.widget-md :global(p:last-child) {
		margin-bottom: 0;
	}
	.widget-md :global(strong) {
		color: oklch(var(--bc));
		font-weight: 600;
	}
	.widget-md :global(blockquote) {
		border-left: 2px solid oklch(var(--p) / 0.3);
		padding-left: 0.75rem;
		margin: 0.25rem 0;
		color: oklch(var(--bc) / 0.8);
	}
</style>
