# Action check-off — plan

## Goal
Let the user mark dashboard action items as `done` from Yarvis and have that state survive the next briefing run, with sensible filtering on the two surfaces (home widget vs. dashboard sidebar) and an undo grace window so a misclick doesn't immediately hide the row.

## Approach (chosen)
**Trust the script.** The briefing skill's merge algorithm preserves `done` across runs by matching on `fingerprint`. So Yarvis writes `done: true` (and `completed_at`) directly back into `daily.json`. No separate state file.

## Constraints
- Today's `daily.json` already carries `fingerprint`, `created_at`, `completed_at` on action items (verified). The Yarvis Rust struct + TS interface drop them silently — must round-trip them.
- The producer can rewrite `daily.json` at any time. Use atomic write (tmp + rename) to avoid torn writes.
- Use `serde_json::Value` on the write path so we don't drop fields the schema gains in future without a Yarvis update.
- Match by `fingerprint` first; fall back to `id` (positional but unique within a run).
- Home page and dashboard each hold their own `briefing` `$state` — the store's optimistic mutation must hit the *passed-in proxy* so whichever view the user clicked from reacts immediately.

## Design

### Types + persistence
- `src-tauri/src/commands/dashboard.rs`: extend `ActionItem` with `fingerprint`, `created_at`, `completed_at` (all `Option<String>`, `#[serde(default)]`).
- New command `set_action_done(daily_dir, fingerprint, id, done) -> Result<(), String>`:
  - Read `daily.json` as `serde_json::Value` (preserve unknown fields).
  - Find entry in `action_items[]` by `fingerprint` (preferred) or `id` (fallback).
  - Mutate `done` and set `completed_at = now` (RFC 3339 with offset) when true, `null` when false.
  - Write atomically: `daily.json.tmp` → rename.
- TS interface in `src/lib/types/index.ts` mirrored.

### Frontend service + store
- `src/lib/services/dashboard.ts`: `setActionDone(dailyDir, fingerprint, id, done)`.
- `src/lib/stores/dashboard.svelte.ts`: `async setActionDone(dailyDir, action, done)`:
  - Mutates the passed-in `action` proxy directly so the caller's view reacts.
  - Mirrors the change into the store's own briefing if loaded (so /dashboard stays in sync without waiting for the next softRefresh).
  - Rolls both back on backend error.

### UI — ActionItem
- Leading checkbox (daisyUI `checkbox checkbox-xs`) wired to `dashboard.setActionDone`.
- `dim={a.done}` + `strike={a.done}` on `AccentRow` for visual state.
- Optional `onToggle?: (action, done) => void` callback fired *before* the await on the store, so parents can install hide-grace state synchronously, ahead of the optimistic `a.done` mutation. Inverse callback on error for rollback.

### Sidebar — "Open only" filter (off by default)
- Header toggle in `DashboardSidebar.svelte` via `SectionCard`'s `actions` snippet.
- Filtered `visibleActions` $derived; count reflects filtered length; empty-state copy switches to "All actions done — nice." when the filter is what's emptying the list.
- Items keyed by `fingerprint ?? id` so component identity is stable across the toggle.

### Home widget — always-hide-done with grace period
- `topActions` filter: `!a.done || pendingHide.has(actionKey(a))`.
- Grace mechanism in `routes/+page.svelte`:
  - Plain `Set<string>` for keys, plain `Map<string, timeout>` for cancellation, single `pendingHideVersion` $state counter for reactivity (read first inside `$derived.by` so the derive subscribes).
  - On click: cancel any existing timer, add key to set, increment counter, schedule timer with current setting value.
  - On retoggle to open: cancel timer, remove key, increment counter.
  - On error: parent fires inverse callback to roll back grace state.
- Each block uses `(a.fingerprint ?? a.id)` key so positional reuse can't show a stale checkbox state for a different action across reflows.

### Settings
- New `action_done_grace_seconds: u32` on `Settings` (Rust + TS), default 3, persisted to `~/.yarvis/settings.json` via `#[serde(default = "...")]`.
- Settings → Dashboard exposes a 0–15 second slider; 0 disables the buffer (rows hide immediately on tick).
- Setting is read fresh on every click; in-flight timers keep their original duration.

## Out of scope (intentional)
- A separate state file for `done` — relying on the skill's fingerprint merge is sufficient.
- Sorting done items to the bottom in-place — left to the next briefing run.
- A "completed" collapse / hide filter on the dashboard sidebar — already covered by "Open only".
- Generating Rust→TS or schema files (separate refactor).

## Files touched
- `src-tauri/src/commands/dashboard.rs`
- `src-tauri/src/commands/settings.rs`
- `src-tauri/src/lib.rs`
- `src/lib/types/index.ts`
- `src/lib/services/dashboard.ts`
- `src/lib/stores/dashboard.svelte.ts`
- `src/lib/stores/settings.svelte.ts`
- `src/lib/components/dashboard/ActionItem.svelte`
- `src/lib/components/dashboard/DashboardSidebar.svelte`
- `src/lib/components/settings/DashboardSettings.svelte`
- `src/routes/+page.svelte`

## Verification
- `bun run check` clean.
- `cargo check` clean.
- Manual: tick an action, confirm `daily.json` reflects `done: true` + `completed_at`. Run skill (incremental) and confirm `done` survives the merge. Toggle "Open only" on the sidebar; confirm count and empty-state behave. Verify the home grace by ticking and unticking within the window; verify 0s setting disables it.
