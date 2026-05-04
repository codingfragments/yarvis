# daily-dashboard skill source — plan (retrospective)

## Goal
Bring the `daily-dashboard` Claude skill — the producer that writes the `daily.json` Yarvis consumes — into the Yarvis repo as version-controlled source. Ship it as a self-contained, installable skill bundle with a stability-first validation harness so scheduled Cowork runs always either produce a valid briefing or leave the previous good one untouched.

## Why it lives in the Yarvis repo
The skill and Yarvis are tightly coupled — the skill produces the JSON, Yarvis parses it. The schema is the contract between them. Keeping both in one repo means:
- Single source of truth for the schema (Yarvis Rust types and the producer schema can be kept in lockstep deliberately).
- One place for the README that explains the producer/consumer relationship.
- Future option of generating the JSON Schema from Yarvis's Rust types (`schemars`) without cross-repo coordination.
- Memory rules about coupling between schema and validator naturally apply to Yarvis sessions (they're already loaded for this project).

## What ships in the bundle
The build artifact is `dist/daily-dashboard.zip` — a flat directory of four files unzipping into `~/.claude/skills/daily-dashboard/`:

- `SKILL.md` — phases, run-type detection, validate-and-repair gate, error handling. Renamed from the source's `daily-dashboard-SKILL.md` at build time.
- `briefing_schema.json` — strict-required, lenient-on-extras JSON Schema 2020-12.
- `briefing_schema.md` — human-readable companion (narrative, rendering, merge rules).
- `validate_briefing.py` — stdlib-only validator, executable bit preserved.

The user's `briefing_config.yaml` (deal codenames, exec emails, Slack channels) is NOT bundled — that's their own data, sourced from `{config}` per-invocation.

## Stability story
Three layered safeguards make scheduled runs robust:

1. **Strict JSON Schema** with explicit `enum`, `required`, `pattern`, and conditional `if/then` rules. Catches the most common LLM drift — typo'd field names, out-of-enum values, missing required fields, malformed dates.
2. **Validate-and-repair gate (Phase 4.5)** — composed JSON is held in memory, written to a temp file, validated; on failure the schema errors are fed back to the model and only the affected sections regenerated; up to 3 attempts.
3. **Don't-overwrite-on-failure** — after 3 failed attempts the existing `daily.json` is left untouched and the bad candidate is renamed to `daily.json.invalid`. Yarvis keeps reading the last known-good briefing — degraded but functional. Hard parse failures become soft staleness.

## Validator design choice — pure stdlib

The validator started as `jsonschema` package + `uv run --script` shebang with PEP 723 deps. That works locally but **fails in Cowork's sandbox** which blocks PyPI fetches. Rewrote to a stdlib-only implementation supporting only the JSON Schema 2020-12 features the schema actually uses (`type`, `enum`, `pattern`, `required`, `properties`, `items`, `additionalProperties`, `minItems`, `minimum`, `oneOf` with X-or-null fast-path, `if/then/else`, `$ref` to `#/$defs/<name>`).

Trade-off: the schema is now constrained to that feature set. Adding a schema feature requires extending the validator first — captured as an auto-memory rule and documented in the README.

Verified against six classic drift patterns: renamed required fields, out-of-enum urgency, case-sensitivity (`High` vs `high`), missing `fingerprint`, top-level renames (`actionItems` vs `action_items`), bad date formats. All caught with actionable `{path, got, expected}` errors.

## Iteration arc
1. Drafted `briefing_schema.json` from the markdown spec; ran it against today's real `daily.json` → 57 errors. Surfaced six categories of producer-vs-spec drift (`action_items[].initiative` undocumented but always emitted, `action_done_N` id convention, extra fields on calendar events / meeting preps / slack messages, calendar fingerprints with `:` characters).
2. Decision: lenient mode (`additionalProperties: true`) + document the six drift fields + relax fingerprint regex + relax id pattern. Schema reflects producer reality; required fields and enums still strict.
3. Wrote `validate_briefing.py` with `uv` shebang and PEP 723 — clean local run, but Cowork sandbox blocked PyPI fetch.
4. Rewrote validator as pure stdlib (no `uv`, no `jsonschema`).
5. Updated `SKILL.md` with Phase 4.5 algorithm, atomic-rename pattern, don't-overwrite rule, error-handling table, shrunk Schema Compliance Checklist to semantic-only items.
6. Restructured for skill-bundle convention: schema and validator move from `{config}` (where the user's config.yaml lives) into the skill's own bundle dir (referenced as `${SKILL_DIR}/...` in the skill text). User config stays where it is.
7. Wrote `build_skill.py` (stdlib-only, uv shebang for consistency, no deps). Pre-validates frontmatter, preserves executable bits, prints version on every build. Output: `dist/daily-dashboard.zip` (~38 KB).
8. Wrote `README.md` documenting the architecture, validator's exact feature support (✅/❌ table), build/install loop, anti-patterns. Saved an auto-memory entry tying schema and validator coupling so future sessions enforce it.

## Files in this PR
- `ai/README.md` — onboarding doc, anti-patterns, validator feature table.
- `ai/daily-dashboard-SKILL.md` — the skill prompt (with the new Phase 4.5 gate, `${SKILL_DIR}` references, frontmatter `version: 1.2.0`).
- `ai/briefing_schema.md` — human-readable schema doc, updated with the six drift fields and a "JSON Schema is authoritative" header note.
- `ai/briefing_schema.json` — strict JSON Schema 2020-12.
- `ai/validate_briefing.py` — stdlib-only validator.
- `ai/build_skill.py` — packager.
- `.gitignore` — adds `ai/briefing_config.yaml` (sensitive deal data; public repo). `ai/dist/` is already covered by the existing `dist/` rule.
- `specs/2026-05-04_daily-dashboard-skill_plan.md` — this file.

## Out of scope (intentional)
- Generating `briefing_schema.json` from Yarvis Rust types via `schemars`. Long-term right move (single source of truth) but a real refactor — current types are intentionally lenient with `#[serde(default)]` everywhere.
- A sanitized `briefing_config.example.yaml` template. Easy follow-up if onboarding others.
- Per-subagent fragment validation (Tier 2 in the original analysis). Cheap to add later if drift patterns shift toward subagent-side errors.
- Anthropic API `tool_use` enforced JSON Schema (Tier 4). Strongest fix but depends on what Cowork harness exposes; revisit if drift persists despite the validate-and-repair gate.

## Verification
- Validator passes today's real `daily.json` (37 actions, 14 events): `{"valid": true}` exit 0.
- Validator catches all six classic drift patterns with actionable errors.
- `build_skill.py` produces a 38 KB zip; round-trip extract + run validator from inside the bundle works.
- `git check-ignore` confirms `ai/briefing_config.yaml` and `ai/dist/daily-dashboard.zip` are excluded from the repo.
