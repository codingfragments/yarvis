<script lang="ts">
	interface Props {
		value: string;
		oninput: (value: string) => void;
	}

	let { value, oninput }: Props = $props();
</script>

<div class="relative w-full max-w-md mx-auto">
	<span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/30 text-sm">🔍</span>
	<input
		type="text"
		{value}
		oninput={(e) => oninput(e.currentTarget.value)}
		placeholder="Search tools..."
		class="input input-bordered w-full pl-10 bg-base-200/40 backdrop-blur-sm text-sm
			focus:outline-none focus:ring-2 focus:ring-primary/20"
	/>
	<kbd class="kbd kbd-sm absolute right-3 top-1/2 -translate-y-1/2 text-base-content/25 text-[10px]">⌘K</kbd>
</div>
