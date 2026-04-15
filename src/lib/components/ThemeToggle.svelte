<script lang="ts">
	type ThemeMode = 'dark' | 'light' | 'auto';

	interface Props {
		value: ThemeMode;
		onchange: (mode: ThemeMode) => void;
		pixelFont?: boolean;
	}

	let { value, onchange, pixelFont = false }: Props = $props();

	const modes: { mode: ThemeMode; icon: string; label: string }[] = [
		{ mode: 'dark', icon: '🌙', label: 'Dark' },
		{ mode: 'light', icon: '☀️', label: 'Light' },
		{ mode: 'auto', icon: '💻', label: 'Auto' }
	];

	function cycle() {
		const idx = modes.findIndex((m) => m.mode === value);
		const next = modes[(idx + 1) % modes.length];
		onchange(next.mode);
	}

	const current = $derived(modes.find((m) => m.mode === value)!);
</script>

<button
	onclick={cycle}
	class="btn btn-ghost btn-sm gap-1 {pixelFont ? 'font-pixel text-[8px]' : 'text-xs'}"
	title="Theme: {current.label}"
>
	<span class="text-lg">{current.icon}</span>
	<span class="hidden sm:inline">{current.label}</span>
</button>
