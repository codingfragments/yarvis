# Markdown viewer overlay — implementation plan

Replace the slide-from-right `MemoryDrawer` and `PrepDrawer` with a
single centered overlay viewer that's larger, can be searched in
place, and has an optional outline sidebar.

## Scope

- One reusable `MarkdownViewer.svelte` used for *both* meeting prep
  files and the memory file. Delete `MemoryDrawer.svelte` and
  `PrepDrawer.svelte`.
- Centered overlay sized 80vw × 80vh on top of a dimmed backdrop.
- Header bar: icon + title + subtitle, toggle outline, toggle search,
  close.
- Optional left **outline sidebar**: TOC pulled from rendered h1/h2/h3,
  click-to-scroll. Hidden by default (toggle persists per-open).
- **In-document search** (Cmd-K-style bar): `⌘K` while the viewer is
  open toggles the search bar; live highlight of all matches; current
  match emphasized; `↑/↓` navigates; `Esc` closes search; `Esc` again
  closes the viewer.
- Catppuccin-themed match highlights (warning tint normal, accent tint
  current).

## Cmd-K coordination with the page-level palette

The dashboard page already binds `⌘K` for the global Command Palette.
When *any* viewer is open, the page suppresses its own `⌘K` so the
viewer can take it. Page-level handler simply checks
`memoryOpen || prepDrawerOpen` before opening the palette.

## DOM-based search highlight

- Bind a ref to the markdown body container.
- Whenever `query` or `content` changes, walk text nodes inside the
  container with a `TreeWalker` (skipping `<pre>` / `<code>` so code
  blocks aren't littered with marks).
- Wrap each occurrence in `<mark class="md-search-hit">`. Track refs.
- The "current" mark gets an extra class for the stronger highlight,
  scrolled into view.

## Outline extraction

- After the markdown renders, query the body for `h1, h2, h3` and
  build `[{ id, text, level }]`. Use one `requestAnimationFrame` to
  let `MarkdownRenderer.wireInteractions()` assign IDs first.
- Click a TOC entry → `element.scrollIntoView({ behavior: 'smooth',
  block: 'start' })` on the heading.

## Out of scope

- Saving viewer state across sessions.
- Multi-document tabs in the viewer.
- Keyboard shortcuts beyond `⌘K` and `Esc`.

## Branch + PR

`feature/markdown-viewer-overlay` (cut on top of
`feature/deal-lens-and-search`). PR base will be that earlier feature
branch so the diff stays focused on the viewer change. Archive plan
to `specs/2026-04-27_markdown-viewer-overlay_plan.md` before opening.
