# MarkdownViewer: open in default app / reveal in Finder

## Problem

`MarkdownViewer` (used for the Memory and meeting-prep docs on the
dashboard) has no way to hand a document off to another app — e.g. to
export it to PDF/DOCX via Word, Pages, or a dedicated markdown editor.

## Approach considered and rejected

Originally scoped as an in-app "Export to PDF/DOCX" feature. Ruled out
after a live spike: `window.print()` inside Tauri's WKWebView does
nothing (no native print wiring), so a real export pipeline would have
needed a client-side PDF/DOCX renderer (`docx`, `pdfmake`) plus a new
`tauri-plugin-dialog` save-as flow — real new surface area for a need
that's better served by just handing the file to an app the user
already has.

## Approach shipped

Two small Rust commands that shell out to macOS `open` (mirrors the
existing `Command::new("osascript")` pattern in `external.rs`):

- `open_prep_file(briefings_dir, filename, reveal)` — mirrors
  `read_prep`'s path-traversal/`is_safe_prep_filename` validation
- `open_memory_file(daily_dir, reveal)`

Both delegate to a shared `open_with_finder(path, reveal)` helper —
`reveal: true` adds `open -R` to select the file in Finder instead of
opening it. Zero new dependencies, zero new Tauri plugins/capabilities.

`MarkdownViewer` gained two optional action props, `onOpenSource` and
`onRevealSource` — only rendered when the parent supplies them, so
ephemeral content (e.g. the fun-fact/joke overlay) shows neither button.

Icons: 📂 reveal-in-Finder, 📑 open-in-default-app, ☰ toggle outline
(moved off 📑 to avoid colliding with the new open-in-app icon).

## File-by-file

- `src-tauri/src/commands/dashboard.rs` — `open_prep_file`,
  `open_memory_file`, `open_with_finder` helper
- `src-tauri/src/lib.rs` — register the two new commands
- `src/lib/services/dashboard.ts` — `openPrepFile`, `openMemoryFile`
- `src/lib/components/dashboard/MarkdownViewer.svelte` — `onOpenSource`
  / `onRevealSource` props and action buttons
- `src/routes/dashboard/+page.svelte` — wire both viewers

## Out of scope

- In-app PDF/DOCX export — superseded by this approach
- Windows/Linux — `open`/`open -R` are macOS-only; app is macOS-only today
