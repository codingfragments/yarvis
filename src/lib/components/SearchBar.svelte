<script lang="ts">
	interface Props {
		value: string;
		oninput: (value: string) => void;
		pixelFont?: boolean;
	}

	let { value, oninput, pixelFont = false }: Props = $props();
</script>

<div class="relative w-full max-w-md mx-auto">
	<span class="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40">🔍</span>
	<input
		type="text"
		{value}
		oninput={(e) => oninput(e.currentTarget.value)}
		placeholder="Search tools..."
		class="input input-bordered w-full pl-12 bg-base-200/50 backdrop-blur-sm
			{pixelFont ? 'font-pixel text-[10px] placeholder:font-pixel placeholder:text-[10px]' : ''}
			focus:outline-none focus:ring-2 focus:ring-primary/30"
	/>
	<kbd class="kbd kbd-sm absolute right-3 top-1/2 -translate-y-1/2 text-base-content/30">⌘K</kbd>
</div>
