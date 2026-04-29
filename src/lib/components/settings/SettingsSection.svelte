<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		actions?: Snippet;
		children: Snippet;
	}

	let { title, actions, children }: Props = $props();
</script>

<section class="rounded-xl bg-base-200/40 border border-base-content/5 p-5 flex flex-col gap-4">
	<div class="flex items-center justify-between">
		<h2 class="text-xs font-semibold uppercase tracking-wider text-base-content/50">{title}</h2>
		{#if actions}{@render actions()}{/if}
	</div>
	{@render children()}
</section>
