<script lang="ts">
	import { getSystemStore } from '$lib/stores/system.svelte';
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import { isTauri } from '$lib/services/tauri';
	import { onMount } from 'svelte';

	const system = getSystemStore();
	const settings = getSettingsStore();

	async function openGitHub() {
		const url = 'https://github.com/codingfragments/yarvis';
		if (isTauri()) {
			const { open } = await import('@tauri-apps/plugin-shell');
			open(url);
		} else {
			window.open(url, '_blank');
		}
	}

	onMount(() => {
		system.load(settings.current.python_path);
	});

	const techStack = [
		{ name: 'Tauri v2', icon: '🦀', desc: 'Desktop shell' },
		{ name: 'SvelteKit', icon: '🔥', desc: 'Frontend framework' },
		{ name: 'Svelte 5', icon: '⚡', desc: 'Runes reactivity' },
		{ name: 'Rust', icon: '⚙️', desc: 'Backend language' },
		{ name: 'TailwindCSS v4', icon: '🎨', desc: 'Utility CSS' },
		{ name: 'DaisyUI v5', icon: '🌼', desc: 'Components' },
		{ name: 'Catppuccin', icon: '🐱', desc: 'Color theme' },
		{ name: 'Bun', icon: '🍞', desc: 'JS runtime' },
		{ name: 'SQLite', icon: '🗃️', desc: 'Embedded database' },
		{ name: 'marked.js', icon: '📝', desc: 'Markdown rendering' },
		{ name: 'TypeScript', icon: '🔷', desc: 'Type safety' },
		{ name: 'Vite', icon: '⚡', desc: 'Build tool' },
	];

	const shortcuts = [
		{ keys: '↑ / ↓', action: 'Navigate between files' },
		{ keys: '← / →', action: 'Switch dates' },
		{ keys: 'Esc', action: 'Close side panel' },
		{ keys: '/', action: 'Focus search' },
	];
</script>

<div class="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
	<!-- Back -->
	<div>
		<a href="/" class="btn btn-ghost btn-sm text-xs">← Back</a>
	</div>

	<!-- Hero -->
	<div class="text-center py-6">
		<div class="text-5xl mb-4">🟪</div>
		<h1 class="font-pixel text-xl tracking-wider text-primary retro-glow mb-2">YARVIS</h1>
		<p class="text-sm text-base-content/50 font-medium tracking-wide">
			Your Autonomous Resource Vault & Intelligence Suite
		</p>
		{#if system.current.info}
			<span class="inline-block mt-3 text-[10px] font-mono bg-base-content/5 text-base-content/40 px-2.5 py-1 rounded-full">
				v{system.current.info.app_version}
			</span>
		{/if}
	</div>

	<!-- What is Yarvis -->
	<section class="rounded-xl bg-base-200/40 border border-base-content/5 p-5">
		<h2 class="text-xs font-semibold uppercase tracking-wider text-base-content/50 mb-3">What is Yarvis?</h2>
		<p class="text-sm text-base-content/70 leading-relaxed">
			Yarvis is a <strong class="text-base-content">local-first personal knowledge assistant</strong> that runs
			as a native desktop app. Your data never leaves your machine — briefings, notes, files, and databases
			all stay in <code class="text-xs bg-base-content/5 px-1.5 py-0.5 rounded">~/.yarvis/</code>.
		</p>
		<p class="text-sm text-base-content/70 leading-relaxed mt-2">
			Built as both a <strong class="text-base-content">learning experiment</strong> and a
			<strong class="text-base-content">reusable tool</strong> — exploring what's possible when you combine
			a Rust backend with a modern reactive frontend, all wrapped in a native window.
		</p>
	</section>

	<!-- Tech Stack -->
	<section class="rounded-xl bg-base-200/40 border border-base-content/5 p-5">
		<h2 class="text-xs font-semibold uppercase tracking-wider text-base-content/50 mb-3">Tech Stack</h2>
		<div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
			{#each techStack as tech}
				<div class="flex items-center gap-2 bg-base-content/5 rounded-lg px-2.5 py-2">
					<span class="text-base">{tech.icon}</span>
					<div class="min-w-0">
						<div class="text-xs font-medium text-base-content truncate">{tech.name}</div>
						<div class="text-[10px] text-base-content/40 truncate">{tech.desc}</div>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- System Info -->
	<section class="rounded-xl bg-base-200/40 border border-base-content/5 p-5">
		<h2 class="text-xs font-semibold uppercase tracking-wider text-base-content/50 mb-3">System</h2>
		{#if system.current.loading}
			<span class="loading loading-dots loading-sm text-primary"></span>
		{:else if system.current.info}
			<div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
				<div class="bg-base-300/40 rounded-lg px-3 py-2">
					<div class="text-[10px] text-base-content/40">App Version</div>
					<div class="text-sm font-mono">v{system.current.info.app_version}</div>
				</div>
				<div class="bg-base-300/40 rounded-lg px-3 py-2">
					<div class="text-[10px] text-base-content/40">OS / Arch</div>
					<div class="text-sm font-mono">{system.current.info.os} / {system.current.info.arch}</div>
				</div>
				<div class="bg-base-300/40 rounded-lg px-3 py-2">
					<div class="text-[10px] text-base-content/40">Rust</div>
					<div class="text-xs font-mono">{system.current.info.rust_version}</div>
				</div>
				<div class="bg-base-300/40 rounded-lg px-3 py-2">
					<div class="text-[10px] text-base-content/40">Python</div>
					<div class="text-sm font-mono">{system.current.pythonVersion || '—'}</div>
				</div>
				<div class="bg-base-300/40 rounded-lg px-3 py-2">
					<div class="text-[10px] text-base-content/40">SQLite</div>
					<div class="text-sm font-mono">{system.current.sqliteVersion || '—'}</div>
				</div>
				<div class="bg-base-300/40 rounded-lg px-3 py-2">
					<div class="text-[10px] text-base-content/40">Data Size</div>
					<div class="text-sm font-mono">{system.current.dataDirSize || '—'}</div>
				</div>
			</div>
		{:else}
			<p class="text-xs text-base-content/40">System info unavailable in browser mode</p>
		{/if}
	</section>

	<!-- Keyboard Shortcuts -->
	<section class="rounded-xl bg-base-200/40 border border-base-content/5 p-5">
		<h2 class="text-xs font-semibold uppercase tracking-wider text-base-content/50 mb-3">Keyboard Shortcuts</h2>
		<div class="flex flex-col gap-1.5">
			{#each shortcuts as s}
				<div class="flex items-center gap-3 text-sm">
					<kbd class="kbd kbd-sm font-mono text-[11px] min-w-[4rem] text-center">{s.keys}</kbd>
					<span class="text-base-content/60">{s.action}</span>
				</div>
			{/each}
		</div>
	</section>

	<!-- Links & Footer -->
	<section class="rounded-xl bg-base-200/40 border border-base-content/5 p-5">
		<h2 class="text-xs font-semibold uppercase tracking-wider text-base-content/50 mb-3">Links</h2>
		<button
			class="flex items-center gap-2.5 text-sm text-primary hover:underline"
			onclick={openGitHub}
		>
			<span>🐙</span>
			<span>github.com/codingfragments/yarvis</span>
			<span class="text-base-content/20 text-xs">↗</span>
		</button>
	</section>

	<div class="text-center text-[11px] text-base-content/25 py-4">
		Built with ❤️ and <span class="text-base-content/35">Claude Code</span>
	</div>
</div>
