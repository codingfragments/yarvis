<script lang="ts">
	import type { XpRank } from '$lib/types';

	interface Props {
		xpEarned: number;
		totalXp: number;
		rank: XpRank | null;
		nextRank: XpRank | null;
		compact?: boolean;
	}

	let { xpEarned, totalXp, rank, nextRank, compact = false }: Props = $props();

	const percent = $derived(totalXp > 0 ? Math.min(100, Math.round((xpEarned / totalXp) * 100)) : 0);
</script>

{#if compact}
	<div class="flex items-center gap-2 text-[10px] text-base-content/50">
		{#if rank}
			<span>{rank.emoji}</span>
		{/if}
		<span class="font-mono">{xpEarned}</span>
		<span>/</span>
		<span class="font-mono">{totalXp} XP</span>
	</div>
{:else}
	<div class="flex flex-col gap-1.5">
		{#if rank}
			<div class="flex items-center gap-2">
				<span class="text-base">{rank.emoji}</span>
				<span class="text-xs font-semibold text-base-content/80">{rank.name}</span>
			</div>
		{/if}

		<div class="w-full bg-base-300/50 rounded-full h-2 overflow-hidden">
			<div
				class="h-full rounded-full bg-primary transition-all duration-700 ease-out"
				style="width: {percent}%"
			></div>
		</div>

		<div class="flex items-center justify-between text-[10px] text-base-content/40">
			<span class="font-mono">{xpEarned} / {totalXp} XP</span>
			{#if nextRank}
				<span>Next: {nextRank.emoji} {nextRank.threshold} XP</span>
			{/if}
		</div>
	</div>
{/if}
