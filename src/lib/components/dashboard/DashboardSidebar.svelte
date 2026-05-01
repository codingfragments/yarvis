<script lang="ts">
	import type { ActiveDealDef, ActionItem as ActionItemData, Fun, MeetingPrep } from '$lib/types';
	import SectionCard from './SectionCard.svelte';
	import ActionItem from './ActionItem.svelte';
	import Chip from './Chip.svelte';
	import EmptyState from './EmptyState.svelte';
	import { priorityRank } from '$lib/dashboard/format';

	interface Props {
		actions: ActionItemData[];
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
	let openOnly = $state(false);

	const visibleActions = $derived.by(() => {
		const filtered = openOnly ? actions.filter((a) => !a.done) : actions;
		return [...filtered].sort((a, c) => priorityRank(a.priority) - priorityRank(c.priority));
	});

	const emptyFallback = $derived(
		openOnly && actions.some((a) => a.done) ? 'All actions done — nice.' : 'Nothing queued.'
	);
</script>

<aside
	class="order-2 md:order-none md:w-96 md:shrink-0 flex flex-col gap-3 md:min-h-0"
>
	<div class={actionsOpen ? 'md:flex-1 md:min-h-0' : 'md:shrink-0'}>
		<SectionCard
			fillHeight={actionsOpen}
			collapsible
			defaultOpen
			onToggle={(o) => (actionsOpen = o)}
			icon="⚡"
			title="Action items"
			count={visibleActions.length}
		>
			{#snippet actions()}
				<label class="flex items-center gap-1.5 text-xs text-base-content/60 cursor-pointer select-none" title="Hide completed actions">
					<input type="checkbox" class="toggle toggle-xs" bind:checked={openOnly} />
					<span>Open only</span>
				</label>
			{/snippet}

			{#if visibleActions.length === 0}
				<EmptyState items="actions" {lensActive} {lensName} fallback={emptyFallback} />
			{:else}
				<ul class="flex flex-col gap-2">
					{#each visibleActions as a (a.fingerprint ?? a.id)}
						<ActionItem action={a} deal={dealById(a.deal_tag)} />
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
							<Chip {deal} fallbackId={p.deal_tag} />
							{#if p.file}
								<button
									class="text-xs text-primary hover:underline"
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
			<div class="text-xs uppercase tracking-wider text-base-content/50 mb-1">
				{funShowJoke ? '😄 Joke' : '✨ Fun fact'}
			</div>
			<p class="text-xs text-base-content/80 leading-relaxed line-clamp-4">
				{funShowJoke ? (fun.joke ?? fun.fact) : (fun.fact ?? fun.joke)}
			</p>
		</button>
	{/if}
</aside>
