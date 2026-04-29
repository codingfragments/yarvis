<script lang="ts">
	import { uid } from '$lib/util/uid';

	interface Props {
		label: string;
		display: string;
		value: number;
		min: number;
		max: number;
		step?: number;
		disabled?: boolean;
		onChange: (v: number) => void;
	}

	let { label, display, value, min, max, step = 1, disabled = false, onChange }: Props = $props();
	const id = uid('settings-range');
</script>

<div class="form-control" class:opacity-40={disabled}>
	<label class="label" for={id}>
		<span class="label-text">{label}</span>
		<span class="label-text-alt text-base-content/40">{display}</span>
	</label>
	<input
		{id}
		type="range"
		{min}
		{max}
		{step}
		{value}
		{disabled}
		class="range range-primary range-xs"
		oninput={(e) => onChange(parseFloat(e.currentTarget.value))}
	/>
</div>
