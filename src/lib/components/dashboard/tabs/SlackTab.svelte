<script lang="ts">
	import type { ActiveDealDef, SlackChannel, SlackSection } from '$lib/types';
	import AccentRow from '../AccentRow.svelte';
	import Chip from '../Chip.svelte';
	import EmptyState from '../EmptyState.svelte';
	import ExternalLink from '../ExternalLink.svelte';
	import { activityTone, fmtClock, rowAccent } from '$lib/dashboard/format';

	interface Props {
		slack: SlackSection;
		channels: SlackChannel[];
		lensActive: boolean;
		lensName: string | null;
		dealById: (id: string | null | undefined) => ActiveDealDef | null;
	}

	let { slack, channels, lensActive, lensName, dealById }: Props = $props();
</script>

<div class="flex flex-col gap-3">
	{#if slack.since && !lensActive}
		<p class="text-xs text-base-content/50">Since {slack.since}</p>
	{/if}
	{#if channels.length === 0}
		<EmptyState items="slack channels" {lensActive} {lensName} fallback="No slack activity." />
	{/if}
	<ul class="flex flex-col gap-3">
		{#each channels as ch}
			{@const deal = dealById(ch.deal_tag)}
			<AccentRow accent={rowAccent({ activityLevel: ch.activity_level })}>
				<div class="flex items-center gap-2 mb-2 flex-wrap">
					<span class="text-xs font-mono font-medium text-base-content/85">{ch.channel_name}</span>
					<Chip {deal} fallbackId={ch.deal_tag} />
					<Chip variant="status" tone={activityTone(ch.activity_level)} labelOverride={ch.activity_level} />
				</div>
				{#if ch.messages.length === 0}
					<EmptyState message="No messages." />
				{:else}
					<ul class="flex flex-col gap-1.5">
						{#each ch.messages as msg}
							<li class="text-xs border-l border-base-content/10 pl-2.5">
								<div class="flex items-center gap-1.5 mb-0.5">
									{#if msg.author}<span class="font-medium text-base-content/80">{msg.author}</span>{/if}
									{#if msg.timestamp}<span class="text-base-content/40 text-xs">{fmtClock(msg.timestamp)}</span>{/if}
								</div>
								<p class="text-base-content/65 leading-snug break-words">{msg.summary}</p>
								{#if msg.links.length > 0}
									<div class="flex flex-wrap gap-1 mt-1">
										{#each msg.links as l}<ExternalLink href={l.url} label={l.label} />{/each}
									</div>
								{/if}
								{#if msg.action}<p class="text-base-content/85 font-medium mt-0.5 break-words">→ {msg.action}</p>{/if}
							</li>
						{/each}
					</ul>
				{/if}

				{#snippet trailing()}
					{#if ch.url}<ExternalLink href={ch.url} label="open" />{/if}
				{/snippet}
			</AccentRow>
		{/each}
	</ul>
	{#if !lensActive && slack.dms.length > 0}
		<div>
			<div class="text-xs uppercase tracking-wider text-base-content/50 font-semibold mb-2">DMs</div>
			<ul class="flex flex-col gap-1.5">
				{#each slack.dms as dm}
					<AccentRow accent="border-l-base-content/30">
						<div class="flex items-center gap-2 mb-0.5">
							<span class="font-medium text-base-content/80">{dm.with}</span>
						</div>
						<p class="text-xs text-base-content/60 break-words">{dm.summary}</p>
						{#if dm.action}<p class="text-xs text-base-content/85 font-medium mt-0.5 break-words">→ {dm.action}</p>{/if}

						{#snippet trailing()}
							{#if dm.url}<ExternalLink href={dm.url} label="open" />{/if}
						{/snippet}
					</AccentRow>
				{/each}
			</ul>
		</div>
	{/if}
</div>
