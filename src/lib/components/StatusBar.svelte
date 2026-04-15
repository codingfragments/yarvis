<script lang="ts">
	interface Props {
		version?: string;
		status?: string;
	}

	let { version = '0.1.0', status = 'READY' }: Props = $props();

	let time = $state(new Date().toLocaleTimeString('en-US', { hour12: false }));

	$effect(() => {
		const interval = setInterval(() => {
			time = new Date().toLocaleTimeString('en-US', { hour12: false });
		}, 1000);
		return () => clearInterval(interval);
	});
</script>

<footer class="fixed bottom-0 left-0 right-0 bg-base-300/80 backdrop-blur-sm border-t border-base-content/10 px-4 py-1.5 z-40">
	<div class="flex items-center justify-between font-mono text-[11px] text-base-content/60">
		<div class="flex items-center gap-3">
			<span class="text-success">●</span>
			<span class="font-pixel text-[8px]">YARVIS v{version}</span>
			<span class="text-base-content/30">|</span>
			<span class="font-pixel text-[8px]">{status}</span>
			<span class="blink-cursor"></span>
		</div>
		<div class="font-pixel text-[8px]">
			{time}
		</div>
	</div>
</footer>
