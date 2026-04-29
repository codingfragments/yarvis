<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		checked: boolean;
		onChange: (v: boolean) => void;
		hint?: Snippet;
	}

	let { label, checked, onChange, hint }: Props = $props();
</script>

<div class="form-control">
	<label class="label cursor-pointer justify-start gap-3">
		<input
			type="checkbox"
			class="toggle toggle-primary toggle-sm"
			{checked}
			onchange={(e) => onChange(e.currentTarget.checked)}
		/>
		<span class="label-text">{label}</span>
	</label>
	{#if hint}
		<div class="label pt-0">
			<span class="label-text-alt text-base-content/30">{@render hint()}</span>
		</div>
	{/if}
</div>
