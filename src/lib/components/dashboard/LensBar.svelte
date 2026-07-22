<script lang="ts">
	import type { ActiveDealDef, InitiativeDef } from '$lib/types';
	import Chip from './Chip.svelte';
	import DealLensBar from './DealLensBar.svelte';
	import TopicLensBar from './TopicLensBar.svelte';

	interface Props {
		deals: ActiveDealDef[];
		initiatives: InitiativeDef[];
		dealSelected: string | null;
		topicSelected: string | null;
		onSelectDeal: (id: string | null) => void;
		onSelectTopic: (id: string | null) => void;
	}

	let { deals, initiatives, dealSelected, topicSelected, onSelectDeal, onSelectTopic }: Props =
		$props();

	function clearAll() {
		onSelectDeal(null);
		onSelectTopic(null);
	}
</script>

{#if deals.length > 0 || initiatives.length > 0}
	<div class="flex items-start gap-2 py-2 border-b border-base-content/5">
		<Chip
			labelOverride="All"
			variant="interactive"
			active={dealSelected === null && topicSelected === null}
			onclick={clearAll}
		/>
		<div class="flex flex-col gap-1.5 flex-1 min-w-0">
			<DealLensBar {deals} selected={dealSelected} onSelect={onSelectDeal} />
			<TopicLensBar {initiatives} selected={topicSelected} onSelect={onSelectTopic} />
		</div>
	</div>
{/if}
