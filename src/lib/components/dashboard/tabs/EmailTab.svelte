<script lang="ts">
	import type { ActiveDealDef, EmailItem, EmailSection } from '$lib/types';
	import AccentRow from '../AccentRow.svelte';
	import DealPill from '../DealPill.svelte';
	import ExternalLink from '../ExternalLink.svelte';
	import { rowAccent } from '$lib/dashboard/format';

	interface Props {
		email: EmailSection;
		actToday: EmailItem[];
		fyi: EmailItem[];
		lensActive: boolean;
		lensName: string | null;
		dealById: (id: string | null | undefined) => ActiveDealDef | null;
	}

	let { email, actToday, fyi, lensActive, lensName, dealById }: Props = $props();
</script>

<div class="flex flex-col gap-4">
	{#if actToday.length === 0 && fyi.length === 0}
		<p class="text-xs text-base-content/40 italic">
			{lensActive ? `No email for ${lensName}.` : 'No email today.'}
		</p>
	{/if}
	{#if actToday.length > 0}
		<div>
			<div class="text-xs uppercase tracking-wider text-base-content/50 font-semibold mb-2">Act today</div>
			<ul class="flex flex-col gap-2">
				{#each actToday as m}
					{@const deal = dealById(m.deal_tag)}
					<AccentRow accent={rowAccent({ urgency: m.urgency })}>
						<div class="flex items-center gap-2 mb-1 flex-wrap">
							<span class="text-xs font-medium text-base-content">{m.from}</span>
							<DealPill {deal} fallbackId={m.deal_tag} />
						</div>
						<p class="text-xs text-base-content/85 mb-0.5 break-words">{m.subject}</p>
						<p class="text-xs text-base-content/65 leading-snug break-words">{m.summary}</p>
						{#if m.action}<p class="text-xs text-base-content/85 font-medium mt-1 break-words">→ {m.action}</p>{/if}

						{#snippet trailing()}
							{#if m.url}<ExternalLink href={m.url} label="gmail" />{/if}
						{/snippet}
					</AccentRow>
				{/each}
			</ul>
		</div>
	{/if}
	{#if fyi.length > 0}
		<div>
			<div class="text-xs uppercase tracking-wider text-base-content/50 font-semibold mb-2">FYI</div>
			<ul class="flex flex-col gap-1.5">
				{#each fyi as m}
					{@const deal = dealById(m.deal_tag)}
					<AccentRow accent={rowAccent({ urgency: m.urgency })}>
						<div class="flex items-center gap-2 mb-0.5 flex-wrap">
							<span class="font-medium text-base-content/80">{m.from}</span>
							<span class="text-base-content/50">— {m.subject}</span>
							<DealPill {deal} fallbackId={m.deal_tag} />
						</div>
						<p class="text-xs text-base-content/60 leading-snug break-words">{m.summary}</p>
						{#if m.context}<p class="text-xs text-base-content/50 italic mt-0.5 break-words">{m.context}</p>{/if}

						{#snippet trailing()}
							{#if m.url}<ExternalLink href={m.url} label="gmail" />{/if}
						{/snippet}
					</AccentRow>
				{/each}
			</ul>
		</div>
	{/if}
	{#if email.no_action_summary && !lensActive}
		<p class="text-xs text-base-content/40 italic border-t border-base-content/5 pt-2">
			{email.no_action_summary}
		</p>
	{/if}
</div>
