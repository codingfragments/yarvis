# Pomodoro Timer — Status Bar Feature

## Context

Add a Pomodoro timer that lives in the Yarvis status bar. When inactive, it's a subtle tomato icon. When active, it shows a live countdown. A click-to-open popover provides controls and customization — easy to use, fun to tweak.

## Design

### UX Flow

```
Status bar (inactive):  [● Yarvis v0.1.0 · READY_]  [🍅]  [14:32:05]
Status bar (focus):     [● Yarvis v0.1.0 · READY_]  [🍅 FOCUS 22:15]  [14:32:05]
Status bar (break):     [● Yarvis v0.1.0 · READY_]  [☕ BREAK 04:30]  [14:32:05]
```

- Click the timer area → popover opens with start/pause/skip/reset + settings
- Timer text pulses gently during the last 30 seconds
- Phase changes get a brief color flash on the status bar segment
- Session dots (●●●○) show progress toward long break

### Popover Contents

```
┌─────────────────────────┐
│  ● ● ● ○  Session 3/4  │
│                         │
│     FOCUS  22:15        │
│                         │
│  [⏸ Pause] [⏭ Skip]   │
│  [↺ Reset]              │
│─────────────────────────│
│  ⚙ Customize            │
│  Focus:   [25] min      │
│  Short:   [ 5] min      │
│  Long:    [15] min      │
│  Sessions: [4]          │
│  □ Auto-start breaks    │
│  □ Auto-start focus     │
└─────────────────────────┘
```

## Files to Create/Modify

### New Files

1. **`src/lib/stores/pomodoro.svelte.ts`** — Timer store
   - State: `idle | focus | shortBreak | longBreak`
   - `timeRemaining` (seconds), `sessionCount`, `isRunning`
   - Preferences: durations, auto-start flags, sessions before long break
   - Methods: `start()`, `pause()`, `resume()`, `skip()`, `reset()`
   - Persist preferences to `localStorage` (no Rust backend needed)
   - `$effect` for the 1-second countdown interval
   - Follow existing store pattern: `getPomodoroStore()` with getters + methods

2. **`src/lib/components/PomodoroTimer.svelte`** — Status bar widget
   - Compact inline display (icon + phase label + countdown)
   - Click opens a DaisyUI dropdown/popover
   - Controls: start, pause, skip phase, reset
   - Customize section: number inputs for durations, checkbox toggles
   - Session progress dots
   - Subtle animations: pulse on last 30s, color transitions between phases
   - Uses Catppuccin/DaisyUI colors: `text-error` for focus (red/tomato), `text-success` for break

### Modified Files

3. **`src/lib/components/StatusBar.svelte`** — Add PomodoroTimer between status and clock
   - Import and place `<PomodoroTimer />` component
   - Minimal change: just slot it into the flex layout

4. **`src/lib/types/index.ts`** — Add `PomodoroSettings` and `PomodoroPhase` types

## Implementation Order

1. Types (`PomodoroPhase`, `PomodoroSettings`)
2. Store (`pomodoro.svelte.ts`) — all timer logic + localStorage persistence
3. Component (`PomodoroTimer.svelte`) — UI widget with popover
4. StatusBar integration — drop component in
5. Polish animations (pulse, color transitions)

## Key Decisions

- **No Rust backend** — timer is pure frontend, preferences in `localStorage`
- **Popover, not a page** — keeps it lightweight and always accessible
- **DaisyUI dropdown** — consistent with app styling, no extra deps
- **localStorage** — simplest persistence; could migrate to settings later if needed

## Verification

1. `bun run tauri:dev` — open the app
2. Click tomato icon → popover opens with defaults (25/5/15/4)
3. Start a focus session → countdown runs in status bar
4. Let it complete → auto-transitions to break (if auto-start enabled) or shows notification state
5. Skip/pause/reset all work correctly
6. Change durations in customize → values persist across app restart
7. Complete 4 focus sessions → triggers long break instead of short break
8. `bun run check` — no TypeScript errors
