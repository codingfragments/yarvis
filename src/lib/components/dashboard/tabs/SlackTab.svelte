<script lang="ts">
	import type { ActiveDealDef, SlackChannel, SlackSection } from '$lib/types';
	import DealPill from '../DealPill.svelte';
	import ExternalLink from '../ExternalLink.svelte';

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
		<p class="text-xs text-base-content/40 italic">
			{lensActive ? `No slack channels for ${lensName}.` : 'No slack activity.'}
		</p>
	{/if}
	<ul class="flex flex-col gap-3">
		{#each channels as ch}
			{@const deal = dealById(ch.deal_tag)}
			<li class="rounded-lg bg-base-100/30 border border-base-content/5 p-3">
				<div class="flex items-center gap-2 mb-2 flex-wrap">
					<span class="text-xs font-mono font-medium text-base-content/85">{ch.channel_name}</span>
					<DealPill {deal} fallbackId={ch.deal_tag} />
					<span
						class="text-xs uppercase tracking-wider rounded-full px-1.5 py-0.5"
						class:bg-success={ch.activity_level === 'high'}
						class:bg-warning={ch.activity_level === 'medium'}
						class:bg-base-300={ch.activity_level === 'low' || ch.activity_level === 'quiet'}
						class:text-success-content={ch.activity_level === 'high'}
						class:text-warning-content={ch.activity_level === 'medium'}
					>
						{ch.activity_level}
					</span>
					{#if ch.url}<ExternalLink href={ch.url} label="open" />{/if}
				</div>
				{#if ch.messages.length === 0}
					<p class="text-xs text-base-content/40">No messages.</p>
				{:else}
					<ul class="flex flex-col gap-1.5">
						{#each ch.messages as msg}
							<li class="text-xs border-l border-base-content/10 pl-2.5">
								<div class="flex items-center gap-1.5 mb-0.5">
									{#if msg.author}<span class="font-medium text-base-content/80">{msg.author}</span>{/if}
									{#if msg.timestamp}<span class="text-base-content/40 text-xs">{msg.timestamp.slice(11, 16)}</span>{/if}
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
			</li>
		{/each}
	</ul>
	{#if !lensActive && slack.dms.length > 0}
		<div>
			<div class="text-xs uppercase tracking-wider text-base-content/50 font-semibold mb-2">DMs</div>
			<ul class="flex flex-col gap-1.5">
				{#each slack.dms as dm}
					<li class="rounded-lg bg-base-100/30 px-3 py-2 text-xs">
						<div class="flex items-center gap-2 mb-0.5">
							<span class="font-medium text-base-content/80">{dm.with}</span>
							{#if dm.url}<ExternalLink href={dm.url} label="open" />{/if}
						</div>
						<p class="text-xs text-base-content/60 break-words">{dm.summary}</p>
						{#if dm.action}<p class="text-xs text-base-content/85 font-medium mt-0.5 break-words">→ {dm.action}</p>{/if}
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
