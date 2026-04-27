<script lang="ts">
	import type { AppTileConfig } from '$lib/types';
	import AppTile from './AppTile.svelte';
	import SearchBar from './SearchBar.svelte';

	let search = $state('');

	const appTiles: AppTileConfig[] = [
		{
			id: 'dashboard',
			label: 'Dashboard',
			icon: '📊',
			href: '/dashboard',
			accent: '#a6da95',
			available: true,
			description: 'Today at a glance'
		},
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
			id: 'learning',
			label: 'Learning',
			icon: '📚',
			href: '/learning',
			accent: '#f5a97f',
			available: true,
			description: 'Self-paced courses'
		},
		{
			id: 'about',
			label: 'About',
			icon: 'ℹ️',
			href: '/about',
			accent: '#91d7e3',
			available: true,
			description: 'About Yarvis'
		}
	];

	// Settings always appears last (rightmost column)
	const settingsTile: AppTileConfig = {
		id: 'settings',
		label: 'Settings',
		icon: '⚙️',
		href: '/settings',
		accent: '#c6a0f6',
		available: true,
		description: 'Configure Yarvis'
	};

	const tiles = $derived([...appTiles, settingsTile]);

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
