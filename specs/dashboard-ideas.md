# Dashboard — backlog of ideas

Live backlog for the `/dashboard` feature. Promote to `specs/plan.md` when one
gets picked up. Items at the top were called out during the original planning
conversation; items at the bottom are fresh additions worth holding onto.

## Queued (decided to build, post-MVP)

- **Deal lens** — filter the whole dashboard to a single `deal_tag` (toggle
  pills across the top). Touches every section that has a `deal_tag` field.
- **Cmd-K search** — palette over emails / slack / actions / intel / events
  for the current day. Fuzzy match on title + summary; Enter opens the URL.

## From the original planning chat (parked, not next-up)

- **Diff vs. previous run** — uses `meta.update_sequence > 1`. "New since
  12:30" badges on emails, slack messages, action items. Requires keeping
  the previous payload in the store and stable per-id comparison.
- **Send-to-Pomodoro** — start a focus session from an action item, prefilled
  with the action text. Reuses the existing PomodoroTimer component.
- **T-5 next-meeting macOS notification** — native notification when
  `meta.next_meeting.minutes_away ≤ 5`. Click opens the dashboard scrolled
  to the calendar timeline.
- **Printable 1-page export** — print stylesheet that flattens the dashboard
  into a single page for offline / morning-coffee reading.

## Fresh ideas to consider

- **Briefing time-machine** — keep a rolling N-day archive of `daily.json`
  snapshots so we can scrub back through the day's `update_sequence`s and
  through previous days. Unblocks proper diff and a "how did the day evolve"
  view. Storage: `~/.yarvis/daily-archive/<date>/<seq>.json`.
- **Sidebar peek** — render a condensed dashboard tile inside the existing
  `SidePanel` component (next meeting, top action, pending question count)
  so the dashboard "travels with" the user across other Yarvis routes.
- **Outbound to Apple Reminders / Things** — one-click push of an action
  item to native Reminders (via `x-apple-reminderkit://` URL scheme) or
  Things 3 (URL scheme `things:///add`). Keeps the dashboard a viewer and
  lets the user's existing task system own commitments.
- **EOD wrap** — at end-of-day, generate a short markdown summary (actions
  closed, questions answered, meetings attended, what slipped) and append
  it to `memory.md`. Mirrors the morning briefing — closes the loop.
- **Local LLM re-explain** — "Why does this matter today?" button on each
  action / intel item, calling a local model with the full `daily.json` as
  context. Single-purpose, no chat surface. Gated on an LLM story Yarvis
  hasn't decided yet.

## Probably-not-but-worth-noting

- Drag-and-drop reorder of action items (skill regenerates the list, so
  ordering is fragile and would need to live in the sidecar — heavy for
  marginal value).
- Mobile/web export — feels like duplicating the briefing skill's existing
  HTML viewer.
- Theme tied to urgency — fun, but a discipline trap (UI shouting at you
  isn't the same as actually helping).
