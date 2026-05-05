# Briefing-doc popup: prod-only empty body fix

## Problem

In release builds (`bun run tauri:build`), clicking a meeting-prep "open" link
showed the popup with the correct title/subtitle but an empty body — no
markdown, no Loading spinner, not even the "No content." fallback. Behaviour
was timing-dependent: closing and re-opening sometimes worked on the second
or third try. Dev mode (`bun run tauri:dev`) was unaffected.

Diagnostics confirmed the data path was healthy in prod:
- `read_prep` returned the file (8004 bytes).
- The store assigned `content` after the await.
- `MarkdownViewer`'s `$effect` saw `content` as a string.
- `MarkdownRenderer` mounted, computed 9392 bytes of HTML.

But a DOM dump showed the body wrapper inside the dialog was completely empty
— not even the if-block anchor comment. So the conditional in
`MarkdownViewer` (`{:else if content}`) failed to mount any branch, even
though every reactive log saw the right value.

## Root cause

The prep-drawer store used the module-level `$state` + getter-on-returned-
object pattern:

```ts
let content = $state<string | null>(null);
export function getPrepDrawerStore() {
  return {
    get content() { return content; },
    async openPrep(...) { content = await readPrep(...); }
  };
}
```

Each call to `getPrepDrawerStore` returned a fresh object whose getters
captured closures over the module's `$state` bindings. Reads from
`MarkdownViewer.content` therefore went through the chain
`page → prep.content getter → module-scope $state read`. In Svelte 5's
prod-mode runtime that closure indirection — combined with the `await` in
`openPrep` — left the conditional's dependency tracking unwired, so it
never re-rendered on the post-await `content` change. In dev the runtime
tracks more aggressively and the bug was hidden.

## Fix

Convert `prepDrawer.svelte.ts` to a class with `$state` field initialisers
and a singleton instance. Class-field `$state` is the documented Svelte 5
store pattern: the compiler wires reads/writes directly through the
reactivity proxy on the instance, eliminating the closure layer.

```ts
class PrepDrawer {
  open = $state(false);
  content = $state<string | null>(null);
  // ...
  async openPrep(...) { this.content = await readPrep(...); }
}
const instance = new PrepDrawer();
export function getPrepDrawerStore() { return instance; }
```

The page and `MarkdownViewer` are unchanged — they still call
`getPrepDrawerStore()` and read `prep.content`, but the read now resolves
to a Proxy property instead of a closure-captured module variable.

## Files

- `src/lib/stores/prepDrawer.svelte.ts` — module-level state + getter object → class with `$state` fields, singleton export.

## Verification

Built `bun run tauri:build` and confirmed the popup body renders the
markdown reliably on every click (no race, no need to retry).
