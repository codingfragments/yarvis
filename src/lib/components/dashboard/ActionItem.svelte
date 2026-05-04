<script lang="ts">
	import type { ActionItem, ActiveDealDef } from '$lib/types';
	import AccentRow from './AccentRow.svelte';
	import Chip from './Chip.svelte';
	import ExternalLink from './ExternalLink.svelte';
	import { rowAccent } from '$lib/dashboard/format';
	import { getDashboardStore } from '$lib/stores/dashboard.svelte';
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import { sendActionToThings } from '$lib/services/things';

	interface Props {
		action: ActionItem;
		deal: ActiveDealDef | null;
		compact?: boolean;
		onToggle?: (action: ActionItem, done: boolean) => void;
	}

	let { action: a, deal, compact = false, onToggle }: Props = $props();

	const dashboard = getDashboardStore();
	const settings = getSettingsStore();
	const accent = $derived(rowAccent({ urgency: a.priority }));

	let toggling = $state(false);
	let sending = $state(false);
	let lastResult = $state<'created' | 'exists' | null>(null);
	let resultTimer: ReturnType<typeof setTimeout> | null = null;

	async function toggleDone() {
		if (toggling) return;
		const next = !a.done;
		toggling = true;
		// Notify parent first so it can populate hide-grace state before the
		// store's optimistic mutation flips a.done — otherwise the derived
		// briefly sees done=true with no grace entry and reflows the list.
		onToggle?.(a, next);
		try {
			await dashboard.setActionDone(settings.current.daily_dir, a, next);
		} catch (err) {
			console.error('Failed to toggle action done:', err);
			onToggle?.(a, !next);
		} finally {
			toggling = false;
		}
	}

	async function onThings() {
		if (sending) return;
		sending = true;
		try {
			const res = await sendActionToThings(a);
			lastResult = res.status;
			if (resultTimer) clearTimeout(resultTimer);
			resultTimer = setTimeout(() => {
				lastResult = null;
				resultTimer = null;
			}, 2000);
		} catch (err) {
			console.error('Failed to send to Things:', err);
		} finally {
			sending = false;
		}
	}
</script>

<AccentRow {accent} dim={a.done} strike={a.done}>
	{#snippet leading()}
		<input
			type="checkbox"
			class="checkbox checkbox-xs mt-0.5 shrink-0"
			checked={a.done}
			disabled={toggling}
			onchange={toggleDone}
			aria-label={a.done ? 'Mark as not done' : 'Mark as done'}
		/>
	{/snippet}

	<div class="flex flex-col gap-1">
		<p class="text-base-content/85 leading-snug break-words">{a.text}</p>
		<div class="flex items-center gap-1.5 flex-wrap text-xs text-base-content/50">
			<Chip {deal} fallbackId={a.deal_tag} />
			{#if a.deadline}<span class="font-mono">⏰ {a.deadline}</span>{/if}
			{#if !compact && a.source_type}<span class="opacity-60">· {a.source_type}</span>{/if}
		</div>
	</div>

	{#snippet trailing()}
		<div class="flex flex-col items-end gap-1">
			<button
				type="button"
				class="inline-flex items-center gap-1 rounded-full transition-colors px-2 py-0.5 text-xs disabled:opacity-50 {lastResult ===
				'created'
					? 'bg-success/20 text-success'
					: lastResult === 'exists'
						? 'bg-info/20 text-info'
						: 'bg-base-300/50 hover:bg-base-300 text-base-content/70 hover:text-base-content'}"
				title={lastResult === 'created'
					? 'Sent to Things'
					: lastResult === 'exists'
						? 'Already in Things'
						: 'Send to Things'}
				disabled={sending}
				onclick={onThings}
			>
				<span aria-hidden="true"
					>{lastResult === 'created' ? '✓' : lastResult === 'exists' ? '✓' : '📋'}</span
				>
				<span
					>{lastResult === 'created'
						? 'Sent'
						: lastResult === 'exists'
							? 'In Things'
							: 'Things'}</span
				>
			</button>
			{#if a.url}<ExternalLink href={a.url} label="open" />{/if}
		</div>
	{/snippet}
</AccentRow>
