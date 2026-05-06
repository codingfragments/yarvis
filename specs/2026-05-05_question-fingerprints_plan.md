# Question fingerprinting & dedup (C1 from the dashboard polish backlog)

Captured 2026-05-05.

## Problem

`question.md` grows on every briefing run. The skill currently identifies
questions only by their text title, so the same retrospective question
("Did the Aspen meeting happen on Apr 27?") can be re-appended on
consecutive runs whenever the underlying calendar event is still in the
fetch window. Once a user has answered (or even processed) that question,
seeing it generated again is noise.

## Where questions actually live

- Storage: `~/.../briefings/daily/question.md` — markdown, free-form, with
  `## [PENDING|ANSWERED|PROCESSED]` headers.
- They are **not** in `daily.json` and therefore not validated by
  `briefing_schema.json` / `validate_briefing.py`. (The plan's
  earlier "schema impact" note was inaccurate — those files don't change.)
- Frontend: `dashboard.rs::parse_questions` reads `question.md` and surfaces
  `DashboardQuestion` to the Svelte UI.

## Fingerprint scheme

`q-{first16hex(sha1(normalized_text))}`.

- Normalize: lowercase, collapse whitespace, strip leading/trailing
  punctuation. Same idea as the plan's hint.
- 64 bits is more than enough for ≤3 questions per day.
- The `q-` prefix keeps the namespace distinct from
  `action_item.fingerprint` (`email-`, `slack-`, `calendar-`, `intel-`,
  `manual-`, `fallback-`).

## `question.md` format addition

A new metadata line, alongside `**Asked:**` and `**Context:**`:

```markdown
## [PENDING] Did the Aspen meeting happen on Apr 27?

**Asked:** 2026-04-27 · **Run:** full
**Fingerprint:** q-1a2b3c4d5e6f7890
**Context:** Aspen merger sync was on the calendar.

> *(type your answer here)*

---
```

Backwards-compatible: legacy entries without `**Fingerprint:**` parse fine,
they just expose `fingerprint: null` to the frontend.

## Skill update — `ai/daily-dashboard-SKILL.md` (1.2.0 → 1.3.0)

Phase 5 step 3 (Generate new questions) gets a dedup pass:

```
existing_fps = { fp from each fingerprinted entry in question.md, any status }

for each candidate retrospective question:
    fp = "q-" + sha1(normalize(text))[:16]
    if fp in existing_fps:        # skip — already on file in some state
        continue
    append new [PENDING] block including **Fingerprint:** fp
```

Decisions baked in (per discussion):

- **Skip on `[PROCESSED]` match** rather than reopen. Preserves the SKILL's
  "advance status only" audit-trail rule. The user can manually reopen if
  they want a previously-answered question re-asked.
- **No `**Last seen:**` field** — adds churn without clear payoff once we
  skip duplicates entirely.

Document the fingerprint scheme in the **Question System** section of the
SKILL.

## Rust changes — `src-tauri/src/commands/dashboard.rs`

- Add `fingerprint: Option<String>` to `DashboardQuestion`.
- Extend `parse_questions` to recognise a `**Fingerprint:**` line, mirroring
  the existing `**Asked:**` / `**Context:**` handling.
- Extend `patch_question_answer` to match by fingerprint first, falling
  back to title — same shape as `set_action_done`. The Tauri
  `answer_question` command gains an optional `fingerprint` parameter.
- Tests:
  - `parse_questions` extracts the fingerprint when present.
  - `parse_questions` returns `None` when absent.
  - `patch_question_answer` matches by fingerprint when supplied, even if
    the title has been edited in the file (ensures stable matching across
    audit-trail entries with the same title).

## Frontend changes

- `src/lib/types/index.ts` — add `fingerprint: string | null` to
  `DashboardQuestion`.
- `src/lib/services/dashboard.ts` — `answerQuestion` accepts an optional
  fingerprint and passes it through.
- `src/lib/stores/dashboard.svelte.ts` — pass fingerprint when calling
  the service.
- `src/lib/components/dashboard/tabs/SummaryTab.svelte` — change the
  each-key from `(q.title)` to `(q.fingerprint ?? q.title)` for stability
  with audit-trail duplicates.

## Build + verify

```bash
ai/build_skill.py                            # repackage daily-dashboard.zip
unzip -o ai/dist/daily-dashboard.zip -d ~/.claude/skills/

ai/validate_briefing.py ai/briefing_schema.json \
  ~/claude-chats/briefings/daily/daily.json  # smoke test (no schema change)

cd src-tauri && cargo test --lib            # parser tests
bun run check                                # TS / Svelte check
```

## Out of scope

- No change to `briefing_schema.json` / `validate_briefing.py` (questions
  aren't in the JSON contract).
- No migration of legacy entries — they stay as audit trail without
  fingerprints; the dedup index simply ignores them.
- No reopen path — explicitly deferred.
