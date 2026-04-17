# Release Yarvis

Create a new release of Yarvis: version bump, build, GitHub release, and Homebrew tap update.

## Steps

Follow these steps in order. Stop and report if any check fails.

### 1. Pre-flight checks

- Verify you are on the `main` branch. If not, stop and tell the user.
- Verify `main` is up to date with `origin/main` (no unpushed commits, no upstream changes). Run `git fetch origin` first, then compare. If out of sync, stop and tell the user.
- Verify working tree is clean (`git status`). If dirty, stop and tell the user.

### 2. Version bump

- Read the current version from `package.json`.
- Ask the user whether this is a **major**, **minor**, or **patch** bump using AskUserQuestion.
- Compute the new version (e.g. 0.2.1 → 0.2.2 for patch, 0.2.1 → 0.3.0 for minor, 0.2.1 → 1.0.0 for major).
- Update the version in all three files:
  - `package.json` → `"version": "X.Y.Z"`
  - `src-tauri/Cargo.toml` → `version = "X.Y.Z"`
  - `src-tauri/tauri.conf.json` → `"version": "X.Y.Z"`
- Commit with message `chore: bump version to X.Y.Z` and push to `origin/main`.

### 3. Build

- Run `bun run tauri:build` (timeout 300s).
- The `.dmg` will be at `src-tauri/target/release/bundle/dmg/Yarvis_X.Y.Z_aarch64.dmg`.
- Verify the `.dmg` file exists.

### 4. GitHub Release

- Compute the SHA256 of the `.dmg`: `shasum -a 256 <path>`.
- Create a GitHub release using `gh release create vX.Y.Z <dmg-path> --title "vX.Y.Z" --generate-notes`.
- Report the release URL to the user.

### 5. Update Homebrew Tap

- The tap repo is at `../homebrew-tap` (relative to the Yarvis project root).
- Update `../homebrew-tap/Casks/yarvis.rb`:
  - Set `version` to the new version string.
  - Set `sha256` to the SHA256 computed in step 4.
- Commit with message `chore: update yarvis cask to vX.Y.Z` and push.

### 6. Done

Report a summary:
- New version number
- GitHub release URL
- Homebrew install command: `brew tap codingfragments/tap && brew install --cask yarvis`
