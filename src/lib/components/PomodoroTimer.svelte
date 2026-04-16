<script lang="ts">
	import { getPomodoroStore } from '$lib/stores/pomodoro.svelte';

	const pomo = getPomodoroStore();

	let showSettings = $state(false);
	let urgent = $derived(pomo.isActive && pomo.timeRemaining <= 30 && pomo.timeRemaining > 0);

	function phaseColor(): string {
		switch (pomo.phase) {
			case 'focus': return 'text-error';
			case 'shortBreak': return 'text-success';
			case 'longBreak': return 'text-info';
			default: return 'text-base-content/40';
		}
	}

	function sessionDots(): string[] {
		const total = pomo.settings.sessionsBeforeLongBreak;
		const done = pomo.completedSessions % total;
		return Array.from({ length: total }, (_, i) => i < done ? 'filled' : 'empty');
	}

	function closeDropdown() {
		const el = document.activeElement as HTMLElement;
		el?.blur();
		showSettings = false;
	}
</script>

<div class="dropdown dropdown-top dropdown-end">
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div
		tabindex="0"
		role="button"
		class="flex items-center gap-1.5 font-mono cursor-pointer select-none transition-colors rounded px-1.5 -mx-1.5 hover:bg-base-content/5 {phaseColor()}"
	>
		{#if pomo.isActive}
			<span class="text-[10px]">{pomo.phase === 'focus' ? '🍅' : '☕'}</span>
			<span class="text-[10px] tracking-wider opacity-70">{pomo.phaseLabel}</span>
			<span
				class="tabular-nums"
				class:pomo-pulse={urgent && pomo.isRunning}
			>{pomo.formattedTime}</span>
		{:else}
			<span class="text-[10px] opacity-50 hover:opacity-100 transition-opacity">🍅</span>
		{/if}
	</div>

	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div
		tabindex="0"
		class="dropdown-content z-50 mb-2 p-0 shadow-xl bg-base-200 border border-base-content/10 rounded-lg w-64 overflow-hidden"
	>
		<!-- Header: session dots -->
		{#if pomo.isActive}
			<div class="flex items-center justify-between px-4 pt-3 pb-1">
				<div class="flex items-center gap-1">
					{#each sessionDots() as dot}
						<span class="text-[8px] {dot === 'filled' ? 'text-error' : 'text-base-content/20'}">●</span>
					{/each}
				</div>
				<span class="text-[10px] font-mono text-base-content/40">
					Session {(pomo.completedSessions % pomo.settings.sessionsBeforeLongBreak) + (pomo.phase === 'focus' ? 1 : 0)}/{pomo.settings.sessionsBeforeLongBreak}
				</span>
			</div>
		{/if}

		<!-- Timer display -->
		<div class="text-center py-3 px-4">
			{#if pomo.isActive}
				<div class="text-[10px] tracking-widest opacity-50 mb-1 {phaseColor()}">{pomo.phaseLabel}</div>
				<div class="text-2xl font-mono tabular-nums {phaseColor()}" class:pomo-pulse={urgent && pomo.isRunning}>
					{pomo.formattedTime}
				</div>
			{:else}
				<div class="text-base-content/50 text-xs">Pomodoro Timer</div>
				<div class="text-base-content/30 text-[10px] mt-1">{pomo.settings.focusMinutes}m focus / {pomo.settings.shortBreakMinutes}m break</div>
			{/if}
		</div>

		<!-- Controls -->
		<div class="flex items-center justify-center gap-2 px-4 pb-3">
			{#if !pomo.isActive}
				<button class="btn btn-xs btn-primary" onclick={() => { pomo.start(); closeDropdown(); }}>
					Start Focus
				</button>
			{:else if pomo.isRunning}
				<button class="btn btn-xs btn-ghost" onclick={pomo.pause}>Pause</button>
				<button class="btn btn-xs btn-ghost" onclick={pomo.skip}>Skip</button>
			{:else if pomo.timeRemaining > 0}
				<button class="btn btn-xs btn-primary" onclick={pomo.resume}>Resume</button>
				<button class="btn btn-xs btn-ghost" onclick={pomo.skip}>Skip</button>
			{:else}
				<!-- Phase just completed, waiting for manual start -->
				<button class="btn btn-xs btn-primary" onclick={pomo.resume}>Continue</button>
			{/if}
			{#if pomo.isActive}
				<button class="btn btn-xs btn-ghost text-base-content/40" onclick={() => { pomo.reset(); closeDropdown(); }}>Reset</button>
			{/if}
		</div>

		<!-- Divider + Settings toggle -->
		<div class="border-t border-base-content/5">
			<button
				class="w-full text-left px-4 py-2 text-[10px] text-base-content/40 hover:text-base-content/60 hover:bg-base-content/5 transition-colors flex items-center gap-1.5"
				onclick={() => showSettings = !showSettings}
			>
				<span class="text-[10px]">{showSettings ? '▾' : '▸'}</span>
				Customize
			</button>
		</div>

		<!-- Settings panel -->
		{#if showSettings}
			<div class="px-4 pb-3 space-y-2 border-t border-base-content/5 pt-2">
				<label class="flex items-center justify-between text-[11px] text-base-content/60">
					<span>Focus</span>
					<div class="flex items-center gap-1">
						<input
							type="number"
							min="1"
							max="120"
							value={pomo.settings.focusMinutes}
							onchange={(e) => pomo.updateSettings({ focusMinutes: Number(e.currentTarget.value) })}
							class="input input-xs w-14 text-center bg-base-300/50 font-mono tabular-nums"
						/>
						<span class="text-base-content/30">min</span>
					</div>
				</label>
				<label class="flex items-center justify-between text-[11px] text-base-content/60">
					<span>Short break</span>
					<div class="flex items-center gap-1">
						<input
							type="number"
							min="1"
							max="60"
							value={pomo.settings.shortBreakMinutes}
							onchange={(e) => pomo.updateSettings({ shortBreakMinutes: Number(e.currentTarget.value) })}
							class="input input-xs w-14 text-center bg-base-300/50 font-mono tabular-nums"
						/>
						<span class="text-base-content/30">min</span>
					</div>
				</label>
				<label class="flex items-center justify-between text-[11px] text-base-content/60">
					<span>Long break</span>
					<div class="flex items-center gap-1">
						<input
							type="number"
							min="1"
							max="60"
							value={pomo.settings.longBreakMinutes}
							onchange={(e) => pomo.updateSettings({ longBreakMinutes: Number(e.currentTarget.value) })}
							class="input input-xs w-14 text-center bg-base-300/50 font-mono tabular-nums"
						/>
						<span class="text-base-content/30">min</span>
					</div>
				</label>
				<label class="flex items-center justify-between text-[11px] text-base-content/60">
					<span>Sessions</span>
					<input
						type="number"
						min="1"
						max="12"
						value={pomo.settings.sessionsBeforeLongBreak}
						onchange={(e) => pomo.updateSettings({ sessionsBeforeLongBreak: Number(e.currentTarget.value) })}
						class="input input-xs w-14 text-center bg-base-300/50 font-mono tabular-nums"
					/>
				</label>
				<div class="pt-1 space-y-1.5">
					<label class="flex items-center gap-2 text-[11px] text-base-content/60 cursor-pointer">
						<input
							type="checkbox"
							checked={pomo.settings.autoStartBreaks}
							onchange={(e) => pomo.updateSettings({ autoStartBreaks: e.currentTarget.checked })}
							class="checkbox checkbox-xs"
						/>
						Auto-start breaks
					</label>
					<label class="flex items-center gap-2 text-[11px] text-base-content/60 cursor-pointer">
						<input
							type="checkbox"
							checked={pomo.settings.autoStartFocus}
							onchange={(e) => pomo.updateSettings({ autoStartFocus: e.currentTarget.checked })}
							class="checkbox checkbox-xs"
						/>
						Auto-start focus
					</label>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	@keyframes pomo-pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}
	.pomo-pulse {
		animation: pomo-pulse 1s ease-in-out infinite;
	}
</style>
