<script lang="ts">
	import PomodoroTimer from './PomodoroTimer.svelte';
	import { getRefreshStore } from '$lib/stores/refresh.svelte';
	import { getSettingsStore } from '$lib/stores/settings.svelte';

	interface Props {
		version?: string;
		status?: string;
	}

	let { version = '0.1.0', status = 'READY' }: Props = $props();

	let time = $state(new Date().toLocaleTimeString('en-US', { hour12: false }));
	let now = $state(Date.now());

	const refresh = getRefreshStore();
	const settings = getSettingsStore();

	$effect(() => {
		const interval = setInterval(() => {
			time = new Date().toLocaleTimeString('en-US', { hour12: false });
			now = Date.now();
		}, 1000);
		return () => clearInterval(interval);
	});

	function ageLabel(at: Date | null): string {
		if (!at) return 'never';
		const sec = Math.max(0, Math.round((now - at.getTime()) / 1000));
		if (sec < 10) return 'just now';
		if (sec < 60) return `${sec}s ago`;
		const min = Math.floor(sec / 60);
		if (min < 60) return `${min}m ago`;
		const h = Math.floor(min / 60);
		const m = min % 60;
		return m === 0 ? `${h}h ago` : `${h}h ${m}m ago`;
	}

	const refreshLabel = $derived(
		refresh.running
			? '↻ refreshing…'
			: settings.current.auto_refresh_enabled
				? `↻ ${ageLabel(refresh.lastTickAt)}`
				: '↻ paused'
	);

	const refreshTitle = $derived(
		settings.current.auto_refresh_enabled
			? `Auto-refresh every ${settings.current.auto_refresh_interval_minutes}m · click or ⌘R to refresh now`
			: 'Auto-refresh disabled · click or ⌘R to refresh now'
	);
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
			<button
				type="button"
				class="font-mono text-base-content/40 hover:text-primary transition-colors"
				class:text-primary={refresh.running}
				class:animate-pulse={refresh.running}
				title={refreshTitle}
				onclick={() => void refresh.triggerNow()}
			>
				{refreshLabel}
			</button>
			<span class="text-base-content/20">·</span>
			<PomodoroTimer />
			<span class="font-mono">{time}</span>
		</div>
	</div>
</footer>
