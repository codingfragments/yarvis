# Daily timeline — idea

Backlog idea for a "what changed in the last 24/48h" timeline view over
`daily.json`. Promote to `specs/plan.md` when picked up.

Related (already in `dashboard-ideas.md`):
- *Diff vs. previous run* — same problem space, narrower scope.
- *Briefing time-machine* — full snapshot archive; complementary, not a
  substitute (snapshots are heavy to diff at view time).

## Storage

Append-only event log next to the `daily.json` it describes — same directory,
same lifecycle. If the file exists, the timeline view shows it; if not, the
view falls back to "no history yet".

```
~/.yarvis/daily.json            # current state
~/.yarvis/daily-changes.jsonl   # event log, one JSON object per line
```

The generator (Claude hourly job) writes the log entries itself on each run.
It already knows what it changed and why — this is cheaper and richer than
diffing snapshots after the fact.

### Event schema (sketch)

```jsonc
{
  "ts": "2026-04-29T09:12:04Z",
  "run_type": "full" | "midday" | "incremental" | "briefing",
  "run_id": "2026-04-29T09:12:00Z-inc",   // groups events from the same run
  "kind": "add" | "update" | "remove" | "rebuild",
  "target": "mail" | "slack" | "meeting" | "diligence" | "web" | "all",
  "ref": "thread:acme-q2" | "meeting:10:00-board" | null,
  "summary": "3 new replies, latest from Jamie"
}
```

`run_id` is the join key for the grouped view; `ref` is what the click-through
in the UI scrolls/highlights in the daily view behind the overlay.

## Layout

Right-side drawer overlay, dimmed backdrop, daily content stays visible behind
for context. Slides in, persistable open/closed.

Three variants — all worth keeping, switchable from the overlay header
(toggle persisted in the sidebar / store). Drawer stays the primary surface;
the horizontal variant is secondary, optionally also usable as an always-on
footer strip on the dashboard route.

### Grouped by run (narrative)

```
┌─────────────────────────────────────────┐
│ Activity                    24h │ 48h ⨯ │
│ [✓Mail] [✓Slack] [✓Meet] [✓Dil] [✓Brief]│
│ View: [Grouped] [Flat]                  │
├─────────────────────────────────────────┤
│ ● now ─────────────────────────────────│
│                                         │
│ ◆ 09:12  [INCREMENTAL]      2m ago     │
│ │  + Mail   3 new from Acme thread     │
│ │  + Slack  #ops: deploy rollback q   │
│ │                                       │
│ ◆ 08:30  [BRIEFING]        45m ago     │
│ │  + Meet   10:00 board prep ready     │
│ │                                       │
│ ◆ 07:00  [MIDDAY]            3h ago    │
│ │  ~ Dil    deepened: Q2 pipeline      │
│ │  ~ Web    +2 sources on X            │
│ │                                       │
│ ◆ 06:00  [FULL]              4h ago    │
│ │  ↻ rebuilt from bootstrap            │
│ ╵                                       │
│ ─── yesterday ──────────────────────────│
└─────────────────────────────────────────┘
```

Strengths: tells the narrative ("midday deepened diligence"). Run-type badge
is the primary color anchor (Catppuccin: full=mauve, midday=peach, inc=teal,
briefing=yellow).

### Flat chronological (precision)

```
┌─────────────────────────────────────────┐
│ Activity                    24h │ 48h ⨯ │
│ [✓Mail] [✓Slack] [✓Meet] [✓Dil] [✓Brief]│
│ View: [Grouped] [Flat]                  │
├─────────────────────────────────────────┤
│ ● now ─────────────────────────────────│
│                                         │
│ ● 09:12  + Mail · Acme thread     [inc]│
│ │  3 new replies, latest from Jamie    │
│ │                                       │
│ ● 09:12  + Slack · #ops           [inc]│
│ │  deploy rollback question, 4 replies │
│ │                                       │
│ ● 08:30  + Meet · 10:00 board   [brief]│
│ │  prep ready · talking points + risks │
│ │                                       │
│ ● 07:02  ~ Web  · Q2 pipeline     [mid]│
│ │  +2 sources, refreshed est. 1.4M     │
│ │                                       │
│ ● 07:00  ~ Dil  · Q2 pipeline     [mid]│
│ │  deepened section with new findings  │
│ │                                       │
│ ● 06:00  ↻ All  · bootstrap rebuild [full]│
│ │                                       │
│ ─── yesterday ──────────────────────────│
└─────────────────────────────────────────┘
```

Strengths: minute-precision, density, easier "show me only mail" filtering
(target badge is the primary color anchor; run-type is a small right chip).

### Horizontal (pulse-of-the-day, secondary)

Footer-strip layout. Two sub-shapes; pick one or expose both.

**Swim-lanes** (richer, ~140px tall):

```
┌──────────────────────────────────────────────────────────────────┐
│ Activity · last 24h           View: [Grouped] [Flat] [Horizontal⨯]│
├──────────────────────────────────────────────────────────────────┤
│ Mail  │             ·           ·          ●●●            ●      │
│ Slack │      ●           ·                ●●          ●●         │
│ Meet  │                  ●                            ●          │
│ Dil   │                  ●                                       │
│ Web   │                  ●                            ·          │
│       └─┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬──── now│
│       12:00 16:00 20:00 00:00 04:00 06:00 07:00 08:30 09:12     │
│                                                                  │
│ Runs  │  [F]            [M]              [F][M][I][B][I][I]      │
│       └──────────────────────────────────────────────────────────│
└──────────────────────────────────────────────────────────────────┘
```

- One row per target — "Mail was busy this morning, Dil was quiet" at a glance.
- Bottom **Runs** band plots when each generator fired (F/M/I/B on a mini-track)
  — answers "when was the last full rebuild" without opening anything.
- Hover a dot → popover with `summary` + run-type chip; click → scroll the
  dashboard behind to that section (uses `ref`).
- Brush-select a range → filters the dashboard to "what changed between
  06:00 and 09:00".

**Compact single-strip** (~60px tall, footer-friendly):

```
┌──────────────────────────────────────────────────────────────────┐
│ Activity ·  ·  ●  ·  ·  ●  ●  ·  ●●●  ●●  ●● ●●●●●●●●● ← now ⨯ │
│ Runs    [F]──────────[M]─────────[F][M][I][B][I][I]              │
│         └──┬─────────┬─────────┬─────────┬─────────┬─────────────┘
│         yesterday  20:00     00:00     04:00     08:00         now│
└──────────────────────────────────────────────────────────────────┘
```

- One row of all events, color = target. Maximum density, loses per-target
  busy-stripe reading.
- Good as an always-visible strip; you'd still open the drawer to read
  details.

Strengths: pulse-of-the-day visualisation, range-brushing, "when did it run".
Weaknesses: summaries are hover-only (painful for "what actually happened
in the last hour"); 48h cramps horizontally; weak on narrow/split panes.
That's why drawer stays primary.

### Shared chrome

- Time-range toggle: 24h / 48h.
- Filter chips by target, persisted in store.
- Day dividers when scrolling past midnight.
- Click any row → scrolls/highlights the affected section in the daily view
  behind the overlay (uses `ref`).
- Subtle pixel-font on timestamps as the retro accent; nodes are clean filled
  circles, not 8-bit (consistent with the modern-first UI rule).
- Empty state: "No changes recorded yet — the next hourly run will start
  filling this in."

## Open questions

- Retention: trim `daily-changes.jsonl` to last N days, or rotate per-day next
  to the (future) per-day archived `daily.json`?
- Generator authorship: does each of the three skills (full / midday /
  incremental) emit log entries independently, or via a shared helper? Latter
  keeps schema consistent.
- Briefing additions: is a meeting-briefing add a `briefing` `run_type`, or
  should the run_type be the originating skill and `target=meeting`? Leaning
  former — easier to filter "briefings only".
- Default view (Grouped vs Flat vs Horizontal) on first open — probably
  Grouped, since the narrative is the differentiator vs. a plain
  notifications feed.
- Whether the horizontal swim-lanes also live as an always-on dashboard
  footer strip, or only inside the overlay. Footer placement gives ambient
  awareness but eats vertical space on a route that's already dense.

## Tradeoffs vs. alternatives

- **vs. timestamped snapshots only**: snapshots are O(file-size) per run and
  require diffing at view time. Event log is O(changes) and renders directly.
  Snapshots still useful for full rollback — pair with *Briefing time-machine*
  if/when that gets built.
- **vs. computing the log from snapshots**: doable, but loses the generator's
  semantic intent ("deepened diligence" becomes "section X grew by 4 lines").
- **vs. inline "new since" badges on the dashboard**: those are good for
  glance-at-a-glance freshness; the timeline is for "tell me the story of the
  day". Both can coexist — the *Diff vs. previous run* idea covers the badges.
