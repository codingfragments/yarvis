# Yarvis QA Rollout Checklist (Documentation-Only)

Date: 2026-04-28
Companion doc: `spec/codex_qa.md`

This file turns the strategy in `codex_qa.md` into PR-ready execution checklists.
Nothing here requires code changes by itself. It is intended for planning, review, and sequencing.

## 1) PR-Ready Rollout Checklist (GitHub Actions + QA Gates)

Use this as a literal step-by-step runbook while preparing PRs.

## Phase A: Prepare workflows in a feature branch

Branch name suggestion:

- `chore/ci-quality-gates`

Checklist:

- [ ] Confirm current branch is not `main`.
- [ ] Confirm `main` is clean and up to date before branching.
- [ ] Draft workflow intent in PR description before opening PR:
  - [ ] Which checks are required vs informational?
  - [ ] Which triggers are used? (`pull_request`, `push`, `workflow_dispatch`)
  - [ ] Which artifact retention policy is expected?

Conversation tip:
Treat this PR like infrastructure, not code polish. Ask: "What breaks if this workflow is down?" If the answer is "we can merge broken app states," make it required.

## Phase B: PR for quality gates workflow

PR title suggestion:

- `chore(ci): add quality gates for Svelte and Rust checks`

Checklist:

- [ ] Workflow runs on `pull_request` to `main`.
- [ ] Workflow includes:
  - [ ] `bun run check`
  - [ ] `bun run build`
  - [ ] `cargo check --manifest-path src-tauri/Cargo.toml`
- [ ] Optional but recommended once tests exist:
  - [ ] `cargo test --manifest-path src-tauri/Cargo.toml`
  - [ ] frontend unit test command
- [ ] Workflow fails the PR on any failed gate.
- [ ] CI output is readable (named steps, grouped logs).
- [ ] PR includes screenshot or pasted summary of a passing run.

Review example:

- Weak review comment: "CI added."
- Strong review comment: "What signal does each job protect, and which one should block merges?"

## Phase C: PR for multi-platform Tauri build on `main`

PR title suggestion:

- `chore(ci): add Tauri multi-platform build matrix on main`

Checklist:

- [ ] Workflow runs on `push` to `main`.
- [ ] Workflow supports manual trigger (`workflow_dispatch`).
- [ ] Matrix includes:
  - [ ] `macos-latest`
  - [ ] `ubuntu-22.04`
  - [ ] `windows-latest`
- [ ] Linux dependencies are explicitly installed.
- [ ] `bun install --frozen-lockfile` is used.
- [ ] `bun run tauri:build` runs for every matrix entry.
- [ ] Build artifacts are uploaded per platform.
- [ ] Artifact names are OS-specific and easy to identify.
- [ ] PR includes one successful matrix screenshot.

Conversation tip:
If a matrix build takes longer, do not optimize it away first. First prove reliability, then tune runtime.

## Phase D: Rollout hygiene PRs (small follow-ups)

PR title suggestions:

- `docs: align README build artifact example with current versioning`
- `chore(tauri): fix tauri.conf schema reference`
- `chore(ci): improve workflow cache and job names`

Checklist:

- [ ] One concern per PR where possible.
- [ ] Every PR has explicit "what risk this removes" note.
- [ ] Link each PR back to `spec/codex_qa.md` item number.

## 2) Branch Protection Settings for `main` (Copy-Paste Ready)

Navigation:

- GitHub repo -> `Settings` -> `Branches` -> `Add branch protection rule`

Branch pattern:

- `main`

Recommended settings:

1. Enable `Require a pull request before merging`
   - Require approvals: `1` minimum
   - Dismiss stale approvals when new commits are pushed: `ON`
   - Require review from Code Owners: `OFF` (turn `ON` later if needed)

2. Enable `Require status checks to pass before merging`
   - `Require branches to be up to date before merging`: `ON`
   - Required checks (example names, align to workflow job names):
     - `quality-gates / svelte-rust-checks`
     - `tauri-multiplatform / build (macos-latest)`
     - `tauri-multiplatform / build (ubuntu-22.04)`
     - `tauri-multiplatform / build (windows-latest)`

3. Enable `Require conversation resolution before merging`

4. Enable `Do not allow bypassing the above settings`
   - Keep admins included unless you have an explicit emergency process.

5. Keep disabled initially:
   - `Require signed commits` (enable when team process is ready)
   - `Require linear history` (optional; depends on merge strategy)

Practical note:
If you make all matrix jobs required immediately, temporary runner issues can block all merges. If that becomes noisy, keep quality-gates required and make matrix checks required once they are stable for a week.

## 2.1) Why these branch protection settings are suggested

Think of branch protection as a safety rail, not a bureaucracy layer. Each switch prevents a specific failure mode.

1. `Require a pull request before merging`
   - Why: Forces a visible review surface and keeps risky direct pushes out of `main`.
   - Failure mode prevented: "Quick fix directly on main" that skips checks and context.
   - Tradeoff: Slightly slower merge path, but far better traceability.

2. `Require 1 approval`
   - Why: At least one second pass catches obvious misses in CI/workflow changes.
   - Failure mode prevented: Author blind spots, especially in infra/config PRs.
   - Tradeoff: For solo work, this can be self-review plus delayed merge if needed; for teams, it should stay mandatory.

3. `Dismiss stale approvals when new commits are pushed`
   - Why: An approval on old code should not silently apply to new code.
   - Failure mode prevented: "Approved PR" where meaningful changes were added after review.
   - Example: Workflow looked safe, then a final commit changed required checks naming and broke branch protection logic.

4. `Require status checks to pass before merging`
   - Why: Prevents subjective "seems fine" merges when objective checks are red.
   - Failure mode prevented: Regressions entering `main` because failures were noticed too late.
   - Practical point: Keep check names stable, or branch rules can lose enforcement silently.

5. `Require branches to be up to date before merging`
   - Why: Ensures PR checks are run against current `main`, not an older base.
   - Failure mode prevented: Merge succeeds, then `main` breaks due to combined changes never tested together.
   - Tradeoff: More rebases/merges for active repos, but fewer post-merge surprises.

6. `Require conversation resolution before merging`
   - Why: Stops unresolved review concerns from being bypassed.
   - Failure mode prevented: "Let's merge now and fix later" unresolved technical debt.
   - Team behavior benefit: Forces explicit decisions instead of implicit drift.

7. `Do not allow bypassing the above settings`
   - Why: Rules that can be bypassed under pressure are not real rules.
   - Failure mode prevented: Emergency or deadline pushes directly to protected branches.
   - Tradeoff: You need an explicit break-glass process for true emergencies.

8. Keep `Require signed commits` disabled at first
   - Why: Good security control, but it can slow early rollout if contributor setup is inconsistent.
   - When to enable: After CI and release flow are stable and contributor tooling is documented.

9. Keep `Require linear history` optional
   - Why: Depends on preferred git model.
   - Enable if: You want strictly rebased history and clean bisecting.
   - Keep off if: You rely on merge commits to preserve feature branch context.

Conversation rule of thumb:
If a setting prevents a production-facing failure mode and has acceptable friction, keep it `ON`.
If a setting is mainly governance polish with high near-term friction, stage it for phase 2.

## 2.2) Branch protection presets (minimum vs maximum strict)

Use this as a practical dial. Start with "Minimum Strict" now, then move to "Maximum Strict" once CI is stable and contributors are comfortable.

| Setting | Minimum Strict (recommended now) | Maximum Strict (later hardening) |
|---|---|---|
| Require pull request before merge | ON | ON |
| Required approvals | 1 | 2 |
| Dismiss stale approvals on new commits | ON | ON |
| Require Code Owner review | OFF | ON |
| Require status checks to pass | ON | ON |
| Require branch up to date before merge | ON | ON |
| Require conversation resolution | ON | ON |
| Do not allow bypassing | ON | ON |
| Require signed commits | OFF | ON |
| Require linear history | OFF (optional) | ON |
| Allow force pushes | OFF | OFF |
| Allow deletions | OFF | OFF |

When to use each:

1. Minimum Strict:
   - Best for solo or early-stage projects.
   - Gives strong safety with low operational friction.
   - Ideal while workflows are still being tuned.

2. Maximum Strict:
   - Best for multi-contributor repos and release-critical branches.
   - Reduces policy bypass risk and strengthens auditability.
   - Use after CI has been stable for at least 1-2 weeks.

Migration path:

1. Enable Minimum Strict immediately.
2. Watch CI reliability and merge pain for one sprint.
3. Turn on `signed commits` and `Code Owner review`.
4. Consider `linear history` only if your merge model supports it cleanly.

## 3) Definition of Ready (DoR) Templates by QA Item

Use these before starting each implementation PR. If an item is not "ready," do not start coding yet.

## Item 1: Test stack (frontend + backend + smoke)

DoR checklist:

- [ ] Exact test scope is named (what is in, what is out).
- [ ] First critical behaviors are identified (not just "add tests").
- [ ] Commands are agreed (`bun` and `cargo` test commands).
- [ ] CI execution strategy is agreed (parallel or serial).
- [ ] Ownership for fixing flaky tests is assigned.

Example "ready" statement:

"This PR adds parser unit tests for dashboard meeting prep filtering and one Rust command test for settings load/save, with CI execution on PRs."

## Item 2: CI quality gates on PRs

DoR checklist:

- [ ] Required checks are named.
- [ ] Failing behavior is intentional (red PR blocks merge).
- [ ] Expected run time budget is defined.
- [ ] Branch protection update plan is written.
- [ ] Rollback plan exists (disable check vs revert workflow).

## Item 3: First-run setup (remove personal-path assumptions)

DoR checklist:

- [ ] UX copy for missing directories is drafted.
- [ ] Validation rules are defined for directory inputs.
- [ ] Existing users migration behavior is defined.
- [ ] Settings persistence shape is approved.
- [ ] Empty-state screenshots/mockups are prepared.

Example UX contrast:

- Not ready: "No data. Check settings."
- Ready: "We couldn’t find a briefings folder yet. Pick one now to continue."

## Item 4: Fixture data for dev/demo/testing

DoR checklist:

- [ ] Fixture schemas match current parser expectations.
- [ ] Sensitive data policy is defined (no personal content).
- [ ] Fixture refresh strategy is defined.
- [ ] Docs mention how to run app against fixtures.
- [ ] One negative fixture exists (invalid shape).

## Item 5: Security hardening (permissions + CSP)

DoR checklist:

- [ ] Current capability/permission inventory is documented.
- [ ] Desired least-privilege target is explicit.
- [ ] CSP policy baseline is drafted and reviewed.
- [ ] Compatibility risks are listed (what might break).
- [ ] Validation plan exists (manual smoke and logs).

## Item 6: Dashboard modularization

DoR checklist:

- [ ] Target module boundaries are documented.
- [ ] Contract for each extracted component/helper is written.
- [ ] State ownership model is decided (page vs store).
- [ ] Regression surface is listed (search, filters, overlays, keyboard).
- [ ] Incremental merge strategy is defined (not big-bang refactor).

## Item 7: Lint/format enforcement

DoR checklist:

- [ ] Tooling choice is final (`eslint+prettier` or `biome`).
- [ ] Rule strictness baseline is documented.
- [ ] Auto-fix strategy is defined for legacy files.
- [ ] CI and local commands are aligned.
- [ ] Team policy for lint exceptions is documented.

## Item 8: Documentation drift cleanup

DoR checklist:

- [ ] Drift list is explicit and finite.
- [ ] Source of truth per topic is defined.
- [ ] Verification owner is assigned.
- [ ] "Docs changed with code" PR checklist line is added.
- [ ] Completion means docs and runtime behavior are re-checked together.

## Optional PR template snippet

If useful, add this block to every QA-related PR description:

```md
## QA Plan Link
- Spec item: [ ] #1 [ ] #2 [ ] #3 [ ] #4 [ ] #5 [ ] #6 [ ] #7 [ ] #8
- Companion docs: `spec/codex_qa.md`, `spec/codex_qa_rollout_checklist.md`

## Risk Removed
- This PR reduces risk of:

## Validation Evidence
- CI run:
- Local commands:
- Screenshots/logs:
```

This keeps QA discussions concrete and avoids vague "looks good" merges.
