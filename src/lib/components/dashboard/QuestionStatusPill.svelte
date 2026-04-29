<script lang="ts">
	interface Props {
		status: string;
		size?: 'sm' | 'md';
	}

	let { status, size = 'sm' }: Props = $props();

	const meta = $derived.by(() => {
		switch (status) {
			case 'PENDING':
				return { label: 'pending', tone: 'bg-warning/15 text-warning border-warning/30' };
			case 'ANSWERED':
				return { label: 'answered', tone: 'bg-success/15 text-success border-success/30' };
			case 'PROCESSED':
				return { label: 'processed', tone: 'bg-base-300/60 text-base-content/50 border-base-content/10' };
			default:
				return { label: status.toLowerCase(), tone: 'bg-base-300 text-base-content/60 border-base-content/10' };
		}
	});

	const sizeClass = $derived(size === 'md' ? 'text-xs px-2 py-0.5' : 'text-[10px] px-1.5 py-0.5');
</script>

<span
	class="inline-flex items-center rounded-full border font-mono uppercase tracking-wider {sizeClass} {meta.tone}"
>
	{meta.label}
</span>
