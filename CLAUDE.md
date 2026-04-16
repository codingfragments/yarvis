# Yarvis — Personal Knowledge Assistant

Local-first desktop app built with Tauri v2 (Rust) + SvelteKit (Svelte 5) + Bun.

## Build & Run

```bash
bun install                # Install JS dependencies
bun run dev                # SvelteKit dev server only (browser, port 1420)
bun run tauri:dev          # Full native app (Tauri window + dev server)
bun run build              # Build frontend to build/
bun run tauri:build        # Production macOS .app/.dmg bundle
bun run check              # TypeScript + Svelte type checking
```

Rust backend compiles automatically during `tauri:dev` and `tauri:build`.

## Project Structure

- `src/` — SvelteKit frontend (Svelte 5 runes, TypeScript)
  - `routes/` — SvelteKit pages (`+page.svelte`, `+page.ts`, `+layout.svelte`)
  - `lib/services/` — Typed API wrappers over Tauri `invoke()`
  - `lib/stores/` — Svelte 5 rune stores (`.svelte.ts` files using `$state`, `$derived`)
  - `lib/components/` — Reusable Svelte components
  - `lib/types/` — Shared TypeScript interfaces
- `src-tauri/` — Rust backend
  - `src/commands/` — `#[tauri::command]` handlers (settings, system info)
  - `src/lib.rs` — Command registration
  - `tauri.conf.json` — App config, window settings, bundle config

## API Pattern

All backend calls follow this chain:

```
Component/Page → $lib/services/*.ts → invoke<T>() → Rust #[tauri::command]
```

- `services/tauri.ts` provides `invoke<T>()` with `isTauri()` guard for browser-mode fallback
- Services are thin typed wrappers — one file per domain (settings, system, etc.)
- Stores use Svelte 5 runes (`$state`) at module level for shared reactive state
- When adding a new feature: Rust command → register in `lib.rs` → service → store → route

## Styling

- TailwindCSS v4 (CSS-first, `@plugin` syntax) + DaisyUI v5 + Catppuccin
- Theme names for `data-theme`: `macchiato` (dark), `latte` (light)
- Catppuccin plugins: `src/catppuccin.macchiato.ts`, `src/catppuccin.latte.ts`
- Modern clean UI with **subtle** retro accents only (pixel font on logo, blinking cursor in status bar)

## Git Workflow

- **main** — stable, working state only
- **feature/*** — all new features and bugfixes
- Never commit feature work or fixes directly to main
- Never merge locally — always push the branch and create a GitHub PR via `gh pr create`
- Conventional commit messages

## Key Config

- SvelteKit uses `adapter-static` with `fallback: 'index.html'` (SPA mode for Tauri)
- `+layout.ts` sets `ssr = false` and `prerender = false`
- Vite dev server on port 1420 (matches `tauri.conf.json` devUrl)
- Data stored in `~/.yarvis/` (settings.json, future: SQLite db, scripts)
