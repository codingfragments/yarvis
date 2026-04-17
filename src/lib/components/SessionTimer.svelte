<script lang="ts">
	interface Props {
		timeString: string;
	}

	let { timeString }: Props = $props();

	// Parse minutes from strings like "45 minutes", "20 min", "45 minutes | Level: ..."
	function parseMinutes(s: string): number {
		const match = s.match(/(\d+)\s*min/i);
		return match ? parseInt(match[1]) : 0;
	}

	let totalMinutes = $derived(parseMinutes(timeString));
	let secondsRemaining = $state(0);
	let isRunning = $state(false);
	let intervalId: ReturnType<typeof setInterval> | null = null;

	function start() {
		if (totalMinutes <= 0) return;
		secondsRemaining = totalMinutes * 60;
		isRunning = true;
		intervalId = setInterval(() => {
			secondsRemaining--;
			if (secondsRemaining <= 0) {
				stop();
			}
		}, 1000);
	}

	function stop() {
		isRunning = false;
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = null;
		}
	}

	function reset() {
		stop();
		secondsRemaining = 0;
	}

	const display = $derived.by(() => {
		const m = Math.floor(secondsRemaining / 60);
		const s = secondsRemaining % 60;
		return `${m}:${s.toString().padStart(2, '0')}`;
	});

	const progress = $derived(
		totalMinutes > 0 && secondsRemaining > 0
			? Math.round(((totalMinutes * 60 - secondsRemaining) / (totalMinutes * 60)) * 100)
			: 0
	);
</script>

{#if totalMinutes > 0}
	<div class="flex items-center gap-2">
		{#if isRunning}
			<div class="flex items-center gap-1.5 bg-base-200/60 rounded-full px-2.5 py-1 border border-base-content/5">
				<div class="radial-progress text-primary" style="--value:{progress}; --size:1rem; --thickness:2px;" role="progressbar"></div>
				<span class="text-xs font-mono text-base-content/70">{display}</span>
				<button
					class="text-[10px] text-base-content/40 hover:text-base-content/70 transition-colors"
					onclick={reset}
					title="Stop timer"
				>✕</button>
			</div>
		{:else}
			<button
				class="flex items-center gap-1 text-xs text-base-content/40 hover:text-base-content/60 transition-colors"
				onclick={start}
				title="Start session timer ({totalMinutes} min)"
			>
				<span>⏱</span>
				<span>{totalMinutes} min</span>
			</button>
		{/if}
	</div>
{/if}
