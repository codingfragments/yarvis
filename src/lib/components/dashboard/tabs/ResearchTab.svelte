<script lang="ts">
	import type { IntelCategory, IntelligenceCategoryDef } from '$lib/types';
	import SectionCard from '../SectionCard.svelte';
	import ExternalLink from '../ExternalLink.svelte';

	interface Props {
		intel: IntelCategory[];
		lensActive: boolean;
		lensName: string | null;
		categoryById: (id: string) => IntelligenceCategoryDef | null;
	}

	let { intel, lensActive, lensName, categoryById }: Props = $props();
</script>

<div class="flex flex-col gap-3">
	{#if intel.length === 0}
		<p class="text-xs text-base-content/40 italic">
			{lensActive ? `No intel tagged for ${lensName}.` : 'No intelligence items today.'}
		</p>
	{/if}
	{#each intel as cat}
		{@const def = categoryById(cat.category_id)}
		<SectionCard
			icon={def?.icon ?? '📰'}
			title={def?.label ?? cat.category_id}
			count={cat.items.length}
			collapsible={true}
			defaultOpen={cat.items.length <= 3}
		>
			<ul class="flex flex-col gap-2">
				{#each cat.items as it}
					<li class="rounded-lg bg-base-100/30 px-3 py-2.5">
						<div class="flex items-start gap-2 mb-1 flex-wrap">
							<h4 class="text-xs font-semibold text-base-content/90 flex-1 min-w-0 break-words">{it.headline}</h4>
							{#if it.url}<ExternalLink href={it.url} label={it.source ?? 'source'} />{/if}
						</div>
						<p class="text-[11px] text-base-content/65 leading-snug break-words">{it.detail}</p>
						{#if it.relevance}<p class="text-[11px] text-primary/80 italic mt-1.5 break-words">↳ {it.relevance}</p>{/if}
					</li>
				{/each}
			</ul>
		</SectionCard>
	{/each}
</div>
