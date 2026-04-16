# Feature: About Page

## Context

Add an About page that gives Yarvis a proper identity. **YARVIS** stands for **Your Autonomous Resource Vault & Intelligence Suite**. The page should feel polished and informative — showing what the app is, what it's built with, linking to GitHub, and displaying live system info.

No new Rust commands needed — reuses existing `get_system_info` and `get_python_version` from the system service.

---

## New Files

```
src/routes/about/+page.svelte     # About page
src/routes/about/+page.ts         # Load function (SPA pattern)
```

## Modified Files

```
src/lib/components/AppLauncher.svelte  # Add About tile
src/routes/+layout.svelte              # Add About link in header (optional, subtle)
```

---

## About Page Content

### Hero Section
- App icon (Y monogram, reuse from `icon-source.svg` or inline)
- **YARVIS** in pixel font with subtle glow
- Full name: "Your Autonomous Resource Vault & Intelligence Suite"
- Version badge (from `get_system_info`)
- One-liner description

### What Is Yarvis
Brief paragraph: local-first personal knowledge assistant, built as both a learning experiment and a reusable tool. Emphasize privacy (all data stays on your machine), extensibility (Rust backend, SvelteKit frontend), and the fun of building with modern tools.

### Tech Stack
Visual card grid showing the key technologies:
- Tauri v2 (desktop shell)
- SvelteKit + Svelte 5 (frontend)
- Rust (backend)
- TailwindCSS + DaisyUI (styling)
- Catppuccin (theme)
- Bun (runtime)
- SQLite (database)
- marked.js (markdown)

Each as a small pill/badge or mini-card with an icon.

### System Info
Reuse the existing system service to show live info:
- App version, OS, architecture
- Rust version, Python version, SQLite version
- Data directory path

(Same data as the Settings system status panel, but presented more cleanly.)

### Links
- GitHub: https://github.com/codingfragments/yarvis (open in system browser)
- "Built with ❤️ and Claude Code" footer note

### Keyboard Shortcut Reference
Quick reference card for the app's keyboard shortcuts:
- `↑/↓` — Navigate files
- `←/→` — Switch dates
- `Esc` — Close side panel
- `/` — Focus search

---

## Launcher Tile

Add to AppLauncher:
```
{ id: 'about', label: 'About', icon: 'ℹ️', href: '/about', accent: '#91d7e3', available: true, description: 'About Yarvis' }
```

Place after Settings (last tile before the "coming soon" ones).

---

## Design Notes

- Modern card-based layout, consistent with Settings page style
- Subtle retro accent only on the YARVIS name (pixel font, faint glow)
- Tech stack as a clean grid of rounded pills
- System info in the same `bg-base-200/40` card style used in Settings
- GitHub link opens via Tauri shell (system browser), not in-app
- Page should be static/lightweight — no complex state management

---

## Implementation Order

1. Create `src/routes/about/+page.ts` and `+page.svelte`
2. Add About tile to AppLauncher
3. Wire system info (reuse `getSystemStore` from settings)
4. Copy plan to `specs/plan.md`, rename before PR

---

## Verification

1. About tile appears on launcher home
2. Page shows YARVIS name, acronym, version, description
3. Tech stack grid renders cleanly in both themes
4. System info loads (in Tauri) or shows fallback (in browser)
5. GitHub link opens system browser
6. Theme switching works on the page
