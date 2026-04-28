# Home widgets from daily.json — implementation plan

Replace the markdown-scraping `get_today_widgets` Tauri command with
a JSON-fed home screen that reuses the existing `read_daily` /
`daily_status` commands. Add four new widgets that the structured
data makes possible.

## Scope (confirmed)

- A. Greeting banner (`greeting.text` + `greeting.context_note`)
- B. Next-meeting countdown (`meta.next_meeting`, live ticking)
- C. Top 3 action items (`action_items` priority-sorted, click-through)
- D. Pending questions badge (only if `pending_questions > 0`)
- E. Day pulse strip (events count, conflicts count, generated-at age)
- migrated focus_prompt (text widget)
- migrated fun (fact + joke flip)

Skipped: F active-deal tile, G top intel headline.

## Layout

```
┌─────────────────────────────────────────────────────┐
│ Greeting + context note                             │
└─────────────────────────────────────────────────────┘
┌──────────────────┬──────────────┬──────────────────┐
│ Next meeting     │ Day pulse    │ Pending Qs       │
│ countdown        │ events / ⚠   │ (only if > 0)    │
└──────────────────┴──────────────┴──────────────────┘
┌─────────────────────────────────────────────────────┐
│ Top 3 actions                                       │
└─────────────────────────────────────────────────────┘
┌────────────────────────┬────────────────────────────┐
│ Today's focus          │ Fun fact / joke (flip)     │
└────────────────────────┴────────────────────────────┘
```

Below `lg`, single column.

## Data flow

- Existing `read_daily(daily_dir, briefings_dir)` returns the full
  briefing — small JSON, fine for the home.
- Existing `daily_status(daily_dir)` gives `pending_questions` count
  cheaply.
- Live clock: 30s tick (same pattern as the dashboard) to recompute
  `next_meeting.minutes_away` without re-reading the file.

## Empty / error states

- `daily.json` missing → friendly empty card "No briefing yet today —
  run the briefing skill, then return here."
- Tauri-mode error → small error tile with link to Settings.
- Browser mode → silent (existing behavior).

## Backend cleanup

- `get_today_widgets` and its `extract_section` helper are no longer
  used. Remove them to avoid drift. (Markdown briefing files keep
  their content; we just stop scraping them.)

## Branch + PR

`feature/home-widgets-from-json`. One PR. Archive plan to
`specs/2026-04-28_home-widgets-from-json_plan.md` before opening.
