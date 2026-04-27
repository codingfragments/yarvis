# Dashboard ("Today") — implementation plan

A new, separate Yarvis app that renders the live `daily.json` produced by the
`day-starter` / `daily-dashboard` skill chain in `~/claude-chats`. It is **not**
the existing `/briefings` viewer (which lists per-date markdown folders). It is
the *now* view — what's happening today, what to act on, what to answer.

## Data sources

| Path | Role | Read/Write |
|---|---|---|
| `~/claude-chats/briefings/daily/daily.json` | live structured briefing — replaced wholesale on each generation pass | read |
| `~/claude-chats/briefings/daily/question.md` | open questions for the user; in-place answers flip `[PENDING] → [ANSWERED]` | read + write |
| `~/claude-chats/briefings/daily/memory.md` | running memory the skill maintains | read (display) |
| `~/claude-chats/src/daily/briefing_config.yaml` | static config: user, deals, intelligence categories, VIP channels, auto-file rules | read |
| `~/claude-chats/src/daily/briefing_schema.md` | canonical schema doc | not read at runtime |

`daily.json` is fully replaced per pass, so reactivity = re-read on file mtime
change. A single watcher on the `daily/` directory covers `.json` + question
file. `briefing_config.yaml` is rarely changed; load once + watch optionally.

## Phase 1 — read-only dashboard (MVP)

Goal: open the app, see today at a glance, click through to gmail / zoom /
slack / docs, refresh manually.

**Backend (`src-tauri/src/commands/dashboard.rs`)**
- `read_daily(daily_dir) -> DailyBriefing` — parses `daily.json` into a typed
  Rust struct (full schema), returns to the frontend as one payload.
- `read_config(src_dir) -> BriefingConfig` — parses `briefing_config.yaml`
  (user, intelligence_categories with icon/label, active_deals, vip channels).
  Used to enrich rendering: deal accent colours, category icons/labels, role
  display in the greeting.
- `read_memory(daily_dir) -> String` — raw markdown.
- `daily_status(daily_dir) -> DailyStatus { exists, generated_at, mtime,
  pending_questions }` — cheap, used by the home tile + status bar.

Use `serde` + `serde_yaml` (already pulled by Cargo? — add if missing) +
`chrono` (already used by briefings).

**Service (`src/lib/services/dashboard.ts`)** — thin wrappers, browser-mode
fallback returns demo fixture so layout work happens without Tauri.

**Store (`src/lib/stores/dashboard.svelte.ts`)** — Svelte 5 runes:
`current = $state<DailyBriefing | null>`, `config`, `lastLoaded`, `loading`,
`error`. Methods: `load()`, `refresh()`.

**Route (`src/routes/dashboard/+page.svelte`)** — single SPA page. Layout
sketch (top → bottom):

1. **Hero band** — greeting text, context_note as callout, generated-at +
   countdown to `next_meeting` (live updating), [Refresh] button.
2. **Action items rail** — left column, sticky-ish on wide screens. Cards
   ordered by priority+deadline. Each links back to its source (email/slack/
   calendar) via `source_ref` lookup → opens the URL in browser.
3. **Today's calendar** — vertical timeline of `calendar.events`. Conflicts
   render as a warning callout above the timeline. Visual rules per schema:
   external/critical = red border; internal = green; personal_block = muted;
   declined = strikethrough. Deal badge from config (colour TBD — see Q5).
4. **Email** — `act_today` cards with red/orange border + Gmail link;
   collapsed `fyi`; one-line `no_action_summary` at the bottom.
5. **Slack** — collapsible per-channel cards, deal badge, activity-level pill.
   Each message: author + summary + extracted links + per-message action.
6. **Intelligence** — collapsible per-category sections, ordered by config
   `order`, with config `icon`+`label`. Each item shows headline, detail,
   source link, italic relevance line.
7. **Focus + Fun** — focus_prompt as a quote card; fun.fact + fun.joke as a
   rotating tile (click to flip between fact and joke).
8. **Footer** — meeting_preps mini-table (links into the existing `/briefings`
   viewer for the prep `.md` files when `file` is set — reuse, don't reimplement).

Reuse: `MarkdownRenderer.svelte` for `memory.md` and any string-rendered
markdown. `StatusBar` for the next-meeting countdown.

**Settings** — extend `Settings` struct + page:
- `daily_dir` (default `~/claude-chats/briefings/daily`)
- `daily_src_dir` (default `~/claude-chats/src/daily`)
- file pickers (or text input — see existing pattern in settings page).
  Validate on save: directory exists + `daily.json` exists for `daily_dir`.

**Home launcher** — add a "Today" tile (AppTile pattern). Optional: small
preview showing next meeting + pending question count from `daily_status`.

## Phase 2 — questions interaction

`question.md` is markdown with this structure:

```
## [PENDING] <question text>
**Asked:** <date> · **Run:** <run_type>
**Context:** <one paragraph>
<question body, possibly multi-paragraph>
> *(type your answer here)*
---
```

**Backend additions**
- `read_questions(daily_dir) -> Vec<Question>` — parse the markdown into
  structured items: `{ status: Pending|Answered|Processed, title, asked,
  run, context, body, answer, byte_range }`.
- `answer_question(daily_dir, question_index, answer_text) -> ()` — replace
  the `> *(type your answer here)*` block with the user's text and flip the
  status tag from `[PENDING]` to `[ANSWERED]`. Preserve everything else
  byte-for-byte (use byte ranges, not full re-render). Idempotent on resave.

**Frontend** — questions render as their own panel near the top of the
dashboard (high attention surface). Each card: status pill, title, expandable
context, textarea (autosaving on blur), inline confirmation. After save the
card collapses into "Answered ✓" state with the user's text shown read-only.

Robustness rules:
- Never overwrite a `[PROCESSED]` entry from the UI — read-only with a
  "processed" badge.
- Round-trip safe — write only via byte-range patch, never full regenerate.
- Show last-saved indicator. On parse failure, fall back to raw markdown view
  with a "open in editor" button so the user is never blocked.

## Phase 3 — reactive refresh

Two layers:
1. **Manual refresh button** — always present, primary path in MVP.
2. **File-watcher** — `notify` crate in Rust, debounce 200 ms, emit a Tauri
   event `dashboard://daily-changed`. Frontend listens and calls `load()`.
   Watch `daily.json` and `question.md` only.

Polling fallback if the watcher fails (e.g. on certain network filesystems):
poll mtime every 30 s when the dashboard page is mounted.

Surface "stale" badge in the hero: green `< 30 min`, amber `< 4 h`, red older,
based on `meta.generated_at`. Lets the user notice when the skill hasn't run.

## Architecture summary

```
~/.../daily.json ──┐
                   ├─► dashboard.rs ──► invoke() ──► dashboard.ts ──► store ──► +page.svelte
~/.../config.yaml ─┘                       ▲
                                           │
notify watcher ────────► tauri::Emitter ───┘
```

One command file, one service file, one store, one route, ~3–5 small
sub-components for the section cards (ActionCard, EventRow, EmailCard,
SlackChannel, IntelItem, QuestionCard).

## Locked decisions (from planning chat)

- Route + tile label: **Dashboard** (`/dashboard`).
- Coexist with `/briefings`. `meeting_preps[].file` deep-links into the
  briefings viewer; no fold-in.
- Reactivity: **manual refresh button in MVP**, file-watcher in Phase 3.
- Question UX: **inline textarea, autosave on blur**, with read-modify-write
  by `## [PENDING] <title>` match (not line offset) to handle the skill-vs-UI
  race.
- `memory.md`: hidden behind a **burger / overflow menu** as an advanced view.
- Conflicts: **read-only callout** in the calendar timeline. No
  decline/clipboard button.
- Deal accent colours: add a **`color:` field** to each entry in
  `briefing_config.yaml > active_deals`. Frontend reads the colour from the
  parsed config; falls back to a neutral if missing.
- Snooze / done state: sidecar `~/.yarvis/daily-state.json` **scoped to one
  `briefing_date`**. When the date in `daily.json` advances, the sidecar is
  treated as empty and overwritten on next write — yesterday's ticks do not
  bleed into today. *Not built in MVP* — actions ship read-only first; this
  is the design we land on when snooze/done arrives.

## Next-up extensions (post-MVP, queued)

- **Deal lens** — filter the whole dashboard to a single `deal_tag`.
- **Cmd-K search** — palette over emails / slack / actions / intel / events
  for the current day.

Full backlog (parked + fresh ideas) lives in `specs/dashboard-ideas.md`.

## Open questions for the user

1. **Route name.** `/dashboard` (matches the brief), `/today`, or `/now`?
   Same question for the launcher tile label + icon.
2. **Reactivity in MVP.** Refresh button only, or watcher *and* button? I'd
   ship watcher in MVP — it's small with `notify` and the UX is much
   better — but we can defer if you want the smallest possible first PR.
3. **Question editing UX.** Inline textarea on the dashboard (one-click
   answer), or a modal, or "open the file in your editor of choice"? My pick
   is inline-with-autosave-on-blur — fastest, but writes a markdown file the
   skill also touches, so we need to handle the rare race. OK?
4. **Side-by-side or replace `/briefings`?** Briefings viewer reads dated
   markdown folders; this dashboard reads the live JSON. Both keep value
   (history vs. now). Keep both side by side, deep-link from dashboard
   `meeting_preps` into briefings viewer? Or fold briefings into the
   dashboard later?
5. **Deal accent colours.** `briefing_config.yaml` has `id`+`name` but no
   colour. Do we hardcode a small palette (aspen=peach, puppygraph=blue,
   raindrop=teal, …) in the frontend, add a `color:` field to the YAML, or
   derive from a hash of the id? My pick is to add `color:` to the YAML
   (small change to your config; you control it).
6. **Conflicts default action.** The MVP plan shows the conflict callout as
   read-only. Do you also want one-click "decline X" from the dashboard, or
   is "show + remind" enough?
7. **Memory + question files.** Render `memory.md` somewhere on the
   dashboard, or keep it skill-internal and out of the UI?
8. **Snooze persistence path.** OK to put dashboard-side state in
   `~/.yarvis/daily-state.json` (keyed by `briefing_date`)?
9. **Quick wins after MVP.** Of the extensions above, which two would
   change your day most? I'd guess (a) diff vs. previous run + (b) deal
   lens.

## Branch + PR plan

- Branch: `feature/today-dashboard` off `main`.
- Phase 1 first PR: read-only render + settings + manual refresh.
- Phase 2 PR: questions interaction.
- Phase 3 PR: file watcher + stale badge.
- Each phase: keep the existing `/briefings` route untouched; archive this
  plan to `specs/YYYY-MM-DD_today-dashboard_plan.md` before opening the
  Phase 1 PR.

## Risks / things to watch

- **JSON schema drift** — the schema is documented but evolving. Parse
  defensively (`serde(default)`, `Option<>` for new fields) and fail per
  section, not whole-payload. A render error in `intelligence` shouldn't
  hide the calendar.
- **Question file race** — skill rewrites file while UI is editing. Mitigate
  with a read-modify-write that re-reads the file before patching, and
  detects the question by `## [PENDING] <title>` rather than line offset.
- **Path expansion** — `~` handling already exists in `briefings.rs`; reuse
  the same helper, don't fork.
- **YAML deps** — adds `serde_yaml` to `src-tauri/Cargo.toml`. Tiny.
