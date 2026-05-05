# Prep popup: load content before opening

## Problem

After v0.6.3 (class-based prep drawer store), the meeting-prep popup body was
still intermittently empty in release builds. Memory popup never failed.

## Why memory worked, prep didn't

Two structurally different open-flows wired the same `MarkdownViewer` shell:

```ts
// Memory — load FIRST, then open
async function openMemory() {
  await dashboard.loadMemory(...);
  memoryOpen = true;
}

// Prep — open FIRST with empty content, then load
async openPrep(p, dir, date) {
  this.content = null;
  this.loading = true;
  this.open = true;          // mounts the viewer with content=null
  this.content = await ...;  // post-mount reactive update
}
```

Memory mounts the viewer once, with content already in place — no
post-mount reactive transition. Prep relies on the conditional in
`MarkdownViewer` re-rendering when `content` flips from null to string,
which is the path that races in Svelte 5's prod runtime.

User-side hint: hitting browser-back to the dashboard (which remounted the
page) consistently rendered the content, confirming the data was right but
the post-mount reactive swap was unreliable.

## Fix

Mirror `openMemory`'s pattern in `prep.openPrep`: await `read_prep` first,
then flip `open=true`. The viewer mounts exactly once, with content
already set.

```ts
async openPrep(p, dir, date) {
  if (!p.file) return;
  this.meta = { title: p.title, time: p.time, filename: p.file };
  this.content = null;
  this.error = null;
  try {
    this.content = await readPrep(dir, date, p.file);
  } catch (e) {
    this.error = String(e);
  } finally {
    this.open = true;
  }
}
```

Also drop the now-vestigial `loading` field from the store and the matching
`loading={prep.loading}` prop wire-up in the dashboard page. The viewer
still supports a `loading` prop for other call sites; we just no longer
need it here.

Trade-off: a small delay between click and popup appearing while the file
loads. For these markdown files that's <50ms — same UX as the memory
popup.

## Files

- `src/lib/stores/prepDrawer.svelte.ts` — load-before-open; drop `loading`.
- `src/routes/dashboard/+page.svelte` — drop `loading={prep.loading}` wire-up.

## Verification

`bun run tauri:build` + repeated open/close on multiple preps in the
release build: content renders reliably every time.
