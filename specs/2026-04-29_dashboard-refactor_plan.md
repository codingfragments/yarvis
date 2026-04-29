# Dashboard refactor — plan

Break `src/routes/dashboard/+page.svelte` (~1000 lines) into a thin
orchestrator + per-area components + pure modules. No behaviour change.

## Goals

1. Page becomes a layout shell: header + sidebar + tabs + modals, no logic.
2. Shared filtered/derived values computed once, not duplicated across
   left rail / tabs / search index.
3. Pure formatters live as plain TS, free from Svelte concerns.
4. Each phase leaves a working app — commit per phase.

## Target layout

```
src/routes/dashboard/
  +page.svelte                 # ~150 lines — orchestrator only
src/lib/components/dashboard/
  DashboardHeader.svelte       # title, next-meeting, stale, ⌘K, ⋯ menu
  DashboardSidebar.svelte      # actions + preps + fun (left rail)
  DashboardTabStrip.svelte     # tab nav with counts + conflict warn
  tabs/
    SummaryTab.svelte
    CalendarTab.svelte
    EmailTab.svelte
    SlackTab.svelte
    ResearchTab.svelte
  (existing) DealLensBar / DealPill / UrgencyDot / SectionCard /
  ExternalLink / MarkdownViewer / QuestionEditor / QuestionStatusPill /
  CommandPalette
src/lib/dashboard/
  format.ts                    # staleness, fmtMinutesAway, liveMinutesAway,
                               # eventClass, eventBorder, priorityRank
  searchIndex.ts               # buildSearchItems(view) → SearchItem[]
src/lib/stores/
  dashboardView.svelte.ts      # view-model: briefing + lens → filtered*
                               # + counts; consumed by sidebar/tabs/search
```

## Architecture decisions

- **View-model store** (`getDashboardViewStore`) holds `dealLens` and
  exposes `$derived` getters for `filteredActions / filteredPreps /
  filteredEvents / filteredConflicts / filteredEmailActToday / filteredEmailFyi /
  filteredChannels / filteredIntel / counts`. It reads from the existing
  `dashboard` store; doesn't replace it.
- Drawer / modal state stays in the page (orchestration concern).
- Tab key + URL hash sync stays in the page.
- Subcomponents take strict `$props` typed off `$lib/types`. No magic.
- Pure helpers (`format.ts`) are plain TypeScript — testable in isolation,
  tree-shakeable, no `.svelte.ts` rune dependency.

## Phases (one commit each)

### Phase 1 — `src/lib/dashboard/format.ts`
Move `staleness`, `fmtMinutesAway`, `liveMinutesAway`, `eventClass`,
`eventBorder`, `priorityRank`. Replace inline definitions with imports.
~30 line reduction in the page. **Verify**: `bun run check`.

### Phase 2 — `src/lib/stores/dashboardView.svelte.ts`
View-model store. Holds `dealLens` (replacing the page's local state),
exposes `lensActive`, `lensDeal`, `lensName`, `filtered*`, `counts`. Page
imports `getDashboardViewStore()` and feeds it the briefing/config from
`dashboard`. Replace inline `$derived` blocks (~70 lines). The header,
left rail, tabs, and search will read from this store going forward.

### Phase 3 — `src/lib/dashboard/searchIndex.ts`
`buildSearchItems(view, briefing)` returns `SearchItem[]`. Page's
`$derived.by` becomes a one-liner. ~85 line reduction. `SearchItem` type
moves to `searchIndex.ts` (or `$lib/types`); the existing
`CommandPalette.svelte` re-exports for compatibility.

### Phase 4 — `DashboardHeader.svelte`
Top header strip. Props: `briefing`, `now`, callbacks for `onPalette`,
`onMemory`. Internal state: `menuOpen`. ~90 lines extracted.

### Phase 5 — `DashboardSidebar.svelte`
Left rail. Props: filtered actions/preps from view store, `b.fun`,
callbacks `onOpenPrep`. Internal state: `actionsOpen`, `prepsOpen`,
`funShowJoke`. ~90 lines extracted.

### Phase 6 — Tab strip + tab panels
- `DashboardTabStrip.svelte` — tabs nav, counts, conflict warn (~30 lines)
- `tabs/SummaryTab.svelte` — greeting + focus + questions (~120 lines)
- `tabs/CalendarTab.svelte` — events + conflicts (~50 lines)
- `tabs/EmailTab.svelte` — act-today + FYI (~55 lines)
- `tabs/SlackTab.svelte` — channels + DMs (~70 lines)
- `tabs/ResearchTab.svelte` — intel categories (~30 lines)

Page renders `{#if tab === 'summary'} <SummaryTab .../> {:else if ...}`.
Question-editor handlers (`openQuestionEditor`, `saveQuestionAnswer`)
stay on page; SummaryTab calls back via `onEditQuestion`.

### Phase 7 — Final orchestrator pass
- Delete dead helpers
- Confirm page is mostly composition
- Document new component layout in `src/lib/components/dashboard/README.md`?
  (only if useful — skip if obvious)

## Risk register

- **Hash → tab sync** lives in `onMount` + `$effect`. Stays in page; tabs
  emit nothing about routing.
- **`$state` reactivity across boundaries**: passing `view.filteredActions`
  as a prop should work via Svelte 5 reactive props, but if a stale snapshot
  appears, switch to passing the store itself and reading
  `view.filteredActions` inside the component.
- **`SectionCard` snippets**: Summary tab uses `{#snippet actions()}` for
  the questions filter toggle. Snippets travel with markup, so this stays
  inside `SummaryTab.svelte` cleanly.
- **Type drift**: subcomponents need precise prop types. Use
  `$lib/types` directly; don't invent local types.
- **Refresh integration**: `dashboard.softRefresh` keeps working — view
  store derives off `dashboard.briefing`, so reactive updates flow
  automatically.

## What I'm NOT doing

- No behaviour changes (no UI tweaks, no rerouting, no data shape changes).
- No new tests (none exist; out of scope).
- Not touching `MarkdownViewer`, `QuestionEditor`, `CommandPalette`,
  `DealLensBar`, `SectionCard`, `DealPill`, `UrgencyDot`, `ExternalLink` —
  they're already components.
- Not consolidating `DealPill` + `UrgencyDot` + `ExternalLink` into one
  generic — they're tiny and clear; consolidation would obscure.

## Confirmation needed

1. **View-model store vs. plain prop drilling** — do we agree the store
   approach is worth it for shared filtered values?
2. **Phasing as separate commits** — keep all 7 separate (easier review,
   smaller blast radius), or squash into 2-3 logical groups before PR?
3. **Tab files in a `tabs/` subfolder** — fine, or keep flat in
   `components/dashboard/`?
4. **Anything I missed** that you want extracted (or kept in place)?
