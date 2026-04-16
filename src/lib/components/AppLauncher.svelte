<script lang="ts">
	import type { AppTileConfig } from '$lib/types';
	import AppTile from './AppTile.svelte';
	import SearchBar from './SearchBar.svelte';

	let search = $state('');

	const tiles: AppTileConfig[] = [
		{
			id: 'briefings',
			label: 'Briefings',
			icon: '📋',
			href: '/briefings',
			accent: '#8aadf4',
			available: true,
			description: 'Daily briefings viewer'
		},
		{
			id: 'settings',
			label: 'Settings',
			icon: '⚙️',
			href: '/settings',
			accent: '#c6a0f6',
			available: true,
			description: 'Configure Yarvis'
		},
		{
			id: 'files',
			label: 'Files',
			icon: '📁',
			href: '/files',
			accent: '#8bd5ca',
			available: false,
			description: 'Browse & edit files'
		},
		{
			id: 'notes',
			label: 'Notes',
			icon: '📝',
			href: '/notes',
			accent: '#f5a97f',
			available: false,
			description: 'Markdown notes'
		},
		{
			id: 'database',
			label: 'Database',
			icon: '🗄️',
			href: '/database',
			accent: '#a6da95',
			available: false,
			description: 'SQLite explorer'
		},
		{
			id: 'python',
			label: 'Python',
			icon: '🐍',
			href: '/python',
			accent: '#eed49f',
			available: false,
			description: 'Run Python code'
		},
		{
			id: 'terminal',
			label: 'Terminal',
			icon: '💻',
			href: '/terminal',
			accent: '#b7bdf8',
			available: false,
			description: 'System terminal'
		}
	];

	const filtered = $derived(
		search
			? tiles.filter(
					(t) =>
						t.label.toLowerCase().includes(search.toLowerCase()) ||
						t.description.toLowerCase().includes(search.toLowerCase())
				)
			: tiles
	);
</script>

<div class="flex flex-col items-center gap-8 w-full">
	<SearchBar value={search} oninput={(v) => (search = v)} />

	<div class="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-2xl px-4">
		{#each filtered as tile (tile.id)}
			<AppTile {tile} />
		{/each}
	</div>

	{#if filtered.length === 0}
		<p class="text-sm text-base-content/40 mt-8">No tools found</p>
	{/if}
</div>
