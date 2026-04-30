<script lang="ts">
	import type { ActiveDealDef } from '$lib/types';
	import DealChip from './DealChip.svelte';

	interface Props {
		deal: ActiveDealDef | null;
		fallbackId?: string | null;
	}

	let { deal, fallbackId = null }: Props = $props();
</script>

<DealChip {deal} {fallbackId} />
