# YARVIS — Your Autonomous Resource Vault & Intelligence Suite

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

### Dashboard typography scale

Five tiers, named by intent. Use the closest match; resist inventing new sizes.

- **Display** — `font-pixel text-lg` for the YARVIS brand only.
- **Heading** — `text-base font-semibold` for greetings and modal titles; `text-sm font-semibold` for in-card section titles (`SectionCard` already applies this).
- **Label** — `text-xs uppercase tracking-wider font-semibold {tone}` for tonal section labels (Callout titles, tile mini-labels). The Callout primitive owns this style.
- **Body** — `text-xs text-base-content/{shade}` for default reading text. Pick `/85`–`/65` based on prominence.
- **Meta** — `text-xs font-mono text-base-content/40-50` for dates, run numbers, IDs, counters.

`text-sm` is reserved for modal/textarea content where there's room to breathe. Avoid `text-[10px]` or other arbitrary sizes — if a tile feels cramped, fix the layout, not the type.

### Dashboard primitives

A small shared kit lives under `src/lib/components/dashboard/`. Extend these before rolling new visuals:

- **`AccentRow`** — row shell with a left accent rail. Color via `rowAccent({urgency, eventType?, activityLevel?})` from `src/lib/dashboard/format.ts`.
- **`Chip`** — universal pill. Variants: `display` (deal-coloured tinted), `interactive` (lens chips, theme-contrast active state), `status` (semantic tone via `tone` prop). Tone helpers (`questionTone`, `activityTone`, etc.) live in `format.ts`.
- **`Callout`** — semantic block (focus, context, answer, conflict). Tones: `primary | info | success | warning | error | neutral`.
- **`SectionCard`** — collapsible container with header (icon, title, count, subtitle, actions, fillHeight).
- **`Overlay`** — modal shell. Backdrop, click-outside-close, Esc-to-close, default header chrome (icon/title/subtitle/actions/close), `header`/`footer` snippet overrides. Used by `MarkdownViewer`, `QuestionEditor`, `CommandPalette`.
- **`EmptyState`** — placeholder line for empty collections. Lens-aware mode (`items`, `lensActive`, `lensName`, `fallback`) composes `No {items} for {lensName}.` automatically; plain mode takes a `message`.
- **`Loading`** — centred async-fetch indicator. Default `spinner` variant uses daisyUI `loading-dots`; `skeleton` variant renders pulsing placeholder rows for known-shape content.
- **`ExternalLink`** — tauri-aware link with `pill` and `inline` variants.

Decorative one-offs (greeting gradient banner, calendar summary line) deliberately sit outside the kit — don't fold them in unless their meaning shifts.

## Git Workflow

- **main** — stable, working state only
- **feature/*** — all new features and bugfixes
- Never commit feature work or fixes directly to main
- Never merge locally — always push the branch and create a GitHub PR via `gh pr create`
- Conventional commit messages
- During development, save the active plan to `specs/plan.md` (gitignored)
- Before creating the PR, rename to `specs/YYYY-MM-DD_feature_plan.md` and commit (archived intent)

## Key Config

- SvelteKit uses `adapter-static` with `fallback: 'index.html'` (SPA mode for Tauri)
- `+layout.ts` sets `ssr = false` and `prerender = false`
- Vite dev server on port 1420 (matches `tauri.conf.json` devUrl)
- Data stored in `~/.yarvis/` (settings.json, learning-progress.json, future: SQLite db, scripts)

## Distribution

- **Homebrew tap**: `codingfragments/homebrew-tap` repo at `../homebrew-tap`
  - Cask file: `Casks/yarvis.rb`
  - Install: `brew tap codingfragments/tap && brew install --cask yarvis`
  - Cask includes `postflight` to strip macOS quarantine (`xattr -cr`) since the app is unsigned
- **GitHub Releases**: tag `vX.Y.Z`, attach the `.dmg` from `bun run tauri:build`
- **Release checklist**: bump version in `package.json` + `Cargo.toml` + `tauri.conf.json`, build, create release, update cask sha256 + version in `../homebrew-tap/Casks/yarvis.rb`
- Currently arm64 (Apple Silicon) only
