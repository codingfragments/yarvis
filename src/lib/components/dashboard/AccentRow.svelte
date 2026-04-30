<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		accent: string;
		tag?: 'li' | 'div';
		dim?: boolean;
		strike?: boolean;
		leading?: Snippet;
		trailing?: Snippet;
		children: Snippet;
	}

	let {
		accent,
		tag = 'li',
		dim = false,
		strike = false,
		leading,
		trailing,
		children
	}: Props = $props();
</script>

{#if tag === 'li'}
	<li
		class="flex items-stretch gap-3 rounded-lg border-l-2 {accent} bg-base-100/30 pl-3 pr-2 py-2 text-xs"
		class:opacity-50={dim && strike}
		class:opacity-70={dim && !strike}
		class:line-through={strike}
	>
		{#if leading}{@render leading()}{/if}
		<div class="flex-1 min-w-0">
			{@render children()}
		</div>
		{#if trailing}<div class="flex items-start gap-1 shrink-0 pt-0.5">{@render trailing()}</div>{/if}
	</li>
{:else}
	<div
		class="flex items-stretch gap-3 rounded-lg border-l-2 {accent} bg-base-100/30 pl-3 pr-2 py-2 text-xs"
		class:opacity-50={dim && strike}
		class:opacity-70={dim && !strike}
		class:line-through={strike}
	>
		{#if leading}{@render leading()}{/if}
		<div class="flex-1 min-w-0">
			{@render children()}
		</div>
		{#if trailing}<div class="flex items-start gap-1 shrink-0 pt-0.5">{@render trailing()}</div>{/if}
	</div>
{/if}
