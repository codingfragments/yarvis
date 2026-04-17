# Yarvis

**Personal Knowledge Assistant** — A local-first desktop app for briefings, structured learning courses with XP tracking, and more — all from a single launcher.

Built as a learning experiment and reusable tool, Yarvis combines modern web technologies with native desktop performance through Tauri.

---

## Install

### Homebrew (macOS Apple Silicon)

```bash
brew tap codingfragments/tap
brew install --cask yarvis
```

### Manual Download

Grab the `.dmg` from the [latest release](https://github.com/codingfragments/yarvis/releases/latest).

> **Note:** The app is unsigned. On first launch: right-click the app → **Open**, or allow it in **System Settings → Privacy & Security**.

### Build from Source

```bash
git clone https://github.com/codingfragments/yarvis.git
cd yarvis
bun install
bun run tauri:build
# .dmg output: src-tauri/target/release/bundle/dmg/
```

Requires Bun, Rust, and Xcode Command Line Tools (see [Prerequisites](#prerequisites)).

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Desktop Shell | **Tauri v2** | Native macOS app with Rust backend |
| Frontend | **SvelteKit** + **Svelte 5** | SPA with runes-based reactivity |
| Styling | **TailwindCSS v4** + **DaisyUI v5** | Utility-first CSS + component library |
| Theme | **Catppuccin** | Macchiato (dark) / Latte (light) via `@catppuccin/daisyui` |
| Runtime | **Bun** | Fast JS runtime, package manager, and bundler |
| Backend | **Rust** | File I/O, SQLite, Python execution |
| Database | **SQLite** (rusqlite) | Embedded database, bundled |
| Build | **Vite** | Frontend bundler |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                Tauri Window (WebView)           │
│                                                 │
│   SvelteKit SPA ──► Service Layer ──► invoke()  │
│   (Routes, Components,    (TypeScript)    │     │
│    Svelte 5 Runes)                        │     │
│                                           │     │
│                                    Tauri IPC    │
│                                           │     │
│   Rust Backend ◄──────────────────────────┘     │
│   (Settings, System Info, SQLite, Python Exec)  │
└─────────────────────────────────────────────────┘
```

### How Frontend Talks to Backend

Yarvis uses a **layered API pattern** that keeps SvelteKit conventions intact while using Tauri's IPC:

1. **SvelteKit Routes** (`src/routes/`) — Pages use `+page.ts` load functions and Svelte 5 components
2. **Service Layer** (`src/lib/services/`) — TypeScript modules that wrap `@tauri-apps/api/core` invoke calls with proper typing
3. **Stores** (`src/lib/stores/`) — Svelte 5 rune-based stores (`$state`, `$derived`, `$effect`) for reactive state management
4. **Tauri Commands** (`src-tauri/src/commands/`) — Rust functions decorated with `#[tauri::command]` that handle all backend logic

**Example flow — Loading settings:**

```
/settings +page.svelte
    → getSettingsStore().load()
        → settingsService.getSettings()
            → invoke<Settings>('get_settings')
                → Rust: get_settings() reads ~/.yarvis/settings.json
```

This pattern means:

- **Frontend** knows nothing about file paths, SQLite, or system commands
- **Service layer** is the single point of abstraction — swap Tauri for REST/WebSocket later
- **Rust backend** handles all I/O with full system access

---

## Project Structure

```
Yarvis/
├── src/                              # SvelteKit frontend
│   ├── app.css                       # TailwindCSS + DaisyUI + Catppuccin config
│   ├── app.html                      # HTML shell
│   ├── catppuccin.latte.ts           # Catppuccin Latte theme plugin
│   ├── catppuccin.macchiato.ts       # Catppuccin Macchiato theme plugin
│   ├── lib/
│   │   ├── components/               # Svelte 5 UI components
│   │   │   ├── AppLauncher.svelte    # Main launcher grid with search
│   │   │   ├── AppTile.svelte        # Individual tool tile (pixel borders)
│   │   │   ├── PixelBorder.svelte    # Reusable 8-bit border component
│   │   │   ├── SearchBar.svelte      # Spotlight-style search input
│   │   │   ├── StatusBar.svelte      # Retro terminal-style status bar
│   │   │   └── ThemeToggle.svelte    # Dark/Light/Auto theme switcher
│   │   ├── services/                 # Tauri backend API wrappers
│   │   │   ├── tauri.ts              # Base invoke() wrapper
│   │   │   ├── settings.ts           # Settings CRUD operations
│   │   │   └── system.ts             # System info queries
│   │   ├── stores/                   # Svelte 5 rune-based state
│   │   │   ├── settings.svelte.ts    # Reactive settings store
│   │   │   └── system.svelte.ts      # System status store
│   │   └── types/
│   │       └── index.ts              # Shared TypeScript interfaces
│   └── routes/
│       ├── +layout.svelte            # Root layout (theme, header, status bar)
│       ├── +layout.ts                # SPA mode config (ssr=false)
│       ├── +page.svelte              # Home: App Launcher
│       └── settings/
│           ├── +page.svelte          # Settings + System Status page
│           └── +page.ts              # Page load function
├── src-tauri/                        # Tauri Rust backend
│   ├── Cargo.toml                    # Rust dependencies
│   ├── tauri.conf.json               # Tauri app config (window, bundle, build)
│   ├── capabilities/default.json     # Tauri v2 permission grants
│   ├── icons/                        # Generated app icons
│   └── src/
│       ├── main.rs                   # Rust entry point
│       ├── lib.rs                    # Command registration & plugin setup
│       └── commands/
│           ├── mod.rs                # Command module exports
│           ├── settings.rs           # Read/write ~/.yarvis/settings.json
│           └── system.rs             # OS info, Python/SQLite versions
├── static/fonts/                     # Local font files
├── package.json                      # npm scripts & dependencies
├── svelte.config.js                  # SvelteKit + adapter-static config
├── vite.config.ts                    # Vite + TailwindCSS plugin
├── tsconfig.json                     # TypeScript config
└── .gitignore
```

---

## Prerequisites

- **Bun** ≥ 1.x — [Install](https://bun.sh)
- **Rust** (latest stable) — [Install via rustup](https://rustup.rs)
- **Xcode Command Line Tools** — `xcode-select --install`
- **Python 3** (optional, for Python runner features)

---

## Getting Started

```bash
# Clone and install dependencies
cd Yarvis
bun install

# Start development (SvelteKit + Tauri in parallel)
bun run tauri:dev
```

This will:

1. Start the SvelteKit dev server on `http://localhost:1420`
2. Compile the Rust backend
3. Open the Tauri native window pointing at the dev server

Hot reload works for both frontend (Vite HMR) and Rust (recompiles on save).

### Development Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start SvelteKit dev server only (browser) |
| `bun run tauri:dev` | Start full Tauri app (native window + dev server) |
| `bun run build` | Build SvelteKit frontend to `build/` |
| `bun run tauri:build` | Build production macOS .app/.dmg bundle |
| `bun run check` | Run svelte-check type checking |
| `bun run preview` | Preview production frontend build |

---

## Building for macOS

```bash
# Production build — creates .app and .dmg
bun run tauri:build
```

Output is in `src-tauri/target/release/bundle/`:

- `macos/Yarvis.app` — The application bundle
- `dmg/Yarvis_0.2.0_aarch64.dmg` — Distributable disk image

### Bundle Configuration

Tauri bundle settings are in `src-tauri/tauri.conf.json` under `bundle`:

- `targets: "all"` — Builds all available formats for the platform
- `macOS.minimumSystemVersion: "10.15"` — Minimum macOS Catalina

---

## Data Storage

Yarvis stores all user data in `~/.yarvis/`:

```
~/.yarvis/
├── settings.json    # User preferences (theme, accent color, etc.)
├── yarvis.db        # SQLite database (future: notes, metadata)
└── scripts/         # Saved Python scripts (future)
```

On first launch, the directory and default `settings.json` are created automatically by the Rust backend.

---

## Adding New Features

To add a new backend-connected feature (e.g., a Notes page):

### 1. Rust Command (`src-tauri/src/commands/notes.rs`)

```rust
#[tauri::command]
pub fn get_notes() -> Result<Vec<Note>, String> {
    // SQLite query or file read
}
```

### 2. Register in `lib.rs`

```rust
.invoke_handler(tauri::generate_handler![
    // ...existing commands
    commands::notes::get_notes,
])
```

### 3. Service Layer (`src/lib/services/notes.ts`)

```typescript
import { invoke } from './tauri';
import type { Note } from '$lib/types';

export async function getNotes(): Promise<Note[]> {
    return invoke<Note[]>('get_notes');
}
```

### 4. Store (`src/lib/stores/notes.svelte.ts`)

```typescript
let notes = $state<Note[]>([]);

export function getNotesStore() {
    return {
        get items() { return notes; },
        async load() { notes = await notesService.getNotes(); }
    };
}
```

### 5. Route (`src/routes/notes/+page.svelte`)

```svelte
<script lang="ts">
    import { getNotesStore } from '$lib/stores/notes.svelte';
    const store = getNotesStore();
    // ...
</script>
```

---

## UI Design

Yarvis has a **modern app launcher** aesthetic with retro/8-bit touches:

- **Catppuccin** color palette — Macchiato (dark) and Latte (light) themes
- **Pixel font** ("Press Start 2P") for headings and labels
- **8-bit pixel borders** using CSS box-shadow stepping
- **Retro glow effects** on primary text elements
- **Scanline overlay** for subtle CRT monitor feel
- **Terminal-style status bar** with blinking cursor
- **Glassmorphism** backgrounds with backdrop blur

---

## Git Workflow

- **`main`** — Stable, working state
- **`feature/*`** — Feature development branches
- Conventional commit messages

```bash
# Create a feature branch
git checkout -b feature/notes-page

# Work on the feature, then merge
git checkout main
git merge feature/notes-page
```

---

## License

MIT
