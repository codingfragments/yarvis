# Yarvis QA and Completeness Upgrade Plan

Date: 2026-04-28
Scope: Raise overall quality from "good and useful" to "stable, portable, and release-grade".

## Why this document exists

Yarvis is already a real product. It builds, it runs, and it has clear feature depth.
What keeps it below "excellent" is not missing ideas, it is missing reliability systems around those ideas.

The short version:

1. The app can ship.
2. The app cannot yet prove quality continuously.
3. The app is still coupled to one personal environment more than it should be.

If we execute this plan, the project moves from a strong personal tool to a dependable product that others can install and trust.

## Current quality picture (baseline)

Practical baseline score:

- Completeness: 8.6/10
- Quality: 7.6/10
- Overall: 8.1/10

What is already strong:

1. Clear architecture (SvelteKit -> service layer -> Tauri commands).
2. Feature breadth (launcher, dashboard, briefings, learning, settings).
3. Builds and type checks pass.
4. Active and meaningful commit history.

What holds the score back:

1. No automated tests.
2. No CI enforcement on pull requests or main.
3. Environment coupling (`~/claude-chats` assumptions).
4. Security and config hardening gaps (broad shell permission, `csp: null`).
5. Minor docs/config drift.

## Quality target

Target after implementation:

- Completeness: 9.1/10
- Quality: 9.0/10
- Overall: 9.1/10

## Priority changes

## P0: Reliability and regression safety

### 1) Add a real test stack (frontend + backend + integration smoke)

Right now, passing `check` means "typed correctly", not "behavior still correct".
We need tests that protect behavior when dashboard parsing or UI interactions evolve.

Concrete change:

1. Add frontend unit tests with `vitest`.
2. Add Rust tests for parser and command-level logic.
3. Add one end-to-end smoke test for startup + critical user path.

Example:

When `daily.json` changes shape slightly, today this can silently break meeting prep rendering.
With tests, we fail in CI before merge.

```ts
// Example intent: dashboard parser should ignore invalid prep entries but keep valid ones
it('keeps valid meeting prep files and drops missing ones', () => {
  const input = [
    { title: 'A', file: 'meeting-prep-0900-a.md' },
    { title: 'B', file: null }
  ];
  const out = normalizeMeetingPreps(input, existingFiles);
  expect(out).toHaveLength(1);
  expect(out[0].title).toBe('A');
});
```

Result:

1. Fewer accidental regressions.
2. Faster refactors.
3. Confidence in release tags.

### 2) Add quality gates in CI for every PR

No CI means quality depends on memory and discipline.
That does not scale, even for a one-person project.

Minimum CI gates:

1. `bun run check`
2. `bun run build`
3. `cargo check --manifest-path src-tauri/Cargo.toml`
4. `cargo test --manifest-path src-tauri/Cargo.toml` (once tests exist)

You should require these checks before merge into `main`.

## P0: GitHub recommendation - Tauri multi-platform build on `main`

You asked specifically for this, and it is a high-impact upgrade.

Recommendation:

1. Add `.github/workflows/tauri-multiplatform.yml`.
2. Trigger on push to `main` and manual dispatch.
3. Build matrix for `macos-latest`, `ubuntu-22.04`, `windows-latest`.
4. Upload artifacts for each platform every time `main` changes.
5. Keep release publishing optional (manual tag/release workflow).

Why this matters:

1. You catch platform-specific breakage early.
2. "Works on my machine" risk drops sharply.
3. You always have installable artifacts from `main`.

Suggested workflow:

```yaml
name: tauri-multiplatform

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    strategy:
      fail-fast: false
      matrix:
        os: [macos-latest, ubuntu-22.04, windows-latest]
    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
      uses: oven-sh/setup-bun@v2
      with:
        bun-version: latest

      - name: Setup Rust
      uses: dtolnay/rust-toolchain@stable

      - name: Install Linux deps
      if: runner.os == 'Linux'
      run: |
        sudo apt-get update
        sudo apt-get install -y \
          libwebkit2gtk-4.1-dev \
          libgtk-3-dev \
          libayatana-appindicator3-dev \
          librsvg2-dev \
          patchelf

      - name: Install JS deps
      run: bun install --frozen-lockfile

      - name: Build app
      run: bun run tauri:build

      - name: Upload artifacts
      uses: actions/upload-artifact@v4
      with:
        name: yarvis-${{ runner.os }}
        path: src-tauri/target/release/bundle/**
```

Notes:

1. If you later want automatic GitHub Releases, add a second tag-triggered workflow.
2. Keep signing/notarization separate at first to reduce rollout complexity.

## P1: Portability and onboarding quality

### 3) Replace personal path assumptions with first-run setup

Defaults like `~/claude-chats/...` are useful for you and confusing for everyone else.
This makes onboarding feel broken even when code works.

Concrete change:

1. On first launch, show a setup panel when required directories are missing.
2. Pre-fill likely defaults, but force explicit confirm.
3. Persist "validated paths" status in settings.

Example experience change:

Before:
"No briefing yet today. Run skill in ~/claude-chats"

After:
"We could not find your briefings directory. Choose a folder now."

This one change improves perceived quality more than most visual improvements.

### 4) Add data fixtures for development mode

Use `fixtures/daily.sample.json` and `fixtures/learning.sample.md` so app screens are demonstrable without personal data.

Why:

1. Reproducible bug reports.
2. Easier CI/UI snapshots.
3. Better open-source friendliness.

## P1: Security and hardening

### 5) Reduce permission and policy risk

Current shell capabilities are broad. `csp: null` is convenient but weak.

Concrete change:

1. Use least privilege in `src-tauri/capabilities/default.json`.
2. Narrow shell plugin command scope where possible.
3. Introduce a minimal CSP compatible with the app.

Even if Yarvis is local-first, this is still a quality signal and a risk reduction measure.

## P2: Maintainability and code health

### 6) Break down the dashboard page into focused modules

A single `+page.svelte` near 1k lines is still manageable, but it will become expensive.

Refactor strategy:

1. Move data shaping to pure helpers.
2. Split view sections into presentational components.
3. Keep one orchestrator store for page state.

Example:

1. `dashboard/selectors.ts` for derived view models.
2. `dashboard/components/MeetingPrepRail.svelte`.
3. `dashboard/components/QuestionBoard.svelte`.

This gives clearer ownership and better unit testability.

### 7) Add lint and format enforcement

Add `eslint` + `prettier` (or Biome) and enforce in CI.

Why:

1. Reduces style churn in PRs.
2. Keeps large files easier to navigate.
3. Improves contributor velocity.

## P2: Documentation integrity

### 8) Eliminate drift between docs and code

Known examples to fix quickly:

1. `tauri.conf.json` schema URL should point to Tauri config schema.
2. README bundle output example uses older DMG naming.

Tiny drift creates trust issues. Fixing this is low effort and high credibility.

## Suggested rollout plan

### Phase 1 (1-2 days)

1. Add CI workflow for checks/build.
2. Add Tauri multi-platform build workflow on `main`.
3. Fix doc/config drift items.

Expected score bump: +0.4 to +0.6

### Phase 2 (2-4 days)

1. Add unit tests for dashboard/learning parsers.
2. Add Rust command tests.
3. Add fixture data.

Expected score bump: +0.5 to +0.7

### Phase 3 (3-5 days)

1. Onboarding/setup flow for paths.
2. Dashboard modularization.
3. Permission/CSP hardening pass.

Expected score bump: +0.3 to +0.5

## Definition of done

We can call this "quality-upgrade complete" when all are true:

1. Every PR gets enforced checks and build gates.
2. `main` produces artifacts for macOS/Linux/Windows automatically.
3. Critical parsing/render paths are test-covered.
4. New-user setup does not assume `~/claude-chats`.
5. Docs match current behavior/config.

At that point, Yarvis is no longer only a powerful personal tool.
It becomes an engineering-consistent product with reliable delivery.
