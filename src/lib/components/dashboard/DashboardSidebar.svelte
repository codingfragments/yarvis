<script lang="ts">
	import type { ActiveDealDef, ActionItem, Fun, MeetingPrep } from '$lib/types';
	import SectionCard from './SectionCard.svelte';
	import DealPill from './DealPill.svelte';
	import UrgencyDot from './UrgencyDot.svelte';
	import ExternalLink from './ExternalLink.svelte';
	import { priorityRank } from '$lib/dashboard/format';

	interface Props {
		actions: ActionItem[];
		preps: MeetingPrep[];
		fun: Fun | null;
		lensActive: boolean;
		lensName: string | null;
		dealById: (id: string | null | undefined) => ActiveDealDef | null;
		onOpenPrep: (p: MeetingPrep) => void;
	}

	let { actions, preps, fun, lensActive, lensName, dealById, onOpenPrep }: Props = $props();

	let actionsOpen = $state(true);
	let prepsOpen = $state(false);
	let funShowJoke = $state(false);
</script>

<aside
	class="order-2 md:order-none md:w-80 md:shrink-0 flex flex-col gap-3 md:min-h-0"
>
	<div class={actionsOpen ? 'md:flex-1 md:min-h-0' : 'md:shrink-0'}>
		<SectionCard
			fillHeight={actionsOpen}
			collapsible
			defaultOpen
			onToggle={(o) => (actionsOpen = o)}
			icon="⚡"
			title="Action items"
			count={actions.length}
		>
			{#if actions.length === 0}
				<p class="text-xs text-base-content/40 italic">
					{lensActive ? `No actions for ${lensName}.` : 'Nothing queued.'}
				</p>
			{:else}
				<ul class="flex flex-col gap-2">
					{#each [...actions].sort((a, c) => priorityRank(a.priority) - priorityRank(c.priority)) as a}
						{@const deal = dealById(a.deal_tag)}
						<li class="rounded-lg bg-base-100/40 border border-base-content/5 px-3 py-2.5 flex flex-col gap-1.5">
							<div class="flex items-start gap-2">
								<UrgencyDot urgency={a.priority} size="md" />
								<p class="flex-1 min-w-0 text-xs text-base-content/85 leading-snug break-words">{a.text}</p>
							</div>
							<div class="flex items-center gap-1.5 flex-wrap text-[10px] text-base-content/50">
								{#if a.deadline}<span class="font-mono">⏰ {a.deadline}</span>{/if}
								{#if a.source_type}<span class="opacity-60">· {a.source_type}</span>{/if}
								<DealPill {deal} fallbackId={a.deal_tag} />
								{#if a.url}<ExternalLink href={a.url} label="open" />{/if}
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</SectionCard>
	</div>

	{#if preps.length > 0}
		<div class={prepsOpen ? 'md:flex-1 md:min-h-0' : 'md:shrink-0'}>
			<SectionCard
				fillHeight={prepsOpen}
				collapsible
				defaultOpen={false}
				onToggle={(o) => (prepsOpen = o)}
				icon="📝"
				title="Meeting preps"
				count={preps.length}
			>
				<ul class="flex flex-col gap-1.5">
					{#each preps as p}
						{@const deal = dealById(p.deal_tag)}
						<li class="flex items-center gap-2 text-xs">
							<span class="font-mono text-base-content/50 w-12">{p.time}</span>
							<span class="flex-1 truncate text-base-content/80" title={p.title}>{p.title}</span>
							<DealPill {deal} fallbackId={p.deal_tag} />
							{#if p.file}
								<button
									class="text-[11px] text-primary hover:underline"
									onclick={() => onOpenPrep(p)}
									title="Open prep document"
								>open</button>
							{/if}
						</li>
					{/each}
				</ul>
			</SectionCard>
		</div>
	{/if}

	{#if fun && (fun.fact || fun.joke)}
		<button
			class="md:shrink-0 rounded-xl bg-gradient-to-br from-secondary/10 via-accent/5 to-primary/10 border border-base-content/5 p-3 text-left hover:scale-[1.01] transition-transform"
			onclick={() => (funShowJoke = !funShowJoke)}
			title="Click to flip"
		>
			<div class="text-[10px] uppercase tracking-wider text-base-content/50 mb-1">
				{funShowJoke ? '😄 Joke' : '✨ Fun fact'}
			</div>
			<p class="text-xs text-base-content/80 leading-relaxed line-clamp-4">
				{funShowJoke ? (fun.joke ?? fun.fact) : (fun.fact ?? fun.joke)}
			</p>
		</button>
	{/if}
</aside>
