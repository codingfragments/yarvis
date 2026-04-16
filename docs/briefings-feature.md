# Briefings Viewer — Feature Documentation

The Briefings Viewer is a Yarvis feature that renders daily briefing markdown files in a native desktop interface with sidebar navigation, themed rendering, interactive checkboxes, and a side panel for linked documents.

---

## Directory Structure

The viewer expects a briefings directory (configurable in Settings, default `~/claude-chats/briefings`) with this layout:

```
briefings/
├── 2026_04_16/
│   ├── morning-briefing-2026-04-16.md      # Main daily briefing
│   ├── morning-briefing-2026-04-16.html    # (ignored — we render from .md)
│   ├── morning-briefing.md                  # (ignored — symlink)
│   ├── meeting-prep-1700-evoke-security.md  # Meeting prep files
│   └── meeting-prep-2145-adaptive-ml.md
├── 2026_04_15/
│   └── ...
├── Todo.md                                  # (ignored by this viewer)
└── viewer.html                              # (original standalone viewer)
```

**Naming conventions:**
- Date folders: `YYYY_MM_DD` (underscores, not dashes)
- Morning briefing: `morning-briefing-YYYY-MM-DD.md`
- Meeting prep: `meeting-prep-HHMM-topic-name.md` (24h time, dashes)
- Symlinks and `.html` files are automatically skipped

---

## Rust Commands

All commands live in `src-tauri/src/commands/briefings.rs`.

### `scan_briefings(dir, max_days) → Vec<DateEntry>`

Scans the directory for `YYYY_MM_DD` folders, returns the most recent `max_days` entries sorted newest-first.

```rust
struct DateEntry {
    key: String,        // "2026_04_16"
    display: String,    // "Apr 16, 2026"
    is_today: bool,     // true if matches today's date
    file_count: usize,  // number of .md files in the folder
}
```

**Tilde expansion:** Paths starting with `~` are resolved to the user's home directory.

### `list_date_files(dir, date_key) → Vec<FileEntry>`

Lists `.md` files in a date folder (skipping symlinks and .html files).

```rust
struct FileEntry {
    filename: String,       // "meeting-prep-1700-evoke-security.md"
    label: String,          // "Evoke Security"
    icon: String,           // "🌅" or "📝"
    time: Option<String>,   // "17:00" or null
    is_morning: bool,       // true for morning briefings
    unchecked_count: usize, // number of unchecked checkboxes ([ ])
}
```

**Sorting:** Morning briefing always first, then by time extracted from filename.

**Label parsing:** `meeting-prep-1700-evoke-security.md` → label: `"Evoke Security"`, time: `"17:00"`, icon: `"📝"`.

### `read_briefing(dir, date_key, filename) → String`

Returns the raw markdown content of a file. Frontend handles rendering.

### `toggle_checkbox(dir, date_key, filename, index, checked) → ()`

Toggles the nth checkbox in the file. Uses the same regex as the original viewer.html:

```
/^(\s*[-*+] \[)([x ])(])/gm
```

Counts occurrences, replaces the one at `index`. Writes the patched file back to disk.

---

## Frontend Architecture

### Service Layer (`src/lib/services/briefings.ts`)

Four typed functions matching the Rust commands:

```typescript
scanBriefings(dir, maxDays): Promise<DateEntry[]>
listDateFiles(dir, dateKey): Promise<FileEntry[]>
readBriefing(dir, dateKey, filename): Promise<string>
toggleCheckbox(dir, dateKey, filename, index, checked): Promise<void>
```

### Store (`src/lib/stores/briefings.svelte.ts`)

Module-level `$state` variables (singleton pattern). Key state:

- `dates`, `files` — navigation data from Rust
- `currentDate`, `currentFile` — selection state
- `rawMarkdown` — current file content (for checkbox patching)
- `sidePanelFile`, `sidePanelMarkdown` — side panel state

**Checkbox flow:** Optimistic update on `rawMarkdown` (instant UI feedback) → async `toggleCheckbox` call to persist to disk.

### Markdown Rendering (`src/lib/components/MarkdownRenderer.svelte`)

**Pipeline:**

```
Raw .md string
  → marked.parse(md, { gfm: true })
  → HTML string
  → {@html html} renders to DOM
  → wireInteractions() post-processes DOM:
      - Adds IDs to headings (for anchor nav)
      - Enables checkboxes (disabled by default in marked output)
      - Wires checkbox change events → store.toggleCheckbox
      - Intercepts local .md links → opens in side panel or navigates
      - External links → Tauri shell.open (system browser)
      - Anchor links → smooth scroll
```

**Theming:** All styling is via scoped CSS using DaisyUI/Catppuccin CSS variables (`oklch(var(--p))`, `oklch(var(--b2))`, etc.). This means the markdown body automatically adapts when the theme switches between Macchiato (dark) and Latte (light).

Key CSS variable mappings:
- `--p` (primary) → headings, links, checkboxes
- `--s` (secondary) → H3 headings
- `--b2` (base-200) → blockquote/code backgrounds
- `--b3` (base-300) → borders, table headers
- `--wa` (warning) → inline code color
- `--su` (success) → local .md link color

### Side Panel (`src/lib/components/SidePanel.svelte`)

- Only visible on screens ≥ 1024px (`hidden lg:flex`)
- On smaller screens, local links navigate to the file instead
- Fixed 420px width, slides in from the right
- Has its own `MarkdownRenderer` instance
- Close with button or Escape key

### Briefing Sidebar (`src/lib/components/BriefingSidebar.svelte`)

- Date selector dropdown with "Today" marker
- File list with icons, time badges, and action item count badges
- Active file highlighted with left accent border
- Anchor navigation section ("On this page") showing H1-H3 headings
- Search input that filters files by label

---

## Bonus Features

All parse from existing markdown — no extra data sources needed.

### Quick-Jump Section Bar

A sticky horizontal bar above the content showing H2 headings as clickable pills. Extracts from the rendered DOM after each markdown change. Up to 8 sections shown, text truncated to 25 chars. One click smooth-scrolls to the section.

### Action Items Counter Badge

The `list_date_files` Rust command scans each file for unchecked checkboxes (`- [ ]`). The count appears as a small warning-colored badge next to the file in the sidebar. Helps quickly see which files need attention.

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `↑` / `↓` | Move between files in current date |
| `←` / `→` | Switch to previous / next date |
| `Esc` | Close side panel |
| `/` | Focus search input |

Keyboard events are ignored when an input is focused.

### Content Search

Text input in the sidebar filters files by label and filename. Real-time filtering as you type.

---

## Settings

Two settings in `src-tauri/src/commands/settings.rs` (and mirrored in TypeScript):

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `briefings_dir` | String | `~/claude-chats/briefings` | Path to the briefings root directory |
| `briefings_max_days` | u32 | 5 | Maximum number of date folders to show |

Configured in the Settings page under the "Briefings" section.

---

## Extending for New Markdown Sections

The briefing format may evolve with new H2/H3 sections. The viewer handles this gracefully:

1. **New H2 sections** automatically appear in the quick-jump bar (up to 8)
2. **New H3 sections** appear in the sidebar anchor navigation
3. **Tables** render with themed styling regardless of column count
4. **Checkboxes** anywhere in the file are counted and made interactive
5. **Links** (external, local .md, anchors) are wired up by type, not by section

No code changes needed when sections are added, renamed, or reordered. The only assumption is the `YYYY_MM_DD` folder structure and `.md` file naming conventions.

If a fundamentally new file type is introduced (not `morning-briefing-*` or `meeting-prep-*`), the label parser in `parse_file_label()` (Rust) has a generic fallback that titlecases the filename.
