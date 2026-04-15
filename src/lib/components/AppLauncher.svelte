<script lang="ts">
	import type { AppTileConfig } from '$lib/types';
	import AppTile from './AppTile.svelte';
	import SearchBar from './SearchBar.svelte';

	interface Props {
		pixelFont?: boolean;
	}

	let { pixelFont = true }: Props = $props();
	let search = $state('');

	const tiles: AppTileConfig[] = [
		{
			id: 'settings',
			label: 'Settings',
			icon: '⚙️',
			href: '/settings',
			accent: '#c6a0f6', // mauve
			available: true,
			description: 'Configure Yarvis'
		},
		{
			id: 'files',
			label: 'Files',
			icon: '📁',
			href: '/files',
			accent: '#8bd5ca', // teal
			available: false,
			description: 'Browse & edit files'
		},
		{
			id: 'notes',
			label: 'Notes',
			icon: '📝',
			href: '/notes',
			accent: '#f5a97f', // peach
			available: false,
			description: 'Markdown notes'
		},
		{
			id: 'database',
			label: 'Database',
			icon: '🗄️',
			href: '/database',
			accent: '#a6da95', // green
			available: false,
			description: 'SQLite explorer'
		},
		{
			id: 'python',
			label: 'Python',
			icon: '🐍',
			href: '/python',
			accent: '#eed49f', // yellow
			available: false,
			description: 'Run Python code'
		},
		{
			id: 'terminal',
			label: 'Terminal',
			icon: '💻',
			href: '/terminal',
			accent: '#b7bdf8', // lavender
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
	<SearchBar value={search} oninput={(v) => (search = v)} {pixelFont} />

	<div class="grid grid-cols-2 sm:grid-cols-3 gap-6 w-full max-w-2xl px-4">
		{#each filtered as tile (tile.id)}
			<AppTile {tile} {pixelFont} />
		{/each}
	</div>

	{#if filtered.length === 0}
		<p class="font-pixel text-[10px] text-base-content/40 mt-8">No tools found</p>
	{/if}
</div>
