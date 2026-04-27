# Deal lens + Cmd-K palette — implementation plan

Two backlog items pulled forward together because they're both
filtering/navigation surfaces on the same data, both frontend-only,
and they reinforce each other (palette respects active deal lens).

## 1. Deal lens

Filter the whole dashboard to a single `deal_tag`.

### Placement
Slim pill row directly below the top strip, above the body.
- One **All** pill (default selected) + one pill per active deal from
  `briefing_config.yaml > active_deals`.
- Active pill uses the deal's `color:` accent (or theme primary if no
  colour configured).
- Hides itself when there are zero active deals.
- Wraps on narrow screens.

### What gets filtered
| Section | Filter rule |
|---|---|
| Action items | `deal_tag === selected` |
| Meeting preps | `deal_tag === selected` |
| Calendar events | `deal_tag === selected` |
| Conflicts | shown only if any conflict event remains in the filtered set |
| Email act_today / fyi | `deal_tag === selected` |
| Slack channels | `deal_tag === selected` (filter at channel level) |
| Intelligence items | `tags` array contains the deal id |
| Tab counts | recompute against the filtered set |

When a filter is active and a section has zero items, render an empty
state ("No <kind> for <deal name>") instead of hiding the section —
makes it obvious the filter is on.

### State
`dealLens: string | null` in the page. Session-only (no URL hash for
v1). Clicking the active pill clears it. Clicking **All** clears it.

### Implementation
- New `DealLensBar.svelte` component.
- Replace direct array reads in the page render with `$derived`
  filtered slices (`filteredActions`, `filteredCalendar`, etc.).
- Update the `counts` $derived to use filtered slices so tab badges
  match the visible content.

## 2. Cmd-K palette

Fuzzy-search across everything in today's briefing.

### Trigger
- ⌘+K on macOS, Ctrl+K elsewhere.
- Window-level keydown listener on the dashboard page; the listener is
  attached on mount and cleaned up on destroy so it doesn't leak into
  other routes.

### Index
Built once per render of the briefing (cheap, all in memory):
- **Action items** — text, deadline
- **Email** (act_today + fyi) — from, subject, summary
- **Slack channels** — channel_name + summary line
- **Slack messages** — author, summary
- **Calendar events** — title, notes, participants joined
- **Meeting preps** — title, time
- **Intelligence items** — headline, detail

Each item carries: `kind`, `title`, `subtitle`, `hay` (pre-lowercased
search text), and a dispatch hint (`url` or `prep` reference).

### Search
- Lowercase the query, split on whitespace.
- An item matches if **every** term is found in `hay`.
- Score = total occurrences across terms; ties broken by `kind` order
  (actions first, then email, slack, event, prep, intel).
- Cap to ~30 results.

### UI
- Centered modal, max-w-2xl, max-h-[70vh]. Input at top, scrollable
  results below, footer hint (`↑↓ to move · ⏎ to open · esc to close`).
- Each result row: kind badge (emoji + colour), primary text, faint
  secondary text on the right.
- Highlight follows ↑/↓; Enter dispatches.

### Dispatch by kind
- `url` items → Tauri `shell.open` (browser fallback).
- `prep` → close palette, open the existing PrepDrawer for that entry.
- Slack channel without URL → fallback to copy the channel name (rare).

### Interaction with deal lens
The palette respects the active deal lens — if a lens is set, the
search index is the **filtered** set. Keeps the two features
internally consistent ("show me what I can see").

## What we're not doing this PR

- No URL-hash for the deal lens (deferred — easy add later).
- No multi-deal selection; single lens only.
- No fuzzy-typo search (no Fuse.js, no Levenshtein) — straight
  substring. Honest about the limitation; can upgrade if it gets noisy.
- No keyboard shortcut surfaced in the UI besides the footer hint and
  a small `⌘K` indicator in the top strip.

## Branch + PR
- Branch `feature/deal-lens-and-search`.
- One PR. Archive plan to
  `specs/2026-04-27_deal-lens-and-search_plan.md` before opening.
