# Calendar timezone fix

## Problem

The dashboard shows `e.start` / `e.end` (and `prep.time`) verbatim — schema-typed
`time_hhmm` strings with no timezone embedded. If the briefing skill ever emits
those strings in the wrong timezone (calendar source TZ, UTC, stale run, etc.),
the wall-clock displayed in Yarvis is wrong.

A real-world drift was observed once: a CorpDev meeting briefly showed `12:00`
instead of the correct `18:00 CEST`. The current `daily.json` is correct
(`start: "18:00"`, `start_iso: "2026-05-07T18:00:00+02:00"`), so the immediate
visible bug has cleared, but the architecture has no defense against a
recurrence.

## Approach — defence in depth

Two changes in one branch:

1. **UI prefers `start_iso` formatted into `meta.timezone`.** The skill already
   emits ISO strings on every event. Render those through `Intl.DateTimeFormat`
   with the briefing's declared IANA TZ, falling back to the raw `time_hhmm`
   string only when the ISO field is missing (the schema marks it optional).
2. **Skill spec gets an explicit normalisation rule.** Make it impossible to
   misread the contract: `calendar.events[].start/end` and
   `meeting_preps[].time` MUST equal `start_iso` / `time_iso` formatted in
   `user.timezone`. Reinforce in both `daily-dashboard-SKILL.md` and
   `briefing_schema.md`.

Why both: ISO + IANA is the only TZ-correct render path, but the skill rule
keeps the HH:MM strings and the LLM-written `calendar.summary` text consistent
with each other — and gives us a fallback when ISO isn't there.

## Format target

Render in `meta.timezone` (not the laptop's local TZ). This matches the
briefing's declared identity, matches `start`/`end` literals, and matches
the free-text summary which already commits to that TZ.

## File-by-file

- `src/lib/types/index.ts` — add `start_iso?` / `end_iso?` to `CalendarEvent`,
  `time_iso?` to `MeetingPrep`.
- `src/lib/dashboard/format.ts` — add `formatTimeInZone(iso, timeZone, fallback)`.
- `src/lib/components/dashboard/CalendarEvent.svelte` — accept `timezone` prop,
  format start/end via the helper.
- `src/lib/components/dashboard/tabs/CalendarTab.svelte` — pass `timezone`
  through to `CalendarEvent`.
- `src/lib/components/dashboard/DashboardSidebar.svelte` — accept `timezone`
  prop, format `prep.time` via the helper.
- `src/routes/dashboard/+page.svelte` — pass `b.meta.timezone` to both
  `CalendarTab` and `DashboardSidebar`.
- `ai/daily-dashboard-SKILL.md` — add the explicit TZ normalisation rule.
- `ai/briefing_schema.md` — reinforce the rule in the field tables.

## Out of scope

- Changing the schema (`start_iso` stays optional — adding it as required would
  break legacy fixtures; the UI degrades gracefully).
- A validator check that `start ≡ start_iso → meta.timezone`. Tempting, but
  needs a tz database and the validator is stdlib-only by design (per
  `ai/README.md`).
