# Learning App Feature Plan

## Context

Stefan wants a structured self-paced learning module in Yarvis that reads markdown learning courses from a configurable directory (`~/claude-chats/learning/`), parses them into navigable sessions, and provides rich session views with XP/progress tracking. All 5 existing courses follow an identical template structure — no AI needed at runtime, purely structural markdown parsing. Fully offline.

## Course Template Structure (parsed deterministically)

Each course `.md` file contains, in order:
1. `# emoji Title: Subtitle` + `**A N-Session Gamified Learning Program**`
2. About section (learner profile, time commitment, outcomes, session rhythm)
3. Prerequisites (standalone or in Session 0)
4. XP rank progression table
5. Curriculum map table
6. **Session 0** — special: fun facts + people, NO XP/exercises
7. **Phases** (`## emoji PHASE N — NAME`) grouping sessions
8. **Sessions** (`### Session N: Title`) with Goal/Time/Level/XP metadata, Concept & Theory, Warm-up, Exercises (individual XP), Boss Challenge (XP), Summary (3 things), Resources
9. Phase completion markers, XP tracker table, Appendix, Footer

---

## Data Model

### TypeScript types (add to `src/lib/types/index.ts`)

```typescript
interface CourseSummary {
  id: string; filename: string; title: string; emoji: string;
  subtitle: string; session_count: number; total_xp: number;
}

interface LearningCourse {
  id: string; filename: string; title: string; emoji: string; subtitle: string;
  session_count: number; total_xp: number; time_metadata: string;
  about_markdown: string; xp_ranks: XpRank[];
  session_zero: LearningSession | null;
  phases: LearningPhase[];
  appendix_markdown: string;
}

interface LearningPhase {
  number: number; name: string; emoji: string;
  intro_markdown: string; sessions: LearningSession[];
}

interface LearningSession {
  number: number; title: string; goal: string; time: string; level: string;
  xp_available: XpBreakdown | null; prerequisites: string;
  theory_markdown: string; warmup_markdown: string;
  exercises: LearningExercise[];
  boss_challenge: BossChallenge | null;
  summary_points: string[]; resources_markdown: string;
  is_session_zero: boolean;
}

interface LearningExercise { index: number; title: string; description_markdown: string; xp: number; }
interface BossChallenge { title: string; description_markdown: string; xp: number; }
interface XpBreakdown { exercises: number; boss: number; total: number; }
interface XpRank { threshold: number; emoji: string; name: string; meaning: string; }

// Progress
interface LearningProgress { courses: Record<string, CourseProgress>; }
interface CourseProgress {
  course_id: string;
  sessions_completed: Record<number, SessionProgress>;
  phases_completed: number[];  // phase numbers with bonus awarded
  last_accessed: string;
}
interface SessionProgress { completed: boolean; exercises_completed: number[]; boss_completed: boolean; xp_earned: number; }
```

Rust structs mirror these in `src-tauri/src/commands/learning.rs`.

---

## Rust Backend (5 commands)

**File**: `src-tauri/src/commands/learning.rs`

| Command | Purpose |
|---|---|
| `scan_learning_courses(dir)` | Scan dir for `*.md` files, return `Vec<CourseSummary>` (lightweight, reads header + footer only) |
| `get_learning_course(dir, filename)` | Full parse → `LearningCourse` with all phases/sessions/exercises |
| `get_learning_progress()` | Read `~/.yarvis/learning-progress.json` |
| `save_learning_progress(progress)` | Write progress JSON |
| `reset_learning_progress(course_id: Option)` | Reset all or single course |

### Parsing strategy

Line-by-line state machine using `regex` crate. Key patterns:
- `^# (\S+)\s+(.+?):\s*(.+)$` — H1 title
- `^## (.+?)\s+PHASE\s+(\d+)\s*[—–-]\s*(.+)$` — phase header
- `^### Session (\d+):\s*(.+)$` — session header
- `^\*\*Goal:\*\*`, `^\*\*⏱ Time:\*\*`, etc. — session metadata
- `\((\d+)\s*XP\)` — XP values in exercise/boss headers
- `^####\s+(.+)$` — H4 subsections (Theory, Exercises, Boss, Summary, Resources)
- Exercise headers: bold text with XP like `**Exercise 1: Title** (30 XP)`

Follows `briefings.rs` patterns: `resolve_dir()` for `~` expansion, `fs::read_dir` for scanning, `fs::read_to_string` for content.

---

## Frontend

### Routes
```
src/routes/learning/+page.svelte          — Course list
src/routes/learning/+page.ts
src/routes/learning/[course]/+page.svelte — Course detail (sidebar + session view)
src/routes/learning/[course]/+page.ts
```

### Service (`src/lib/services/learning.ts`)
Thin typed wrappers: `scanLearningCourses()`, `getLearningCourse()`, `getLearningProgress()`, `saveLearningProgress()`, `resetLearningProgress()`

### Store (`src/lib/stores/learning.svelte.ts`)
Follows `briefings.svelte.ts` pattern (module-level `$state`, factory function with getters):
- State: `courses`, `currentCourse`, `progress`, `currentSessionNumber`, `loading`, `error`
- Derived: `currentSession`, `courseProgress`, `totalXpEarned`, `currentRank`
- Methods: `loadCourses()`, `selectCourse()`, `selectSession()`, `toggleExercise()`, `toggleBoss()`, `markSessionComplete()`
- Optimistic progress updates (same pattern as briefings checkbox toggle)

### Components
| Component | Purpose |
|---|---|
| `CourseCard.svelte` | Card for course list: emoji, title, session count, XP progress, rank |
| `LearningSidebar.svelte` | Left nav: XP bar, rank, collapsible phases with session links |
| `SessionView.svelte` | Main content: sequential sections (theory, warmup, exercises, boss, summary, resources) |
| `SessionZeroView.svelte` | Session 0: prerequisites + fun facts, no XP tracking |
| `XpProgressBar.svelte` | Reusable XP bar with rank display |
| `SessionTimer.svelte` | Optional countdown timer based on session time metadata |
| `XpPopup.svelte` | Floating "+N XP" animation on exercise toggle |

All session markdown content rendered via existing `MarkdownRenderer.svelte`.

---

## UI Layout

### Course list (`/learning`)
- Back button + "Learning" heading
- Grid of `CourseCard` components (styled like existing app tiles: `rounded-xl bg-base-200/40 border`)
- Shows progress % + current rank if started

### Course detail (`/learning/[course]`)
Mirrors `/briefings` layout: fixed sidebar (w-64) + scrollable main content.

**Sidebar**: XP progress bar + rank at top, Session 0 link (distinct style), then collapsible phase groups with session links showing completion checkmarks and XP badges.

**Main content**: Session rendered sequentially — header with metadata, then each H4 section with visual separators. Exercise checkboxes with XP badges. Boss challenge with checkbox. Summary as styled card. Resources as links.

**Session 0**: Different view — info banner ("Prerequisites & context — no XP"), fun facts as styled cards, people table, install steps prominent.

---

## Progress Persistence

- File: `~/.yarvis/learning-progress.json`
- XP computed from completed exercises (not stored redundantly at course level)
- Toggle flow: optimistic UI update → `saveLearningProgress()` → revert on error
- Session completion is manual (sidebar checkbox), independent of exercise completion
- Reset via Settings page or per-course button

---

## Settings Changes

**Rust** (`settings.rs`): Add `learning_dir: String` to `Settings` struct + default `~/claude-chats/learning`
**TypeScript** (`types/index.ts`): Add `learning_dir: string` to Settings interface
**Settings UI** (`settings/+page.svelte`): New "Learning" section with directory input + "Reset All XP" button

---

## Files to Create (15)

```
src-tauri/src/commands/learning.rs
src/lib/services/learning.ts
src/lib/stores/learning.svelte.ts
src/lib/components/CourseCard.svelte
src/lib/components/LearningSidebar.svelte
src/lib/components/SessionView.svelte
src/lib/components/SessionZeroView.svelte
src/lib/components/XpProgressBar.svelte
src/lib/components/SessionTimer.svelte
src/lib/components/XpPopup.svelte
src/routes/learning/+page.svelte
src/routes/learning/+page.ts
src/routes/learning/[course]/+page.svelte
src/routes/learning/[course]/+page.ts
specs/YYYY-MM-DD_learning_plan.md
```

## Files to Modify (7)

```
src-tauri/src/commands/mod.rs              — add pub mod learning
src-tauri/src/lib.rs                       — register 5 commands
src-tauri/src/commands/settings.rs         — add learning_dir field
src/lib/types/index.ts                     — add all learning interfaces
src/lib/stores/settings.svelte.ts          — add learning_dir default
src/lib/components/AppLauncher.svelte      — add Learning tile
src/routes/settings/+page.svelte           — add Learning section + Reset XP
```

---

## Implementation Sequence

All on `feature/learning` branch:

1. **Settings + Rust structs**: Add `learning_dir` to settings, create `learning.rs` with structs and all 5 commands (including parser). Register in `mod.rs` + `lib.rs`.
2. **Types + Service + Store**: Add TS interfaces, create service wrappers, create store.
3. **Course list page**: Create `/learning` route + `CourseCard`. Add tile to `AppLauncher`.
4. **Course detail page**: Create `/learning/[course]` route + `LearningSidebar` + `XpProgressBar`.
5. **Session views**: Create `SessionView` + `SessionZeroView` + `SessionTimer` + `XpPopup`, wire exercise/boss checkboxes to progress store.
6. **Settings UI + polish**: Add Learning section to settings, keyboard nav, auto-continue, per-course reset, phase bonus auto-award, loading states, edge cases.

---

## Design Decisions

- **File pattern**: `*-curriculum.md` only — new courses must follow naming convention
- **Phase bonus XP**: Yes — auto-award +200 when all sessions in a phase marked complete
- **Appendix**: Sidebar entry below phases, renders as its own full-page section
- **Auto-continue**: On course entry, navigate to first incomplete session
- **Keyboard nav**: Arrow keys for session switching (matching briefings pattern)
- **XP animation**: Subtle floating "+N XP" on exercise toggle (Catppuccin-themed)
- **Session timer**: Optional per-session countdown based on the "Time: 45 min" metadata. Small timer widget in the session header — click to start, shows countdown. Not the Pomodoro timer — a simple session-scoped timer that helps pace the study session. Visual only (no blocking behavior).
- **Per-course reset**: Small reset button in sidebar (in addition to Settings page)

---

## Verification

1. `bun run tauri:dev` — app launches
2. Navigate to Settings → verify Learning section with directory input
3. Navigate to Learning → verify course cards appear for all 5 courses
4. Click a course → verify sidebar shows phases/sessions, session 0 at top
5. Click Session 0 → verify prerequisites render without XP tracking
6. Click a regular session → verify all sections render (theory, exercises, boss, summary)
7. Toggle exercise checkboxes → verify XP updates in sidebar, persists across page reloads
8. Mark session complete → verify checkmark in sidebar
9. Reset XP in Settings → verify progress cleared
10. Add a new `.md` file to learning dir → verify it appears on next visit
