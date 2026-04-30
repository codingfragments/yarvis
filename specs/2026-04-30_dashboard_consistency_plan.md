# Dashboard rendering refactor — plan

Branch: `feature/dashboard-fixes`

## Goals
- Single source of truth for action-item rendering (home + sidebar).
- Replace urgency dot with left accent rail (matches `CalendarEvent`).
- Promote left rail to a generic primitive used across Calendar, Email, Slack.
- Tone down `DealPill`; reuse the same chip baseline in the deal lens.
- Sidebar wide enough that the chip never wraps in the typical case.

## Naming convention
Single-entry presentational components are named after the type they render — no `Row` / `Card` / `Item` suffix. Layout variants are props (`compact`, etc.), not separate files.

## Decisions locked
- **Rail thickness:** `border-l-2` everywhere. Revisit after visual QA.
- **Stacked meta order in `ActionItem`:** `DealChip` first, then deadline / source / open link.
- **`DealChip`:** no `uppercase`, no `tracking-wider` — colored bg + border carries the weight.

## New primitives

### `AccentRow.svelte`
Generic row chrome. Slots: `leading?`, default body, `trailing?`.
Props: `accent: string` (precomputed Tailwind border class — policy lives in helpers).
Base classes: `flex items-stretch gap-3 rounded-lg bg-base-100/30 border-l-2 {accent} px-3 py-2 text-xs`.

### `rowAccent()` helper in `src/lib/dashboard/format.ts`
Generalize `eventBorder()` → `rowAccent({ urgency, eventType? })`.
- `critical` → `border-l-error`
- `high` → `border-l-warning`
- `medium` → `border-l-info`
- `low` → `border-l-base-content/30`

Calendar keeps its richer type+urgency mapping when `eventType` is supplied.

### `DealChip.svelte`
Extract baseline from `DealPill` + `DealLensBar`.
- `text-xs`, normal weight, mixed-case, colored bg + border.
- `max-w-[10rem] truncate` to bound width.
- Variants: `display` (replaces `DealPill`) and `interactive` (replaces lens buttons; active/inactive states).

### `ActionItem.svelte`
Single-entry component for `ActionItem` data. Wraps `AccentRow` with `accent={rowAccent({ urgency: a.priority })}`.
- **Stacked** (sidebar): row 1 = text · row 2 = meta strip (`DealChip · ⏰ deadline · source · open↗`).
- **`compact`** (home): single row — `DealChip · text (truncated) · deadline · open↗`.

## Consumer changes

| File | Change |
|---|---|
| `EventRow.svelte` → rename `CalendarEvent.svelte` | Render through `AccentRow`; drop `UrgencyDot` from header. Update import in `CalendarTab.svelte`. |
| `EmailTab.svelte` | Both lists wrap in `AccentRow`; rail = `rowAccent({ urgency })`. Drop dots + hard-coded `border-error/60`. |
| `SlackTab.svelte` | Channel + DM cards in `AccentRow` keyed off `activity_level`. |
| `DashboardSidebar.svelte` | List uses `<ActionItem />`. Bump width `md:w-80` → `md:w-96`. |
| `routes/+page.svelte` | "Top actions" uses `<ActionItem compact />`. |
| `DealLensBar.svelte` | Buttons via `<DealChip variant="interactive" />`. |
| `DealPill.svelte` | Thin shim around `<DealChip variant="display" />` (or delete + replace imports). |
| `SummaryTab.svelte` | Untouched. |
| `UrgencyDot.svelte` | Kept for non-row use (conflicts, day-pulse counters). |

## Order of work
1. Add `rowAccent()` helper + `AccentRow.svelte`. No consumers yet.
2. Rename `EventRow.svelte` → `CalendarEvent.svelte`; refactor onto `AccentRow`. Visual parity check on CalendarTab.
3. Tone down `DealPill` (uppercase / tracking off). Sanity check across tabs.
4. Extract `DealChip`; point `DealPill` + `DealLensBar` at it.
5. Build `ActionItem.svelte` (stacked + compact).
6. Swap home top-3 and sidebar list to `<ActionItem />`.
7. Widen sidebar; tune internal padding.
8. Apply `AccentRow` to `EmailTab` (both lists) + `SlackTab` (channels, DMs).
9. Browser QA in `bun run tauri:dev` — light + dark, sidebar collapsed/expanded, deal lens on/off.
10. **Pause for user testing** — confirm `border-l-2` thickness is right or bump to `border-l-[3px]`.
