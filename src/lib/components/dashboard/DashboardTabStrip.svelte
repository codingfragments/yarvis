<script lang="ts" module>
	export const TAB_KEYS = ['summary', 'calendar', 'email', 'slack', 'research'] as const;
	export type TabKey = (typeof TAB_KEYS)[number];
</script>

<script lang="ts">
	type TabCountKey = Exclude<TabKey, 'summary'>;

	interface TabCounts {
		calendar: number;
		email: number;
		slack: number;
		research: number;
		conflicts: number;
		pending: number;
	}

	interface Props {
		tab: TabKey;
		counts: TabCounts;
		onSelect: (key: TabKey) => void;
	}

	let { tab, counts, onSelect }: Props = $props();
</script>

<nav class="shrink-0 flex gap-1 border-b border-base-content/10 -mx-1 px-1 overflow-x-auto overflow-y-hidden">
	{#each TAB_KEYS as key}
		{@const active = tab === key}
		{@const count = key === 'summary' ? null : counts[key as TabCountKey]}
		<button
			class="shrink-0 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 capitalize"
			class:border-primary={active}
			class:text-primary={active}
			class:border-transparent={!active}
			class:text-base-content={!active}
			class:opacity-60={!active}
			onclick={() => onSelect(key)}
		>
			<span>{key}</span>
			{#if count !== null && count !== undefined && count > 0}
				<span
					class="rounded-full bg-base-300/60 px-1.5 py-0.5 text-[10px] font-mono"
					class:bg-primary={active}
					class:text-primary-content={active}
				>
					{count}
				</span>
			{/if}
			{#if key === 'calendar' && counts.conflicts > 0}
				<span class="text-warning" title="{counts.conflicts} conflict{counts.conflicts > 1 ? 's' : ''}">⚠</span>
			{/if}
		</button>
	{/each}
</nav>
