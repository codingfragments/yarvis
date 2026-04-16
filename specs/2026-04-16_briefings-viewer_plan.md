# Feature: Briefings Viewer

## Context

Replicate the behavior of `~/claude-chats/briefings/viewer.html` as a native Yarvis feature. The existing viewer is a standalone HTML file using the File System Access API. We'll build a proper SvelteKit page backed by Tauri Rust commands that read the briefings directory from disk.

The briefings directory contains:
- **Date folders** (`YYYY_MM_DD/`) each with:
  - `morning-briefing-YYYY-MM-DD.md` — Main daily briefing (calendar, emails, Slack, intelligence, action items)
  - `meeting-prep-HHMM-<topic>.md` — Per-meeting preparation docs
  - HTML renders (ignored by us — we render from .md)
- **Symlinks**: `current -> latest date folder`, `morning-briefing.md -> dated version`
- **Root files**: `Todo.md` (ignored per user request)

Markdown is rich: tables, checkboxes, blockquotes, external links (Google Docs, Gmail, Zoom), local `.md` links between files, emoji headers, horizontal rules.

**New settings**: Briefings directory path + max days to show (default: 5)

---

## Architecture

Follows the established pattern: Rust commands → service → store → route.

### New Files

```
src-tauri/src/commands/briefings.rs    # Rust: scan dir, read files, toggle checkboxes
src/lib/services/briefings.ts          # Service: typed invoke wrappers
src/lib/stores/briefings.svelte.ts     # Store: reactive state (dates, files, content)
src/lib/components/BriefingSidebar.svelte   # Date picker + file nav + heading anchors
src/lib/components/MarkdownRenderer.svelte  # Render MD to themed HTML, wire links + checkboxes
src/lib/components/SidePanel.svelte         # Slide-in panel for linked .md files (lg screens)
src/routes/briefings/+page.svelte      # Main briefings page
src/routes/briefings/+page.ts          # Load function
```

### Modified Files

```
src-tauri/src/commands/mod.rs          # Add pub mod briefings
src-tauri/src/lib.rs                   # Register new commands
src-tauri/src/commands/settings.rs     # Add briefings_dir + briefings_max_days to Settings
src/lib/types/index.ts                 # Add briefing types
src/lib/stores/settings.svelte.ts      # Update defaults
src/lib/components/AppLauncher.svelte  # Enable briefings tile
src/routes/settings/+page.svelte       # Add briefings settings fields
package.json                           # Add marked dependency
```

---

## Rust Backend (`commands/briefings.rs`)

### Types

```rust
struct DateEntry { key: String, display: String, is_today: bool, file_count: usize }
struct FileEntry { filename: String, label: String, icon: String, time: Option<String>, is_morning: bool, unchecked_count: usize }
```

### Commands

1. **`scan_briefings(dir: String, max_days: usize)`** → `Vec<DateEntry>`
   - List `YYYY_MM_DD` directories, sort descending, limit to max_days
   - Return display-friendly date labels with "Today" marker

2. **`list_date_files(dir: String, date_key: String)`** → `Vec<FileEntry>`
   - List `.md` files in a date folder (skip symlinks and .html)
   - Parse filename to extract: label, time badge, icon (🌅 morning / 📝 meeting)
   - Sort: morning-briefing first, then by time

3. **`read_briefing(dir: String, date_key: String, filename: String)`** → `Result<String, String>`
   - Read and return the raw .md file content
   - Frontend renders with marked.js (same approach as existing viewer.html)

4. **`toggle_checkbox(dir: String, date_key: String, filename: String, index: usize, checked: bool)`** → `Result<(), String>`
   - Read file, find nth checkbox, toggle it, write back
   - Same regex approach as the existing viewer

### Markdown Rendering (Frontend with marked.js)

Using `marked` on the frontend because:
- Same library as the existing viewer.html — proven with this content
- Natural DaisyUI class injection during rendering (themed tables, blockquotes)
- Future-proof for live markdown editing / preview features
- Theming via CSS on the container (`.md-body` styles adapt to Catppuccin light/dark)

Install: `bun add marked`

---

## Frontend

### Service (`services/briefings.ts`)

Thin typed wrappers for all four commands. Types mirror Rust structs.

### Store (`stores/briefings.svelte.ts`)

State:
- `dates: DateEntry[]` — available date folders
- `currentDate: string | null` — selected date key
- `files: FileEntry[]` — files for current date
- `currentFile: string | null` — active file
- `rawMarkdown: string | null` — raw .md content (for checkbox patching)
- `sidePanelFile: string | null` — filename shown in side panel
- `sidePanelMarkdown: string | null` — raw .md for side panel
- `loading / error`

Methods:
- `load()` — scan dates using settings
- `selectDate(key)` — load files, auto-select morning briefing
- `selectFile(filename)` — read raw markdown from backend
- `openInSidePanel(filename)` — read linked file markdown
- `toggleCheckbox(index, checked)` — patch raw markdown + save to disk via backend

### Components

**`BriefingSidebar.svelte`**
- Date selector dropdown (shows "Apr 16, 2026 — Today" style labels)
- File list with icons and time badges (matching viewer.html style)
- Active file highlighting (left accent border)
- "On this page" anchor navigation (extracted from headings)
- Clean, modern styling consistent with the app

**`MarkdownRenderer.svelte`**
- Receives raw markdown string, renders to HTML via `marked.parse()` with GFM enabled
- Applies themed markdown styles (`.md-body` CSS using DaisyUI/Catppuccin variables)
- Post-render wires up:
  - **Checkboxes**: click toggles → calls store method → saves to disk
  - **Local .md links**: click → opens in side panel (lg) or navigates (sm)
  - **External links**: open in system browser via Tauri shell
  - **Anchor links**: smooth scroll within content
- Heading IDs for anchor navigation

**`SidePanel.svelte`**
- Slide-in panel from the right (on screens ≥ 1024px)
- Shows linked `.md` file with its own MarkdownRenderer
- Close button + Escape key
- On small screens: local links navigate instead of opening panel

### Page (`routes/briefings/+page.svelte`)

Layout: `sidebar | main content | (side panel)`

```
┌──────────┬─────────────────────────┬──────────────┐
│ Sidebar  │    Main Content         │  Side Panel  │
│          │                         │  (linked md) │
│ Dates    │  Breadcrumb (if nav'd)  │              │
│ Files    │  Rendered Markdown      │  Rendered MD │
│ Anchors  │                         │              │
└──────────┴─────────────────────────┴──────────────┘
```

---

## Decisions

- **All bonus features included** in initial build
- **Markdown rendering**: Frontend with `marked.js` (same as existing viewer.html)

## Feature-Rich Additions (All Included)

All parse from existing markdown — no extra data needed:

1. **Smart section quick-jump bar** — Horizontal pill bar above content showing major H2 sections (Calendar, Email, Slack, Intelligence, Action Items). One-click smooth scroll.

2. **Action items counter badge** — Sidebar badge on morning briefing showing unchecked action items count. Rust scans checkboxes in `list_date_files` and returns `unchecked_count` per file.

3. **Meeting timeline** — Compact visual timeline in sidebar: colored dots on a horizontal time axis. Red = external meetings, blue = internal. Parsed from calendar table in morning briefing.

4. **Keyboard navigation** — `↑/↓` move between files, `←/→` switch dates, `Esc` close side panel, `/` focus search.

5. **Content search** — Search input in sidebar filters files in current date by label, highlighting matches.

---

## Settings Changes

Add to `Settings` struct and types:

| Setting | Type | Default |
|---------|------|---------|
| `briefings_dir` | `String` | `~/claude-chats/briefings` |
| `briefings_max_days` | `u32` | `5` |

Settings page gets a new "Briefings" section with a directory path input and a max-days number input.

---

## Implementation Order

1. Settings: add `briefings_dir` + `briefings_max_days` to Rust struct, TS types, defaults, settings page
2. Rust commands: `scan_briefings`, `list_date_files`, `read_briefing`, `toggle_checkbox`
3. Service + Store
4. MarkdownRenderer component (themed, with link/checkbox wiring)
5. BriefingSidebar component
6. SidePanel component
7. Briefings page (wire everything together)
8. Enable tile in AppLauncher
9. Feature-rich additions (quick-jump bar, action items badge, keyboard nav, search, meeting timeline)
10. Write `docs/briefings-feature.md` — feature implementation documentation

---

## Documentation (`docs/briefings-feature.md`)

Feature-specific implementation doc covering:

- **Overview**: What the briefings viewer does and how it fits in Yarvis
- **Directory structure**: Expected `YYYY_MM_DD/` layout, file naming conventions, symlinks
- **Rust commands reference**: Each command with its signature, parameters, and return types
- **Frontend components**: How BriefingSidebar, MarkdownRenderer, SidePanel compose together
- **Markdown rendering pipeline**: How raw .md flows through marked.js, CSS theming, link/checkbox wiring
- **Checkbox persistence**: The toggle → regex patch → write-back flow (shared with viewer.html)
- **Side panel behavior**: Screen-size-dependent (panel ≥1024px, navigation <1024px)
- **Bonus features**: How each parses from markdown (quick-jump from H2s, badge from checkbox count, timeline from calendar table)
- **Settings**: `briefings_dir` and `briefings_max_days` configuration
- **Extending**: How to handle new markdown sections as the briefing format evolves

---

## Verification

1. Navigate to `/briefings` — should load dates from configured directory
2. Date selector shows last 5 days, most recent selected by default
3. Morning briefing auto-loads with full markdown rendering
4. Tables, checkboxes, links, blockquotes, code blocks all render correctly
5. Theme switching works (dark/light styles markdown properly)
6. Clicking a local `.md` link opens it in the side panel (≥1024px) or navigates (small screen)
7. External links open in system browser
8. Toggling a checkbox saves to disk (verify file changed)
9. Anchor nav in sidebar scrolls to correct heading
10. Action items badge shows correct unchecked count
