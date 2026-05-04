# Things action button — plan (retrospective)

## Goal
Let the user promote any dashboard action item into Things 3 with a single click — and detect when a task was already added before, to avoid duplicates across briefing runs and re-clicks.

## Final approach (AppleScript + dedup marker)

Replace the URL-scheme route (which always brings Things to the foreground) with a JXA script piped to `osascript -l JavaScript -`. The script:

1. Calls `Things.launch()` — backgrounded, no focus steal, no window pop.
2. Embeds a `[yarvis:{dedup_key}]` marker line at the end of the task notes.
3. Pre-checks via `Things.toDos.whose({notes: {_contains: marker}})` — if any task already matches, returns `{status: "exists"}` without creating a duplicate.
4. Otherwise creates the task in the Inbox and returns `{status: "created"}`.

The `dedup_key` prefers the briefing skill's stable `fingerprint`. When that field is missing (rare — one or two stale items per briefing), it falls back to `fallback-{source_type}-{id}`, which dedupes within a single run but not across regenerations.

## Why AppleScript over the URL scheme

- **No focus steal.** URL scheme goes through LaunchServices → brings Things forward. AppleScript with `launch` (not `activate`) stays backgrounded.
- **Bidirectional.** The scheme is write-only; AppleScript can query existing tasks, which is what makes dedup possible.
- **No URL-encoding gotchas.** The original implementation broke on emoji-laden action text because `URLSearchParams` encodes spaces as `+` and Things' parser wants `%20`. Encoding entirely sidestepped.

Trade-off: macOS prompts the user once for "Yarvis wants to control Things3" automation permission on first click. Subsequent calls are silent.

## UI states

Three-state pill button in the trailing slot of `ActionItem`:

| State | Visuals | Meaning |
|---|---|---|
| idle | `📋 Things`, neutral pill | default, click to send |
| created | `✓ Sent`, `bg-success/20 text-success` | task was newly created in Things |
| exists | `✓ In Things`, `bg-info/20 text-info` | marker matched, no duplicate created |

Both result states clear back to idle after 2 seconds.

## Iteration history (commits on the branch, oldest first)

1. **`feat(dashboard): add Things 3 button to ActionItem`** — initial URL-scheme implementation. `things:///add?title=…` via `open` shell call, with a small Rust command that validates the scheme prefix.
2. **`fix(things): use percent-encoding for URL params`** — `URLSearchParams.toString()` produces `+` for spaces; Things wanted `%20`. Switched to manual `encodeURIComponent`.
3. **`chore(things): log URL before launching Things`** — temporary debug logging.
4. **`feat(things): show 'Sent' confirmation on the button`** — visual feedback so the user doesn't have to alt-tab to verify the task landed. Removed the debug logging at the same time.
5. **`style(things): stack Things button and open link vertically`** — layout polish: `flex flex-col items-end` on the trailing slot so the two affordances don't compete horizontally.
6. **`refactor(things): switch to AppleScript with dedup via marker`** — the real change. JXA over `osascript`, dedup via marker in notes, three UI states for created/exists/idle. URL scheme machinery removed entirely (including the `open_things_url` Rust command and capability allow rule for `things:`).

The branch was rebased onto main partway through to pick up the `fingerprint`/`created_at`/`completed_at` fields the action-checkoff PR introduced — those land naturally as the dedup key.

## Files touched (final state vs main)

- `src-tauri/src/commands/external.rs` — new file. `add_to_things(title, notes, deadline, tags, dedup_key) -> Result<ThingsAddResult, String>`. JXA script as a const string piped via stdin. Output parsed as JSON.
- `src-tauri/src/commands/mod.rs` — `pub mod external;`
- `src-tauri/src/lib.rs` — registers `commands::external::add_to_things` in the invoke handler.
- `src/lib/services/things.ts` — `sendActionToThings(action) -> Promise<ThingsAddResult>` plus `dedupKeyFor(action)` helper.
- `src/lib/components/dashboard/ActionItem.svelte` — Things button in the trailing slot, three-state visual logic, alongside the checkbox + open-link from the action-checkoff PR.
- `src-tauri/Cargo.lock` — version bump byproduct from the rebase onto v0.5.1.

## Out of scope (intentional)

- **Reading completion state from Things back into Yarvis.** Action's `done` is owned by Yarvis and round-tripped via the briefing skill's fingerprint merge — Things mirroring would create a sync conflict for no real benefit yet.
- **A "remove from Things" button.** Once sent, the user manages the task in Things. Yarvis is the source.
- **Deal-tag → Things tag mapping.** We pass `deal_tag` as a Things tag if present. No deeper convention. If the user wants project/area routing later, that's a separate feature.
- **Sandboxed first-run permission UX.** Relies on macOS's standard "wants to control Things3" prompt. No custom permission flow.

## Verification

- `bun run check` clean.
- `cargo check` clean.
- Manual on `tauri:dev`: click button → task appears in Things Inbox with marker; click again → button shows "In Things" and no duplicate is created. Verified across action items with and without `deal_tag`, with and without ISO deadlines.
- macOS Automation prompt confirmed; one-time per app install.
