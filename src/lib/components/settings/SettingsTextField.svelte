<script lang="ts">
	import type { Snippet } from 'svelte';
	import { uid } from '$lib/util/uid';

	interface Props {
		label: string;
		value: string;
		onChange: (v: string) => void;
		hint?: Snippet;
		mono?: boolean;
	}

	let { label, value, onChange, hint, mono = true }: Props = $props();
	const id = uid('settings-text');
</script>

<div class="form-control">
	<label class="label" for={id}>
		<span class="label-text">{label}</span>
	</label>
	<input
		{id}
		type="text"
		class="input input-bordered input-sm w-full text-sm"
		class:font-mono={mono}
		{value}
		oninput={(e) => onChange(e.currentTarget.value)}
	/>
	{#if hint}
		<div class="label pt-0">
			<span class="label-text-alt text-base-content/30">{@render hint()}</span>
		</div>
	{/if}
</div>
