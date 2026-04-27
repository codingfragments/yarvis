# Dashboard question editor — implementation plan

Phase 2 of the dashboard, scoped tight: answer `question.md` entries
from the dashboard via a modal editor, restyle the question cards to
match the rest of the theme, add an "open only" filter that's on by
default.

## Backend (Rust)

New command `answer_question(daily_dir, title, answer)`:
- Reads `question.md`.
- Locates the question by title (matches `## [PENDING] <title>` or
  `## [ANSWERED] <title>` — refuses `[PROCESSED]`).
- Replaces the contiguous blockquote (`> …`) inside that section with
  the new answer text, prefixing each answer line with `> `.
- Flips header status `[PENDING]` → `[ANSWERED]`.
- If the user submits empty / whitespace, restores the placeholder
  `> *(type your answer here)*` and flips status back to `[PENDING]`.
- Match by *title*, not line index, so a parallel skill rewrite that
  shifts lines doesn't corrupt the wrong question.
- Idempotent: `[ANSWERED] → [ANSWERED]` (re-edit) is fine.

## Frontend

New components:
- `QuestionEditor.svelte` — centered modal: header (status pill + title +
  asked date), body (context, rendered question body, answer textarea,
  error slot), footer (Cancel + Save). Esc and backdrop close.
- `QuestionStatusPill.svelte` — small reusable pill for PENDING /
  ANSWERED / PROCESSED with tone-mapped colours.

Store:
- `answerQuestion(daily_dir, title, answer)` calls the service then
  re-reads questions only (cheap, one file).
- `submittingAnswer: boolean` for the UI.

Page (Summary tab, "Pending questions" card):
- Restyle each question as a clean themed card with status pill, title,
  context (italic), question body (render via MarkdownRenderer for bold
  emphasis), optional answer block (success-tinted), and an Answer/Edit
  button on the right that opens the modal.
- Header gets a "Open only" toggle pill, on by default. Filters out
  ANSWERED + PROCESSED. Section count badge shows filtered count with
  total in a subtitle.
- Card is no longer collapsible-by-default-closed; with the filter on
  it's already short.

## What we're not doing this PR

- Inline-on-page textarea (decision was inline-with-autosave originally,
  but a modal is the cleaner write surface and avoids the awkward
  scroll-position-while-typing issue inside a constrained-height tab).
  Inline could come later if it feels needed.
- Conflict detection if the skill rewrites the file mid-edit. Last-write
  wins; acceptable risk for a personal tool.

## Branch + PR

- `feature/dashboard-question-editor`
- One PR. Archive plan to `specs/2026-04-27_dashboard-question-editor_plan.md`
  before opening.
