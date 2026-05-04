---
name: daily-dashboard
version: 1.2.0
description: "Generates and updates the daily intelligence briefing as a structured JSON file. Invoked ONLY by the explicit slash command /daily-dashboard — never auto-triggered. Supports optional arguments: config={path} (default: src/daily) — points at the user's briefing_config.yaml; target={path} (default: briefings/daily) — where daily.json lives; force=full|midday|incremental (override automatic run-type detection). Reads briefing_config.yaml from the config directory; reads briefing_schema.md, briefing_schema.json, and runs validate_briefing.py from the skill's own bundle directory; reads+writes daily.json to the target directory; maintains memory.md and question.md in the target directory across runs. Output is always JSON only — never generates an HTML dashboard or widget unless the user explicitly requests one after the skill has run."
---

# daily-dashboard Skill

Produces a structured JSON briefing at `{target}/daily.json`. Designed to be run multiple times per day with smart run-type detection: **full** in the morning, **midday** at refresh windows, **incremental** for all other intraday passes. Each run type fetches exactly the data it needs — no wasted calls, maximum parallelism.

**Output is always `daily.json` only.** This skill never generates an HTML dashboard, a visual widget, or any other rendered output — even in an interactive Cowork chat session. Do not call `mcp__cowork__create_artifact`, `mcp__cowork__update_artifact`, `mcp__visualize__show_widget`, or any other rendering tool as part of this skill. If the user asks for a dashboard or visual after the skill has run, that is a separate request handled outside this skill.

---

## Arguments

| Argument | Default | Description |
|---|---|---|
| `config={path}` | `src/daily` | Directory containing `briefing_config.yaml` and `briefing_schema.md`. |
| `target={path}` | `briefings/daily` | Directory for `daily.json`, `memory.md`, and `question.md`. |
| `force={type}` | *(auto-detect)* | Override run-type detection. Values: `full`, `midday`, `incremental`. |

Example invocations:
```
/daily-dashboard
/daily-dashboard force=full
/daily-dashboard config=src/daily target=briefings/daily
```

---

## Execution Environment

Detect which environment this skill is running in at Phase 0 startup, before spawning any work:

| Environment | Detection signal | Execution model |
|---|---|---|
| **Cowork** | `TaskCreate` / `Agent` tools are available in the tool list | Phase 3 data-gathering runs as **parallel subagents** — one per data source. Subagents return structured JSON fragments to the main agent for assembly. Phase 4 assembly and all file writes happen in the main agent. |
| **claude.ai** | `TaskCreate` / `Agent` tools are not available | Phase 3 data-gathering runs **sequentially in the main agent**, wave by wave. No subagents. All other phases unchanged. |

Once detected, announce the mode:
> 🔄 **Running daily-dashboard** · Run type: **[full | midday | incremental]** · Mode: **[Cowork parallel | claude.ai sequential]** · [time] CEST

The split is **only in Phase 3** (data gathering). Phase 0, 1, 2, 3.5, 4, 5, and 6 always run in the main agent regardless of environment — subagents only gather raw data, they never classify, assemble JSON, or write files.

---

## Phase 0 — Startup: Read State in Parallel

Before any data-gathering, load all local context in a **single parallel wave**:

In what follows, `${SKILL_DIR}` denotes the directory where this `SKILL.md` is installed (e.g. `~/.claude/skills/daily-dashboard/` for Claude Code / Cowork). The schema and validation harness ship inside the bundle and are loaded from that directory, not from `{config}`.

**Wave 0 (all simultaneously):**
1. Read `{config}/briefing_config.yaml` → user profile, schedule, deals, VIP channels, categories, email filters, calendar rules (user-maintained, NOT shipped with the skill)
2. Read `${SKILL_DIR}/briefing_schema.md` → schema compliance reference (human-readable)
3. Read `${SKILL_DIR}/briefing_schema.json` → machine-checkable JSON Schema used by the Phase 4.5 validation gate
4. Verify `${SKILL_DIR}/validate_briefing.py` exists and is executable (does not need to be read)
5. Read `{target}/daily.json` → previous run state (for `last_successful_run`, `run_type`, `action_items[].done` preservation, `update_sequence`)
6. Read `{target}/memory.md` → persistent cross-run facts (deal states, contacts, decisions)
7. Read `{target}/question.md` → pending questions awaiting user answers

### ⛔ Hard stop on missing config or schema

After Wave 0 completes, **before proceeding to any other phase**, verify that reads 1 and 2 succeeded:

- If `{config}/briefing_config.yaml` **could not be read** (file missing, path wrong, or empty):
  > ⛔ **daily-dashboard stopped — config not found.**
  > Could not read `{config}/briefing_config.yaml`.
  > Fix: confirm the file exists at that path, or re-run with `config={correct-path}`.
  > Example: `/daily-dashboard config=src/daily`
  
  **Do not proceed. Do not fetch any data. Stop here.**

- If `${SKILL_DIR}/briefing_schema.md` **could not be read** (file missing or empty):
  > ⛔ **daily-dashboard stopped — schema reference not found in skill bundle.**
  > Expected `briefing_schema.md` alongside this `SKILL.md`.
  > Fix: re-install the skill from a complete bundle.
  
  **Do not proceed. Do not fetch any data. Stop here.**

- If `${SKILL_DIR}/briefing_schema.json` **could not be read** or `${SKILL_DIR}/validate_briefing.py` is missing / not executable:
  > ⛔ **daily-dashboard stopped — validation harness not found in skill bundle.**
  > Expected `briefing_schema.json` (readable) and `validate_briefing.py` (executable) alongside this `SKILL.md`.
  > Fix: re-install the skill from a complete bundle. The skill will not write `daily.json` without a validation gate.

  **Do not proceed. Do not fetch any data. Stop here.**

All four files are required for every run type. There is no fallback or partial-run mode. The user's `briefing_config.yaml` is loaded from `{config}` (not the skill bundle); the schema and validator are loaded from the skill bundle (not `{config}`).

### Optional state files

If `daily.json` does not exist or `briefing_date` ≠ today → treat as first run of the day → run type is always **full** regardless of time.

If `memory.md` does not exist → create it from the template in the **Memory System** section below.

If `question.md` does not exist → create it from the template in the **Question System** section below.

---

## Phase 1 — Run Type Detection

Use this logic (unless `force=` overrides):

```
today = current date in user timezone (from briefing_config.yaml: user.timezone)
now   = current time in user timezone

# If no valid daily.json for today:
if daily.json missing OR daily.json.meta.briefing_date != today:
    run_type = "full"

# If daily.json exists for today:
elif now is within ±90 minutes of any time in briefing_config.yaml briefing.intraday_updates:
    run_type = "midday"

else:
    run_type = "incremental"
```

**Run type summary:**

| Type | When | What it fetches |
|---|---|---|
| `full` | First run of the day | Calendar + Email + Slack + Google Drive + full web intel (8–10 searches across all 6 categories) |
| `midday` | ±90 min of a scheduled intraday_updates time | Calendar + Email + Slack + Google Drive + abbreviated intel (2–3 targeted searches on active topics only) |
| `incremental` | Any other intraday pass | Calendar (conflict check only) + Email (new since last run) + Slack (new since last run) + no web intel |

Announce the detected run type to the user immediately:
> 🔄 **Running daily-dashboard** · Run type: **[full | midday | incremental]** · [time] CEST

---

## Phase 2 — Question Processing

Before fetching live data, process any answered questions from `{target}/question.md`:

1. Read all entries with status `[ANSWERED]`
2. For each answered question:
   - Extract the user's answer
   - Determine if the answer contains a persistent fact worth keeping (deal outcome, decision, contact update, meeting result)
   - If yes → append to the appropriate section of `{target}/memory.md` with today's date tag
   - Update the question status to `[PROCESSED]` in `question.md`
3. Questions with status `[PENDING]` are left untouched (they remain open for the user to answer)

Format for updating a question to processed:
```markdown
<!-- [PROCESSED 2026-04-28] Stored to memory: deal closed, Aspen signed -->
**[PROCESSED]** Which 19:00 meeting did you attend?
> You attended: CorpDev Team Meeting
```

---

## Phase 3 — Data Gathering

Phase 3 has two execution paths depending on the environment detected in Phase 0. The **data gathered is identical** — only the concurrency model differs.

---

### FULL RUN

#### claude.ai — sequential waves

Run these waves in order (each wave completes before the next starts):

**Wave 1 — Calendar + Email:**
- **Calendar:** Fetch all events for today (00:00–23:59 user timezone) via Google Calendar MCP. Extract: title, time, duration, attendees, location/video link, description, htmlLink. Classify each event per `briefing_config.yaml calendar_classification` rules.
- **Email:** Run 3 simultaneous queries via Gmail MCP:
  - `is:unread to:me` (direct recipient, last `email_lookback_hours` hours)
  - `is:important is:unread`
  - `is:starred is:unread`
  - Deduplicate results. For each email capture the message ID for deep-linking.

**Wave 2 — Slack channel resolution + Google Drive:**
- **Slack channel resolution:** Run the **Slack Channel Resolution Algorithm** (see below). Produces deduplicated `{channel_id, channel_name, url, deal_tag, priority}` list. Cache for this session.
- **Google Drive:** Targeted searches for each active deal and recent project updates. Capture `viewUrl` for every document found.

**Wave 3 — Slack channel reads (cap 4 simultaneous):**
- Read all resolved channels since `slack_lookback_hours` ago.
- **Hard cap: 4 channels simultaneously.** Batch remainder in groups of 4 — tool latency provides natural spacing.
- For each channel: extract messages, authors, timestamps, any Google Doc/Sheet/Slide links embedded in messages.

**Wave 4 — Web intelligence (8–10 searches, run simultaneously):**
For each category, construct 1–2 searches (using `intelligence_categories[].search_terms` as vocabulary):
- `ai_llms`: `"AI LLM news [current month year]"`, `"foundation model announcement [current month year]"`
- `ai_security`: `"AI security threat [current month year]"`, `"LLM vulnerability jailbreak [current month year]"`
- `ml_observability`: `"LLM observability monitoring news [current month year]"`, `"AI evaluation evals framework [current month year]"`
- `datadog`: `"Datadog news announcement [current month year]"`, `"DDOG Bits AI [current month year]"`
- `competitive`: `"Dynatrace Grafana Elastic observability news [current month year]"`, `"Datadog competitor funding acquisition [current month year]"`
- `vc_trends`: `"AI startup funding Series A B [current month year]"`, `"enterprise SaaS VC observability monitoring investment [current month year]"`

Surface 2–4 items per category with direct source URLs. Proceed to Phase 3.5 once all waves are done.

---

#### Cowork — parallel subagents

Spawn all data-gathering subagents simultaneously. Pass each subagent the relevant slice of `briefing_config.yaml` it needs (not the full file) to keep context lean. Each subagent returns a **structured JSON fragment** — it does not write files or assemble the briefing.

**Spawn these subagents in a single batch:**

```
[SA-CAL]    Calendar subagent
            Task: Fetch all today's events (00:00–23:59 user timezone) via Google Calendar MCP.
            Return: { "calendar_events": [...] }  — full event objects including htmlLink, attendees, hangoutLink

[SA-EMAIL]  Email subagent
            Task: Run 3 Gmail queries (is:unread to:me, is:important is:unread, is:starred is:unread),
                  deduplicate, capture message IDs and threadIds.
            Return: { "emails": [...] }  — full email objects with message_id, sender, subject, snippet, threadId

[SA-DRIVE]  Google Drive subagent
            Task: Targeted searches for each active deal + recent project updates.
            Return: { "drive_files": [...] }  — file name, webViewLink, modifiedTime, deal_tag hint

[SA-SLACK]  Slack subagent
            Task: (1) Run the Slack Channel Resolution Algorithm.
                  (2) Read all resolved channels since slack_lookback_hours ago (cap 4 simultaneous).
            Return: { "resolved_channels": [...], "slack_messages": { "CHANNEL_ID": [...], ... } }

[SA-INTEL]  Intelligence subagent
            Task: Run all 8–10 web searches across 6 categories simultaneously.
            Return: { "intelligence": [ { "category_id": "...", "items": [...] }, ... ] }
```

**Announce each subagent as it's spawned:**
> 🚀 Spawning 5 subagents in parallel: Calendar · Email · Drive · Slack · Intelligence

**Collect results:** Wait for all subagents to complete. If a subagent errors, treat it the same as a Wave error in the sequential path (see Error Handling). Log the failure and continue with partial data.

**After all subagents return,** pass all fragments to Phase 3.5 for tagging and classification.

> ✅ All subagents complete — proceeding to classification and JSON assembly.

---

### MIDDAY RUN

#### claude.ai — sequential waves

**Wave 1 — Calendar + Email:**
Same as full run Wave 1. Look for new invites, cancellations, or RSVP updates since `meta.last_successful_run`.

**Wave 2 — Slack channel resolution (if not cached):**
Reuse session-cached resolved channel list if available. Otherwise re-run the **Slack Channel Resolution Algorithm**.

**Wave 3 — Slack channel reads + abbreviated intel (simultaneously):**
- Read all resolved channels (cap 4 simultaneous) with `oldest = meta.last_successful_run`.
- **Abbreviated intel:** 2–3 targeted searches on active deal companies and today's breaking topics only — do not re-run all 6 categories.

Preserve `intelligence[]` from previous full run; prepend new items tagged with timestamp.

---

#### Cowork — parallel subagents

Spawn three subagents simultaneously:

```
[SA-CAL]    Calendar subagent  — same as full run
[SA-EMAIL]  Email subagent     — same as full run
[SA-SLACK-MIDDAY]  Slack + abbreviated intel subagent
            Task: (1) Reuse cached channel list or re-resolve.
                  (2) Read all channels with oldest = last_successful_run (cap 4 simultaneous).
                  (3) Run 2–3 targeted intel searches for active deals + breaking topics.
            Return: { "resolved_channels": [...], "slack_messages": {...}, "new_intel_items": [...] }
```

> 🚀 Spawning 3 subagents in parallel: Calendar · Email · Slack+Intel

---

### INCREMENTAL RUN

#### claude.ai — sequential waves

**Wave 1 — Email + Calendar conflict check (simultaneously):**
- Email: Fetch messages since `meta.last_successful_run` only (tight window).
- Calendar: Re-check for changes (new invites, cancellations, time changes). Re-evaluate `calendar.conflicts[]`.

**Wave 2 — Slack reads (new messages only, cap 4 simultaneous):**
- Use session-cached resolved channel list (or re-run resolution if not cached).
- Read all resolved channels with `oldest = meta.last_successful_run`.
- Skip channels quiet in the previous pass unless `priority: critical`.

No web intel on incremental runs.

---

#### Cowork — parallel subagents

Spawn two subagents simultaneously:

```
[SA-EMAIL-INC]   Email subagent (incremental)
                 Task: Fetch emails since last_successful_run only.
                 Return: { "new_emails": [...] }

[SA-SLACK-INC]   Slack subagent (incremental)
                 Task: Reuse cached channel list or re-resolve.
                       Read all channels with oldest = last_successful_run (cap 4 simultaneous).
                       Skip quiet channels except priority:critical ones.
                 Return: { "new_slack_messages": { "CHANNEL_ID": [...], ... } }
```

Also re-check calendar conflicts in the **main agent** (not a subagent — it's fast and needs the base object already in memory):
- Check for calendar changes since `meta.last_successful_run`. Update `calendar.conflicts[]` if any.

> 🚀 Spawning 2 subagents in parallel: Email · Slack  (calendar conflict check running in main agent)

No web intel on incremental runs.

---

## Slack Channel Resolution Algorithm

This algorithm is called from Wave 2 of every run type. It reads the channel configuration from `briefing_config.yaml` and produces a flat, deduplicated list of all channels to monitor.

### Inputs

Two sources of channel entries from `briefing_config.yaml`:
1. `vip_slack_channels[]` — standing channels always included regardless of activity
2. `active_deals[].slack_channels[]` — channels associated with each active deal

Each entry in either list uses exactly **one** of three matcher types:

| Matcher | Config key | How to resolve |
|---|---|---|
| Glob pattern | `pattern: "#*keyword*"` | Call `slack_search_channels` with the keyword; collect **all** channels whose name matches the glob |
| Exact name | `name: "#channel-name"` | Call `slack_search_channels` with the full name; take the first result whose name is an exact match |
| Explicit ID | `id: "CXXXXXXXX"` | Use the ID directly — no lookup needed |

### Resolution procedure

```
resolved = {}   # keyed by channel_id to deduplicate

for each source in [vip_slack_channels, active_deals[*].slack_channels]:
    for each entry in source:

        if entry has "pattern":
            keyword = entry.pattern stripped of "#", "*"   # e.g. "#*aspen*" → "aspen"
            results = slack_search_channels(query=keyword)
            for each channel in results:
                if channel.name matches the glob pattern:
                    resolved[channel.id] = {
                        channel_id:   channel.id,
                        channel_name: channel.name,
                        url:          "https://dd.slack.com/archives/" + channel.id,
                        deal_tag:     entry.deal_tag (or null),
                        priority:     entry.priority (or "medium")
                    }

        elif entry has "name":
            results = slack_search_channels(query=entry.name)
            match = first result where result.name == entry.name (exact, case-insensitive)
            if match:
                resolved[match.id] = {
                    channel_id:   match.id,
                    channel_name: match.name,
                    url:          "https://dd.slack.com/archives/" + match.id,
                    deal_tag:     entry.deal_tag (or null),
                    priority:     entry.priority (or "medium")
                }
            else:
                warn: "⚠️ Slack channel not found: {entry.name}"

        elif entry has "id":
            resolved[entry.id] = {
                channel_id:   entry.id,
                channel_name: entry.name (if provided) or "(unknown — looked up at read time)",
                url:          "https://dd.slack.com/archives/" + entry.id,
                deal_tag:     entry.deal_tag (or null),
                priority:     entry.priority (or "medium")
            }
```

### Key rules

- **Patterns match ALL results** — a `pattern: "#*aspen*"` entry includes every channel whose name contains "aspen", not just the ones the config author anticipated. This is intentional: as new deal channels are created during diligence, they are automatically picked up without config changes.
- **Deduplication by `channel_id`** — if the same channel appears in both `vip_slack_channels` and `active_deals[].slack_channels`, keep one entry. Use the higher `priority` value and preserve `deal_tag` (prefer non-null over null).
- **`active_deals` channels inherit their deal's `deal_tag`** automatically — every channel matched from `active_deals[X].slack_channels` gets `deal_tag: X.id`.
- **Warn, don't fail** — if a pattern resolves to 0 channels, or an exact name is not found, emit a warning in the Phase 6 run summary and continue. Only a hard failure writing the JSON stops the run.
- **Cache the resolved list** in memory for the duration of the session so MIDDAY and INCREMENTAL runs reuse it without re-calling `slack_search_channels`.

### Output

A flat list of resolved channel objects passed to Wave 3 for reading:

```json
[
  { "channel_id": "C0AQHD40GTH", "channel_name": "#int-aspen-corpdev",   "url": "...", "deal_tag": "aspen",      "priority": "critical" },
  { "channel_id": "C0ANAE97VSN", "channel_name": "#ext-aspen-corpdev",   "url": "...", "deal_tag": "aspen",      "priority": "critical" },
  { "channel_id": "C0ALW2QTA8M", "channel_name": "#ext-aspen-dd-prodeng","url": "...", "deal_tag": "aspen",      "priority": "high"     },
  { "channel_id": "C0AR2TGF4VC", "channel_name": "#ext-aspen-security-infra","url": "...", "deal_tag": "aspen",  "priority": "high"     },
  { "channel_id": "C0ATB0V796W", "channel_name": "#corpdev-puppygraph",  "url": "...", "deal_tag": "puppygraph", "priority": "high"     },
  { "channel_id": "C091XV12WKS", "channel_name": "#corpdev-org-all",     "url": "...", "deal_tag": null,         "priority": "high"     },
  { "channel_id": "C0AKRBZQSDQ", "channel_name": "#corpdev-sec-pod",     "url": "...", "deal_tag": null,         "priority": "high"     }
]
```

The count of resolved channels and any unresolved warnings are included in the Phase 6 run summary.

---

## Phase 3.5 — Tagging & Classification

After all data is gathered and before assembling the JSON, apply these rules to every calendar event, email item, and Slack message. Steps are cumulative — a later step adds to what an earlier step set, but never overrides a value already assigned.

---

### Step A — Assign `deal_tag`

Match each item against `briefing_config.yaml active_deals[]`:

**Calendar events:**
- If any attendee email domain matches a domain in any `active_deals[].key_contacts[].email` → assign that deal's `id`.
- If event title or description contains a deal's codename (e.g. "Aspen", "PuppyGraph", "Raindrop") → assign that deal's `id`.

**Emails (act_today + fyi):**
- If sender email matches any `active_deals[].key_contacts[].email` → assign that deal's `id`.
- If subject or body contains a deal codename or key contact name → assign that deal's `id`.

**Slack messages:**
- Already inherited from channel match in Phase 3 Waves 2/3: if a channel was resolved from an `active_deals[].slack_channels` pattern, all messages from that channel carry that deal's `deal_tag`.

If an item could match multiple deals, assign the most specific match (exact email match beats codename match).

---

### Step B — Assign `initiative`

For every calendar event, email item, and Slack message, scan the item's **title + subject + body + description** against each entry in `briefing_config.yaml initiatives[]`. Match is case-insensitive; first match wins.

```
for each initiative in briefing_config.yaml initiatives[] (in config order):
    for each keyword in initiative.keywords:
        if keyword found (case-insensitive) in item's searchable text:
            item.initiative = initiative.id
            stop
```

**Searchable text per source type:**
- Calendar event: title + description + participant names
- Email: subject + first 500 chars of body + sender name
- Slack message: message text + any linked document titles extracted from the message

If no keyword matches → `initiative: null`.

**Never invent an initiative id** not present in `briefing_config.yaml initiatives[]`. If something clearly belongs to a workstream not yet in config, leave `initiative: null` and surface a footer warning:
> ⚠️ Untagged initiative detected — consider adding to `src/daily/briefing_config.yaml`: "[suggested label]"

**Note:** `deal_tag` and `initiative` coexist and serve different filter axes. An email about the Aspen merger agreement will have both `deal_tag: "aspen"` and `initiative: "aspen_merger_agreement"`. This lets the display component filter by deal (all Aspen items) or by initiative (just merger agreement items, across email + Slack + calendar).

---

### Step C — Assign `urgency` to calendar events

Apply top-to-bottom — first matching rule wins:

| Rule | `urgency` |
|---|---|
| Any attendee in `calendar_classification.high_priority_attendees` (Oli, ALQ, Yanbing, Bharat) | `critical` |
| External meeting (`is_external: true`) with an active `deal_tag` | `critical` |
| External meeting (`is_external: true`) without a deal tag | `high` |
| Internal meeting with a `deal_tag` (internal deal sync) | `high` |
| Internal meeting with a hard deadline marker today (all-day "due today", BOD, board slides) | `high` |
| Routine internal meeting (sync, standup, 1:1, team meeting, all-hands) | `medium` |
| Optional or company-wide events Stefan can skip | `low` |
| Declined events, personal blocks, personal events | `low` |

---

### Step D — Assign `urgency` to email items

**For `act_today` items** (minimum `medium` — never assign lower):

| Rule | `urgency` |
|---|---|
| Sender is in `calendar_classification.high_priority_attendees` | `critical` |
| Email blocks a deal step, decision, or action happening in a meeting today | `critical` |
| Reply required before a specific meeting on today's calendar | `high` |
| Calendar invite with `needsAction` RSVP status for a same-day event | `high` |
| Action needed today but no specific time deadline | `medium` |

**For `fyi` items:**

| Rule | `urgency` |
|---|---|
| Pre-read for a meeting starting within 2 hours | `high` |
| Worth reading before end of day | `medium` |
| Background awareness, no time pressure today | `low` |

---

## Phase 4 — Compose and Write JSON

Phase 4 strategy depends on run type. The goal is **minimum token generation** — only regenerate sections that changed. Always start from the in-memory `daily.json` loaded in Phase 0 (the "base object") and mutate only what's needed.

---

### Common: Meta fields (all run types)

Always recompute `meta` fresh — it's tiny and always changes:

```json
"meta": {
  "briefing_date":         "YYYY-MM-DD",
  "generated_at":          "{ISO 8601 now with timezone offset}",
  "timezone":              "{from briefing_config.yaml user.timezone}",
  "update_sequence":       "{base.meta.update_sequence + 1, or 1 if first run today}",
  "last_successful_run":   "{base.meta.generated_at, or null if first run}",
  "run_type":              "full | midday | incremental",
  "next_meeting":          "{ ... } or null"
}
```

---

### FULL RUN — full reassembly

Assemble the entire JSON object from scratch. Do not carry forward any section from the base — all data was freshly gathered in Phase 3.

**Sections to generate:** `meta` · `greeting` · `meeting_preps` · `calendar` · `email` · `slack` · `intelligence` · `action_items` · `focus_prompt` · `fun`

**Action item merge (mandatory on full runs):** Do not match by positional `id` — it changes every run. Use the `fingerprint` merge algorithm defined in the schema:
- Build a fingerprint index from `base.action_items`
- For each newly derived item: if its fingerprint exists in the base, carry forward `done`, `completed_at`, `created_at`, and the existing `id`
- After merging, append any base items where `done: true` that are not in the new list (their source may have scrolled out of the fetch window — completed items must not silently disappear)
- Never set `done: false` on any item that was `done: true` in the base

Hold the composed object in memory and proceed to **Phase 4.5** for validation. Do not write to `{target}/daily.json` directly from this phase.

---

### MIDDAY RUN — delta merge (volatile sections only)

Start from the base object loaded in Phase 0. Regenerate only the sections that meaningfully change at midday. Copy everything else verbatim — do not re-tokenize stable sections.

**Sections to regenerate** (data was re-fetched in Phase 3):
- `meta` — always fresh
- `calendar` — re-fetched; may have new invites, cancellations, or RSVP changes
- `email` — re-fetched; new messages since last run
- `slack` — re-fetched; new messages since last run
- `action_items` — re-derive from updated calendar + email + slack; apply fingerprint merge algorithm (same as full run) to preserve `done`, `completed_at`, and `created_at` from base

**Sections to carry forward verbatim** (copy from base, do not regenerate):
- `greeting` — set once in the morning
- `meeting_preps` — generated during the morning full run; unchanged
- `intelligence` — carry forward from base; prepend any new midday intel items found in Phase 3 abbreviated searches, tagged with their timestamp. If no new items were found, copy base unchanged.
- `focus_prompt` — carry from base; only overwrite if a major new development (deal milestone, executive escalation) was found in this run
- `fun` — carry from base unchanged

**Merge procedure:**
```
output = base                           # start with full base object in memory
output.meta = freshly_computed_meta     # always replace
output.calendar = new_calendar_data     # replace with re-fetched
output.email = new_email_data           # replace with re-fetched
output.slack = new_slack_data           # replace with re-fetched
output.action_items = new_action_items  # re-derived; done flags merged from base
if new_intel_items found:
    output.intelligence = prepend new items to base.intelligence (per category)
# greeting, meeting_preps, focus_prompt, fun untouched
```

Hold the merged object in memory and proceed to **Phase 4.5**. Token cost of regeneration is proportional only to the changed sections — typically 20–30% of a full run.

---

### INCREMENTAL RUN — minimal delta

The fastest path: only process what arrived since `meta.last_successful_run`. Start from the base and apply targeted mutations — do not regenerate any section that has no new data.

**Always update:**
- `meta` — always fresh (tiny)
- `calendar.conflicts[]` — re-check for new scheduling conflicts from calendar data fetched in Phase 3 Wave 1; if no changes, carry forward unchanged
- `action_items` — re-derive open items from fresh email/Slack data; apply fingerprint merge algorithm to preserve `done`, `completed_at`, `created_at`; append newly derived items; retain base items where `done: true` even if not re-derived (source scrolled out of incremental window)

**Update only if new data arrived:**
- `email.act_today` — append new items from Phase 3 Wave 1; carry forward existing items unchanged
- `email.fyi` — append new items; carry forward existing
- `slack.channels[]` — for each channel: if new messages were found in Phase 3 Wave 2, append them to that channel's `messages[]`; if no new messages, carry the channel forward untouched

**Never update on incremental:**
- `greeting` — carry from base
- `meeting_preps` — carry from base
- `intelligence` — carry from base (no web fetches on incremental runs)
- `focus_prompt` — carry from base
- `fun` — carry from base
- `calendar.events[]` — carry from base (only `calendar.conflicts[]` is re-evaluated)

**Append procedure for email and Slack:**
```
for each new_email in phase3_new_emails:
    if new_email.message_id NOT in base.email.act_today[*].message_id
       and NOT in base.email.fyi[*].message_id:
        classify → append to output.email.act_today or output.email.fyi

for each channel in resolved_channels:
    new_messages = phase3_slack_reads[channel.id].new_since_last_run
    if new_messages is not empty:
        output.slack.channels[channel.id].messages.append(new_messages)
        output.slack.channels[channel.id].message_count += len(new_messages)
    # else: channel object is carried forward unchanged
```

Hold the mutated object in memory and proceed to **Phase 4.5**. Token cost: typically 5–10% of a full run. For a quiet incremental pass (no new email, no new Slack messages), the only real output is the updated `meta` block — the rest is a verbatim copy of the base.

---

### Source links (all run types)

Every surfaced item **must** carry a URL per the Source Link Policy below. Null is only allowed if definitively unlinkable; in that case include `url_note` explaining why.

---

### Future: Stable/Volatile split (architectural improvement)

Once the daily JSON grows large enough that even delta-merge writes become slow, split it into two files:

- **`daily-stable.json`** — sections that only change on full runs: `greeting`, `meeting_preps`, `intelligence`, `focus_prompt`, `fun`. Written once per morning; untouched on midday/incremental.
- **`daily.json`** — volatile sections only: `meta`, `calendar`, `email`, `slack`, `action_items`. Much smaller; overwritten on every run.

The display component merges both at render time. Incremental writes shrink to kilobytes regardless of how large the stable section grows. This is not currently implemented — document it here for when the need arises.

---

## Phase 4.5 — Validate-and-Repair Gate

The composed object from Phase 4 is **not** written directly to `daily.json`. It is first validated against `briefing_schema.json`. If validation fails, the skill enters a bounded repair loop. If repair fails, the existing `daily.json` is left **untouched** so downstream consumers (Yarvis, etc.) keep reading the last known-good briefing.

### Procedure

```
attempt = 0
candidate = composed_object_from_phase_4

while attempt < 3:
    attempt += 1

    # 1. Persist candidate to a hidden temp file (not yet daily.json)
    write candidate (pretty-printed JSON) to {target}/.daily.candidate.json

    # 2. Run the validator. It always emits a single JSON line on stdout.
    result = run "${SKILL_DIR}/validate_briefing.py ${SKILL_DIR}/briefing_schema.json {target}/.daily.candidate.json"

    # 3. On success: atomic rename, exit the loop, continue to Phase 5
    if result.valid is true:
        rename {target}/.daily.candidate.json -> {target}/daily.json   (atomic on POSIX)
        validation_passed = true
        break

    # 4. On fatal validator error (script crashed, schema unreadable): bail
    if result.fatal is true:
        validation_passed = false
        validation_failure_reason = result.errors[0].message
        break

    # 5. On schema violations: repair only the affected sections
    if attempt < 3:
        # Feed the errors + relevant schema fragment + offending JSON slice
        # back to the model. Ask it to produce a corrected version of ONLY
        # the fields/objects flagged. Do not regenerate the whole briefing.
        candidate = apply_repair(candidate, result.errors)
        continue

# After 3 attempts:
if not validation_passed:
    rename {target}/.daily.candidate.json -> {target}/daily.json.invalid
    # CRITICAL: do NOT touch the existing {target}/daily.json
    # CRITICAL: do NOT update memory.md or question.md (Phase 5 is gated below)
    proceed to Phase 6 with the failure variant
```

### Repair-prompt construction

For each iteration after the first, build a focused repair prompt:

1. **The error list** from `result.errors` (capped at 25). Each entry has `path`, `got`, `expected`, `message` — feed all four.
2. **The relevant schema fragment** for each unique parent path in the errors (e.g. if errors are at `/email/act_today/3/urgency`, include the `email_act_item.urgency` definition from `briefing_schema.json`).
3. **The offending JSON slice** for each error path — not the full briefing, just the failing object and one level up for context.
4. **The instruction**: "Produce a corrected version of *only* the affected fields/objects. Do not change anything else. Return the corrected slice as JSON."

Then merge the corrected slices back into the candidate and re-validate.

### Atomic write pattern

The `.daily.candidate.json` → `daily.json` rename is the atomic step. Never write directly to `daily.json` from the skill — even on the success path. POSIX `rename(2)` guarantees consumers either see the old file or the new file, never a half-written one. This matters because Yarvis (and any other reader) may be watching the file or polling it.

### What "do not touch daily.json" really means

After three failed validation attempts:
- `{target}/daily.json` is **not modified**. Yarvis keeps reading whatever briefing was last successfully validated.
- `{target}/.daily.candidate.json` is renamed to `{target}/daily.json.invalid` for inspection.
- `meta.last_successful_run` in the existing `daily.json` is also **not updated** — it still reflects the last good run.
- `memory.md` is **not updated** in Phase 5.
- `question.md` is **not updated** in Phase 5.

This converts hard failures (Yarvis can't parse → broken UI) into soft staleness (Yarvis shows yesterday's briefing → degraded but functional). For a scheduled-run setup, soft staleness is far easier to recover from than corrupted state.

---

## Phase 5 — Post-Run State Updates

**Gate:** Phase 5 only runs if Phase 4.5 succeeded (`validation_passed = true`). On validation failure, skip Phase 5 entirely and proceed straight to Phase 6 with the failure variant.

After successfully writing `daily.json`:

1. **Update `daily.json` meta:** Set `last_successful_run` to the `generated_at` timestamp just written. (This is a small second write — or include it in the first write by computing `generated_at` before starting Phase 4.)

2. **Update `{target}/memory.md`:**
   - Append any new persistent facts discovered in this run (new deal developments, key decisions, contact updates, important outcomes)
   - Do not duplicate facts already in memory
   - Apply 30-day retention: remove entries tagged `[YYYY-MM-DD]` where the date is more than 30 days ago, **unless** the entry is tagged with an active deal id from `briefing_config.yaml active_deals` and that deal's stage is not `closed` or `passed`

3. **Generate new questions for `{target}/question.md`:**
   - Review today's calendar events for external meetings that have now passed
   - For each completed external meeting not yet in memory with a known outcome → write a `[PENDING]` question asking what happened / what was decided
   - Only ask about events that would produce a useful persistent fact. Good examples:
     - "Did the [company] meeting go ahead? What was the outcome?"
     - "Did [person] confirm [decision/next step]?"
   - Do NOT ask about: email action items Stefan needs to take, calendar conflicts he needs to resolve, administrative tasks. Those belong in `action_items[]`.
   - Limit: add at most 3 new questions per run to avoid fatigue

4. **Print the run summary** (Phase 6 below)

---

## Phase 6 — Run Summary (Chat Only)

After all files are written (or after a validation failure), print a brief plain-text confirmation. This is the **only** output to the conversation — no HTML, no widget, no artifact.

### Success variant (Phase 4.5 passed)

```
✅ daily-dashboard · {run_type} run complete · {generated_at formatted as HH:MM TZ}

📄 {target}/daily.json written (update_sequence: {N}) — passed validation in {N} attempt(s)
📅 {N} calendar events · {N} conflicts
📬 {N} act-today emails · {N} fyi emails
💬 {N} Slack channels read
🧠 {N} intel items across {N} categories
✅ {N} action items ({N} open · {N} done)
{if untagged_initiative_warnings exist}
⚠️  Untagged initiatives detected — consider adding to briefing_config.yaml:
    {list each suggested label, one per line}
{endif}
{if memory.md was updated}
🗒️  memory.md updated ({N} new facts)
{endif}
{if question.md has new questions}
❓ {N} new question(s) written to {target}/question.md
{endif}
```

### Failure variant (Phase 4.5 exhausted 3 repair attempts, or fatal validator error)

```
⛔ daily-dashboard · {run_type} run FAILED VALIDATION — daily.json left untouched

   Existing {target}/daily.json was NOT modified — downstream consumers will
   continue to see the last known-good briefing.

   Bad candidate saved at: {target}/daily.json.invalid (for inspection)

   First {N} of {total} validation errors:
   - {path}: got {got}, expected {expected}
   - …

   memory.md and question.md were NOT updated for this run.
```

**Do not call `mcp__cowork__create_artifact`, `mcp__cowork__update_artifact`, `mcp__visualize__show_widget`, or any rendering tool here.** If the user wants a visual dashboard after seeing this summary, they can ask for one separately — that is a distinct request outside this skill.

---

## Source Link Policy

**This policy is mandatory.** Every item surfaced in the briefing must carry a clickable source link. The generation pass must actively collect URLs during data gathering — not reconstruct them after the fact.

| Source | Link format | Where to find it |
|---|---|---|
| Email | `https://mail.google.com/mail/u/0/#all/{messageId}` | Gmail MCP response field `id` |
| Gmail thread | `https://mail.google.com/mail/u/0/#all/{threadId}` | Gmail MCP response field `threadId` |
| Google Doc / Sheet / Slide | Full `https://docs.google.com/...` URL | Embedded in email body, Slack message, or calendar description — extract at read time |
| Slack channel | `https://dd.slack.com/archives/{channelId}` | Resolved in Wave 2 channel ID lookup |
| Slack message | `https://dd.slack.com/archives/{channelId}/p{timestamp_no_dot}` | Compose from channel_id + message ts (remove the `.`) |
| Google Calendar event | `event.htmlLink` from Calendar MCP response | Returned directly by the API |
| Google Calendar video | `event.hangoutLink` or conferenceData entry | Returned directly by the API |
| Google Drive file | `file.webViewLink` or `file.viewUrl` | Returned by Drive MCP `list_recent_files` / `search_files` |
| Web intelligence item | Article / post URL | From WebSearch result |
| Meeting prep file | `computer:///sessions/{session}/mnt/claude-chats/{target}/meeting-prep-{slug}.md` | Constructed from target path |

**Null is allowed only when:** the source type definitively has no URL (e.g. an in-person conversation, an automated system with no web interface). In that case set `url: null` and add `url_note: "reason"` to the object. Do not omit the `url` field entirely.

**Do not surface an item without a URL if a URL is obtainable.** If a Gmail message ID was not captured, re-fetch the email before writing the JSON rather than emitting a dead link.

---

## Memory System

**File:** `{target}/memory.md`

**Purpose:** Persistent cross-run fact store. Survives across days and sessions. Read in Phase 0, updated in Phase 5. Enables the briefing to carry institutional context forward without re-fetching it every time.

### Format

```markdown
# daily-dashboard memory
<!-- Auto-maintained by the daily-dashboard skill. Edit with care. -->
<!-- Retention: 30 days for general facts. Deal entries persist until stage = closed/passed. -->

## Deals

### [deal_id] — Deal Name
- [2026-04-27] Fact about the deal (e.g. "Merger Agreement Issues List v4 circulated — Special Holdback language carves out known infra issues. Source: Brian Peters in #ext-aspen-corpdev")
- [2026-04-27] Another fact (e.g. "Oli Pomel reviewing gitstat committer analysis — asked for Claude stack-rank by quantity/impact/complexity")

### [deal_id2] — Deal Name 2
- [2026-04-20] Fact...

## Contacts

- [2026-04-27] Julien Launay (Adaptive ML CEO) — prefers async Slack over email for quick decisions
- [2026-04-25] Adam Bateman (Push Security CEO) — met Stefan at RSA, warm intro, demoing Datadog integration

## Standing Context

- [2026-04-27] Note about a persistent situation (e.g. "PuppyGraph has a hard relocation requirement to US — Singapore-based team is a known integration risk")
- [2026-04-20] Background fact that remains relevant across runs

## Decisions & Outcomes

- [2026-04-27] Decision or outcome from a past meeting (e.g. "[Aspen] Agreed to move security holdback language to Schedule rather than main body — Brian + counsel aligned")

## Research Findings

- [2026-04-27] Relevant research result worth carrying forward (e.g. "Aspen src/exp/weightonly/ appears to be experimental quantization work — not in prod; asked Julien to clarify")
```

### Memory rules

- **Tag every entry** with `[YYYY-MM-DD]` for retention tracking.
- **Deduplicate.** Before appending, check if the same fact already exists. Update the existing entry rather than duplicating.
- **Retention:** Remove entries older than 30 days, with one exception: any entry under `## Deals / [deal_id]` where that deal's `stage` in `briefing_config.yaml` is not `closed` or `passed` — keep regardless of age.
- **Write style:** Factual, specific, with source attribution. Include channel name, person name, or document title so future runs can locate the original if needed.
- **Do not store:** ephemeral task status ("Stefan needs to reply to Oli today"), scheduled meeting details (calendar covers this), or raw message transcripts. Store only the extracted fact.

---

## Question System

**File:** `{target}/question.md`

**Purpose:** Async loopback between the skill and Stefan. The skill writes questions after each run when it needs retrospective information (meeting outcomes, deal decisions). Stefan annotates answers in the file. The skill reads and processes answered questions on the next run.

### Format

```markdown
# daily-dashboard questions
<!-- Written by the daily-dashboard skill. Answer in-place by adding text after the > prompt. -->
<!-- The skill processes [ANSWERED] entries on next run, stores facts to memory, marks [PROCESSED]. -->

---

## [PENDING] Question written by skill

**Asked:** 2026-04-27 · **Run:** full
**Context:** You had a 19:00 meeting conflict between two events.

Which 19:00 meeting did you attend — **CorpDev Team Meeting** or **Bits AI Sec Exec Update**?

> *(type your answer here)*

---

## [ANSWERED] Question the user has replied to

**Asked:** 2026-04-27 · **Run:** full
**Context:** Meticulous was on the calendar for today.

Did the Meticulous call with Ignacio happen on Apr 27? What was the outcome?

> It happened. Ignacio is aligned on a lightweight POC — no decision yet, following up in 2 weeks.

---

## [PROCESSED 2026-04-28] Already stored to memory

**Asked:** 2026-04-27 · **Run:** full
**Context:** Meticulous was on the calendar for today.

Did the Meticulous call with Ignacio happen on Apr 27? What was the outcome?

> It happened. Ignacio is aligned on a lightweight POC — no decision yet, following up in 2 weeks.
<!-- Stored to memory: Raindrop/Meticulous POC direction confirmed Apr 27 — Ignacio aligned, 2-week follow-up cadence -->
```

### Question rules

- **Only ask retrospective questions.** Valid: "What was the outcome of the Adaptive ML meeting?", "Did [person] confirm [decision]?" Invalid: "Have you replied to Oli's email?", "Did you resolve the 19:00 conflict?" (those are action items, not questions).
- **Max 3 new questions per run** to avoid fatigue. Prioritize questions about external meetings and deal decisions over internal syncs.
- **Processing flow:** `[PENDING]` → user edits file and changes to `[ANSWERED]` (or just adds answer text) → skill detects and changes to `[PROCESSED YYYY-MM-DD]` with a stored-fact annotation.
- **The skill detects answers** by checking if there is non-empty text after the `> ` prompt line. If text is present, treat as `[ANSWERED]` regardless of whether the user updated the status tag.
- **Removing questions:** The skill never removes questions from the file — it only advances their status. This preserves the audit trail. The file grows over time; old `[PROCESSED]` entries can be manually archived.

---

## Schema Compliance Checklist

**Structural shape, field types, enum values, ISO date/datetime formats, required-field presence, and the `url`/`url_note` conditional are now enforced automatically by the Phase 4.5 validation gate against `briefing_schema.json`. Do not waste cycles re-checking those items by hand.**

What the validator **cannot** check on its own — these remain your responsibility before declaring the run done:

### Cross-file references (the validator doesn't read briefing_config.yaml)
- [ ] Every non-null `deal_tag` resolves to an entry in `briefing_config.yaml active_deals[].id`
- [ ] Every non-null `initiative` resolves to an entry in `briefing_config.yaml initiatives[].id`
- [ ] Every `intelligence[].category_id` resolves to an entry in `briefing_config.yaml intelligence_categories[].id`

### Action-items merge invariants (semantic, not structural)
- [ ] Every base item with `done: true` is present in the output (not silently dropped if its source scrolled out of the fetch window)
- [ ] No item had `done` reset from `true` to `false` — fingerprint-matched items inherit `done`, `completed_at`, `created_at`, and the existing `id` from the base
- [ ] `created_at` is set to `now` only for genuinely new items (no fingerprint match in base)
- [ ] Output is sorted by priority desc, then deadline asc; done items sorted to the bottom

### Ordering and content quality
- [ ] `intelligence[]` is ordered by the `order` field of `briefing_config.yaml intelligence_categories[]`
- [ ] URLs are real deep-links captured at fetch time, not invented or reconstructed
- [ ] `slack.channels[].url` follows `https://dd.slack.com/archives/{channelId}` (validator only checks "url is a string"; it doesn't know your workspace)
- [ ] `email.*.url` follows `https://mail.google.com/mail/u/0/#all/{messageId}` for the same reason

---

## Error Handling

| Situation | Behavior |
|---|---|
| `briefing_config.yaml` not found or unreadable | **Hard stop** — see Phase 0. No data is fetched. Report path, suggest fix. |
| `briefing_schema.md` not found in skill bundle | **Hard stop** — see Phase 0. Re-install the skill from a complete bundle. |
| `briefing_schema.json` or `validate_briefing.py` not found in skill bundle | **Hard stop** — see Phase 0. Re-install the skill from a complete bundle. |
| Phase 4.5 validation fails on attempts 1–2 | Repair loop — feed errors back, regenerate affected sections, retry. |
| Phase 4.5 validation fails after 3 attempts | **No overwrite.** Existing `daily.json` left untouched. Bad candidate saved as `daily.json.invalid`. Surface failure in Phase 6. Skip Phase 5 (no memory/question updates). |
| `validate_briefing.py` crashes or returns `fatal: true` | Treat as exhaustion (third bullet above). Surface the fatal message in Phase 6. Do not overwrite. |
| `daily.json` not found (first run) | Treat as a fresh full run. Initialize `update_sequence: 1`, `last_successful_run: null`. |
| Slack channel pattern resolves to 0 channels | Log a warning in the briefing footer: "⚠️ VIP channel pattern `#*aspen*` resolved to 0 channels." Continue without failing. |
| Gmail MCP returns 0 results | Surface as "No new emails matching criteria" in the email section. Do not fail. |
| Google Calendar MCP returns error | Surface as "⚠️ Calendar unavailable — showing cached events from previous run." Carry forward previous `calendar[]` data. |
| WebSearch returns no results for a category | Omit that category from `intelligence[]` for this run. Do not hallucinate news items. |
| Write to `daily.json` fails | Report the error. Do not update `last_successful_run`. Do not update `memory.md` or `question.md`. |
| Question.md has malformed entries | Skip malformed entries. Log: "⚠️ Skipped 1 malformed entry in question.md." |

---

## Guidelines

- **Parallelism first.** In Cowork, spawn all independent subagents in a single batch. In claude.ai, run as many tool calls simultaneously as rate limits allow within each wave. Never serialize calls that are independent.
- **Subagents gather, main agent assembles.** Subagents (Cowork mode) only fetch and return raw data as JSON fragments. They never classify items, tag initiatives, write files, or assemble the briefing. All of Phase 3.5, Phase 4, Phase 5, and Phase 6 run in the main agent.
- **Pass only what subagents need.** When spawning a subagent, pass the relevant config slice — not the entire `briefing_config.yaml` — to keep each subagent's context window lean.
- **Slack rate limit cap.** Read at most **4 Slack channels simultaneously** — enforced whether running in a subagent (Cowork) or the main agent (claude.ai). More than 4 concurrent channel reads risks rate-limit errors that silently drop messages.
- **Announce progress.** In Cowork: announce subagents spawned and when they all return. In claude.ai: announce each wave as it starts. Example: `📡 Wave 3 — Reading 6 Slack channels (2 batches of 4/2)...`
- **Subagent failure = partial data, not full stop.** If a subagent errors (Cowork), log the failure in the Phase 6 run summary and continue assembly with partial data — same behaviour as a Wave error in sequential mode.
- **No hallucination.** If data is unavailable, say so explicitly in the relevant section. Do not invent news items, meeting attendees, or email content.
- **Carry forward, don't re-generate.** On incremental and midday runs, preserve the morning `intelligence[]`, `meeting_preps[]`, `focus_prompt`, and `fun` rather than regenerating them from scratch (see Phase 4 delta-merge rules).
- **Memory is a supplement, not a replacement.** Memory facts inform the briefing's context and `focus_prompt`. They do not replace live data fetching. Always fetch fresh data; use memory to add nuance.
- **One JSON file per day.** `daily.json` is overwritten on every run. The `update_sequence` and `generated_at` fields inside the JSON record which pass produced it. Historical briefings are not retained by this skill.
- **Source links at fetch time.** Capture message IDs, channel IDs, and document URLs during data-gathering. Reconstructing them after the fact is error-prone and often impossible.
