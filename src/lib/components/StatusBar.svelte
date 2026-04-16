<script lang="ts">
	import PomodoroTimer from './PomodoroTimer.svelte';

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

<footer class="fixed bottom-0 left-0 right-0 bg-base-200/60 backdrop-blur-sm border-t border-base-content/5 px-4 py-1 z-40">
	<div class="flex items-center justify-between text-[11px] text-base-content/40">
		<div class="flex items-center gap-2">
			<span class="text-success text-[8px]">●</span>
			<span class="font-mono">Yarvis v{version}</span>
			<span class="text-base-content/20">·</span>
			<span class="font-mono">{status}</span>
			<span class="blink-cursor text-primary/40"></span>
		</div>
		<div class="flex items-center gap-2">
			<PomodoroTimer />
			<span class="font-mono">{time}</span>
		</div>
	</div>
</footer>
