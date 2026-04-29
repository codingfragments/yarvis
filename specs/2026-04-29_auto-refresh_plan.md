# Auto-refresh — plan

Pull fresh data every N minutes in the background, without disrupting the
active UI (no spinners, no resets, no scroll jumps, no focus changes).
Interval and on/off live in Settings.

## Scope

Routes that read from disk-backed JSON/markdown:
- `/` (home `+page.svelte`) — `daily.json` + question status
- `/dashboard` — `daily.json` + config + questions + memory
- `/briefings` — list of dates/files (current selection's markdown stays put)

Out of scope (for now): `/learning` (separate data domain, ask before adding),
`/settings`, `/about`.

## What "no disruption" means

- Do **not** flip `loading = true` during refresh — that re-renders skeletons.
- Do **not** reset `currentDate` / `currentFile` / `sidePanelFile` / scroll
  position / expanded sections / answer-in-progress text.
- Do **not** refresh while a mutation is in flight (`submittingAnswer`,
  `toggleCheckbox`).
- Do **not** refresh while the window is hidden (`document.visibilityState`).
- Updates land via `$state` reassignment — Svelte 5 runes diff the DOM, so
  unchanged sections don't repaint.

## Architecture

### New: `src/lib/stores/refresh.svelte.ts`

Central driver. Singleton.

```ts
type RefreshTarget = {
  id: string;                   // 'home' | 'dashboard' | 'briefings'
  softRefresh: () => Promise<void>;
  isBusy?: () => boolean;       // skip if mutating
};

export function getRefreshStore() {
  return {
    register(target: RefreshTarget): () => void,  // returns unregister
    triggerNow(): Promise<void>,                   // manual refresh
    get lastTickAt(): Date | null,
    get nextTickAt(): Date | null,
    get running(): boolean,
  };
}
```

Started once from `src/routes/+layout.svelte` after settings load:
- Reads `settings.auto_refresh_enabled` + `settings.auto_refresh_interval_minutes`
- `setInterval` at the configured cadence
- On each tick: skip if hidden, skip if any registered target reports busy,
  else `Promise.allSettled` over all `softRefresh()` calls
- Reactive to settings changes ($effect): clear/restart timer when toggled
  or interval edited

### Per-store: add `softRefresh()`

Mirrors `load()` but:
- doesn't set `loading = true`
- doesn't reset selections
- only updates the underlying data fields + `lastLoaded`

`getDashboardStore`:
```ts
async softRefresh(dailyDir, dailySrcDir, briefingsDir) {
  if (submittingAnswer) return;          // self-guard
  const [b, c, q] = await Promise.allSettled([...]);
  if (b.status === 'fulfilled') briefing = b.value;
  if (c.status === 'fulfilled') config = c.value;
  if (q.status === 'fulfilled') questions = q.value;
  lastLoaded = new Date();
  // do NOT touch `error` — keep last good state visible
}
```

`getBriefingsStore`:
- Re-scan `dates` and `files` (preserving `currentDate` / `currentFile`).
- Only re-read `rawMarkdown` if its underlying file's `mtime` changed
  (cheap stat). Otherwise leave it alone — opening markdown re-renders.
- Skip entirely if `loading` is already true (initial load racing).

Home `+page.svelte`:
- Refactor inline `load()` to expose a `softRefresh()` analogue, or move
  the home data into a tiny store. Probably simplest: a `softRefresh`
  function wired from the existing `onMount` block.

### Settings additions

`Settings` interface (TS) + Rust default:
```ts
auto_refresh_enabled: boolean;        // default true
auto_refresh_interval_minutes: number; // default 5, min 1, max 60
```

Settings page UI: new section "Auto-refresh"
- Toggle: "Refresh data automatically" (DaisyUI `toggle`)
- Number input: "Refresh every [_] minutes" (1–60), greyed out when off
- Helper text: "Pulls new and updated data without changing the page."

## Files touched

- `src-tauri/src/commands/settings.rs` — extend `Settings` struct + defaults
- `src/lib/types/index.ts` — extend `Settings` interface
- `src/lib/stores/settings.svelte.ts` — `DEFAULT_SETTINGS`
- `src/lib/stores/refresh.svelte.ts` — **new**
- `src/lib/stores/dashboard.svelte.ts` — `softRefresh()`
- `src/lib/stores/briefings.svelte.ts` — `softRefresh()`
- `src/routes/+layout.svelte` — wire driver, register, dispose
- `src/routes/+page.svelte` — softRefresh on tick (or move data into store)
- `src/routes/dashboard/+page.svelte` — register with driver on mount
- `src/routes/briefings/+page.svelte` — register with driver on mount
- `src/routes/settings/+page.svelte` — UI for new settings

## Build sequence

1. Settings struct + defaults (Rust + TS) — wire through, no UI yet
2. `refresh.svelte.ts` driver
3. `softRefresh()` on dashboard store + register from `/dashboard`
4. `softRefresh()` on briefings store + register from `/briefings`
5. Home page softRefresh
6. Settings page UI
7. Manual smoke test: `tauri:dev`, open dashboard, edit `~/.yarvis/...`,
   verify update appears without spinner / without losing selection

## Decisions

1. **Default**: on, 5 minutes.
2. **Indicator**: tiny status-bar dot in the footer — `↻ 2m ago` / `↻ refreshing…`,
   click to refresh now.
3. **Window hidden**: pause while hidden; refresh once on focus return, then
   resume the schedule.
4. **Manual trigger**: ⌘R + footer button. Intercept the keypress and
   prevent the webview reload (production already won't reload on ⌘R; dev
   mode behavior documented as a known caveat).
5. **Briefings markdown re-read**: stat-and-skip — soft refresh re-reads the
   selected file only when its mtime changed. Avoids flicker on the rendered
   markdown.
