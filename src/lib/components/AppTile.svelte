<script lang="ts">
	import type { AppTileConfig } from '$lib/types';

	interface Props {
		tile: AppTileConfig;
	}

	let { tile }: Props = $props();
</script>

{#if tile.available}
	<a
		href={tile.href}
		class="tile-glow group flex flex-col items-center justify-center gap-3
			rounded-xl bg-base-200/50 p-6 no-underline
			border border-base-content/5 hover:border-base-content/10
			hover:bg-base-200/80 transition-all"
	>
		<span class="text-3xl transition-transform group-hover:scale-110">{tile.icon}</span>
		<span class="text-sm font-medium text-base-content">{tile.label}</span>
		<span class="text-[11px] text-base-content/50">{tile.description}</span>
	</a>
{:else}
	<div
		class="flex flex-col items-center justify-center gap-3
			rounded-xl bg-base-200/25 p-6
			border border-base-content/5 opacity-40 cursor-not-allowed"
	>
		<span class="text-3xl">{tile.icon}</span>
		<span class="text-sm font-medium text-base-content/60">{tile.label}</span>
		<span class="text-[10px] text-base-content/30 font-pixel tracking-wider">SOON</span>
	</div>
{/if}
