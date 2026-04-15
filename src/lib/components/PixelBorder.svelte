<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		color?: string;
		class?: string;
		children: Snippet;
	}

	let { color = 'oklch(var(--p))', class: className = '', children }: Props = $props();
</script>

<div
	class="relative {className}"
	style="
		box-shadow:
			4px 0 0 0 {color},
			-4px 0 0 0 {color},
			0 4px 0 0 {color},
			0 -4px 0 0 {color},
			2px 2px 0 0 {color},
			-2px 2px 0 0 {color},
			2px -2px 0 0 {color},
			-2px -2px 0 0 {color};
	"
>
	{@render children()}
</div>
