<script lang="ts">
	import type { AppTileConfig } from '$lib/types';

	interface Props {
		tile: AppTileConfig;
		pixelFont?: boolean;
	}

	let { tile, pixelFont = true }: Props = $props();
</script>

{#if tile.available}
	<a
		href={tile.href}
		class="tile-glow group relative flex flex-col items-center justify-center gap-3
			rounded-lg bg-base-200/60 p-6 no-underline transition-all
			hover:bg-base-200"
		style="box-shadow:
			4px 0 0 0 {tile.accent},
			-4px 0 0 0 {tile.accent},
			0 4px 0 0 {tile.accent},
			0 -4px 0 0 {tile.accent},
			2px 2px 0 0 {tile.accent},
			-2px 2px 0 0 {tile.accent},
			2px -2px 0 0 {tile.accent},
			-2px -2px 0 0 {tile.accent};"
	>
		<span class="text-4xl transition-transform group-hover:scale-110">{tile.icon}</span>
		<span class="{pixelFont ? 'font-pixel text-[10px]' : 'text-sm font-semibold'} text-base-content">
			{tile.label}
		</span>
		<span class="text-[10px] text-base-content/60">{tile.description}</span>
	</a>
{:else}
	<div
		class="relative flex flex-col items-center justify-center gap-3
			rounded-lg bg-base-200/30 p-6 opacity-50 cursor-not-allowed"
		style="box-shadow:
			4px 0 0 0 {tile.accent}40,
			-4px 0 0 0 {tile.accent}40,
			0 4px 0 0 {tile.accent}40,
			0 -4px 0 0 {tile.accent}40,
			2px 2px 0 0 {tile.accent}40,
			-2px 2px 0 0 {tile.accent}40,
			2px -2px 0 0 {tile.accent}40,
			-2px -2px 0 0 {tile.accent}40;"
	>
		<span class="text-4xl">{tile.icon}</span>
		<span class="{pixelFont ? 'font-pixel text-[10px]' : 'text-sm font-semibold'} text-base-content/60">
			{tile.label}
		</span>
		<span class="font-pixel text-[7px] text-warning mt-1">COMING SOON</span>
	</div>
{/if}
