# `ai/` — daily-dashboard skill source

Working directory for the **daily-dashboard** Claude Skill that produces `daily.json` for Yarvis to consume. Everything that ships in the skill bundle lives here, plus the build script and the user's local `briefing_config.yaml`.

## What's in here

| File | Role | Shipped in skill bundle? |
|---|---|---|
| `daily-dashboard-SKILL.md` | The skill prompt — phases, run-type detection, validation gate, error handling. Renamed to `SKILL.md` in the bundle. | ✅ |
| `briefing_schema.md` | Human-readable schema doc — narrative, rendering guidance, merge rules. Companion to the JSON Schema. | ✅ |
| `briefing_schema.json` | **Authoritative shape contract** (JSON Schema 2020-12). Strict on `required`, types, enums, formats; lenient on extra fields (`additionalProperties: true`). | ✅ |
| `validate_briefing.py` | Stdlib-only validator used by the skill's Phase 4.5 validate-and-repair gate. No `uv`, no PyPI, no network. | ✅ |
| `build_skill.py` | Packager — produces `dist/daily-dashboard.zip`. | ❌ |
| `briefing_config.yaml` | User-specific config (deals, VIP channels, etc.). Stays in the user's `{config}` directory; never bundled. | ❌ |
| `dist/daily-dashboard.zip` | Build artifact ready to install. | (this *is* the bundle) |

## The critical invariant — schema and validator are coupled

> **`briefing_schema.json` and `validate_briefing.py` MUST change together.**

The validator is intentionally stdlib-only (no `jsonschema`, no `uv` deps) so it works in sandboxed environments like Cowork without network access. As a consequence, **it only implements the subset of JSON Schema 2020-12 we currently use**. If you add a new schema feature, the validator will silently ignore it — letting non-conformant briefings slip through.

### Validator feature support (current)

| Feature | Supported? |
|---|---|
| `type` (string, integer, number, boolean, array, object, null) | ✅ |
| `type` as list (e.g. `["string", "null"]`) | ✅ |
| `enum` | ✅ |
| `pattern` (regex via `re.search`) | ✅ |
| `required` | ✅ |
| `properties` | ✅ |
| `items` (single schema) | ✅ |
| `additionalProperties: true` / `false` | ✅ |
| `minItems` | ✅ |
| `minimum` | ✅ |
| `oneOf` (with fast-path for X-or-null) | ✅ |
| `if` / `then` / `else` (object-level) | ✅ |
| `$ref` to `#/$defs/<name>` | ✅ |
| `prefixItems`, `contains`, `unevaluatedProperties` | ❌ |
| `allOf`, `anyOf`, `not` | ❌ |
| `multipleOf`, `maximum`, `exclusiveMin/Max` | ❌ |
| `maxItems`, `uniqueItems`, `maxProperties`, `minProperties` | ❌ |
| `format` keyword (e.g. `"format": "date-time"`) | ❌ — use `pattern` instead |
| External `$ref` (URL or other-file) | ❌ — fatal error |
| `dependentRequired` / `dependentSchemas` | ❌ |
| `const` | ❌ — use `enum: [...]` with one value |

### When you change the schema

1. **Adding fields, enums, patterns** using already-supported features → just edit `briefing_schema.json` and re-run the smoke test (below). No validator change needed.
2. **Using a feature from the ❌ list** → **first extend `validate_briefing.py`** to support it, add a negative-case test, *then* use it in the schema.
3. **Renaming or removing a field** → update both the JSON Schema and the markdown companion (`briefing_schema.md`). Yarvis's Rust types in `src-tauri/src/commands/dashboard.rs` will silently drop unknown fields, so they won't break — but if you remove a field Yarvis relies on, it will. Search the Rust types before pruning.

### Smoke-test loop after schema or validator edits

```bash
# Verify the validator still passes a real briefing
ai/validate_briefing.py ai/briefing_schema.json ~/claude-chats/briefings/daily/daily.json

# Verify it still catches drift (rename a field, change an enum value, etc.)
# — see the negative cases in the previous commit messages for examples
```

## Build, install, update

```bash
# Build the bundle
ai/build_skill.py
# → ai/dist/daily-dashboard.zip

# Install or update (Claude Code / Cowork — re-running overwrites)
unzip -o ai/dist/daily-dashboard.zip -d ~/.claude/skills/

# Claude Desktop / claude.ai
# Upload the zip via Customize > Skills > "+"
```

The build script pre-validates the SKILL.md frontmatter (`name`, `description` required; `version` reported) and refuses to package if either core field is missing.

## Versioning

Bump the `version:` field in `daily-dashboard-SKILL.md`'s frontmatter for any user-visible change. The build script reports the version on every build; mismatches surface immediately.

Suggested cadence:
- **Patch** (1.x.Y) — bug fixes in the skill prompt, validator improvements that don't change behaviour, schema clarifications.
- **Minor** (1.X.0) — new optional schema fields, additional validator features, new run-type behaviour.
- **Major** (X.0.0) — breaking schema changes, removed required fields, changes to the bundle layout.

## How this connects to Yarvis

The skill produces `daily.json` at `{target}/daily.json` (default `~/claude-chats/briefings/daily/daily.json`). Yarvis reads it via the `read_daily` Rust command (`src-tauri/src/commands/dashboard.rs`) and renders it in the dashboard. The Yarvis Rust types are intentionally lenient (`#[serde(default)]` on most fields) so they survive minor schema additions; the **validator is the safety net** that catches missing required fields and drift before Yarvis ever sees a bad file.

If a validation run fails three times, the skill leaves the existing `daily.json` untouched and writes the bad candidate to `daily.json.invalid`. Yarvis keeps reading the last known-good briefing — degraded but functional.

## Anti-pattern reference (things to NOT do)

- ❌ Add `briefing_config.yaml` to the bundle. It's user data and changes per deployment.
- ❌ Re-introduce the `uv run --script` shebang on the validator. Cowork's sandbox blocks PyPI fetches.
- ❌ Use `format: "date-time"` in the schema. The stdlib validator doesn't implement format keywords; use `pattern` with an explicit regex.
- ❌ Reference an external `$ref` (e.g. another file or a URL). Validator only resolves `#/$defs/<name>`; anything else is a fatal validator error.
- ❌ Add new schema features without first extending the validator — drift will not be caught.
