# Yarvis API Guide

How the frontend talks to the Rust backend, with examples from simple to advanced.

## Overview

Yarvis uses Tauri's IPC (inter-process communication) to connect the SvelteKit frontend to the Rust backend. Every backend operation — file I/O, database queries, shell commands — goes through this pipeline:

```
Svelte Component
    → Service function ($lib/services/*.ts)
        → invoke<T>() wrapper ($lib/services/tauri.ts)
            → Tauri IPC bridge
                → #[tauri::command] Rust function
                    → returns Result/value → serialized as JSON → back to frontend
```

This layered approach means:

- Components never call Tauri directly
- Services are thin, typed wrappers — easy to test or swap
- Stores manage reactive state using Svelte 5 runes
- The Rust backend has full system access (filesystem, processes, network)

---

## The Four Layers

### Layer 1: Rust Commands (`src-tauri/src/commands/`)

Rust functions annotated with `#[tauri::command]`. These are the actual backend logic.

```rust
// src-tauri/src/commands/example.rs

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct Greeting {
    pub message: String,
    pub timestamp: u64,
}

#[tauri::command]
pub fn greet(name: String) -> Greeting {
    Greeting {
        message: format!("Hello, {}!", name),
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs(),
    }
}
```

**Key rules:**
- Parameters are deserialized from JSON automatically (must implement `Deserialize` or be primitive)
- Return values are serialized to JSON automatically (must implement `Serialize`)
- Use `Result<T, String>` to return errors that the frontend can catch
- Parameter names in Rust must match the keys in the `args` object passed from TypeScript
- Rust uses `snake_case`, TypeScript uses `camelCase` — Tauri converts automatically

**Registration** — every command must be listed in `src-tauri/src/lib.rs`:

```rust
// src-tauri/src/lib.rs
mod commands;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::example::greet,  // <-- add here
        ])
        .run(tauri::generate_context!())
        .expect("error while running Yarvis");
}
```

And the module must be exported in `src-tauri/src/commands/mod.rs`:

```rust
pub mod example;  // <-- add here
```

### Layer 2: Service Functions (`src/lib/services/`)

TypeScript modules that wrap `invoke()` calls with proper types. One file per domain.

```typescript
// src/lib/services/example.ts

import { invoke } from './tauri';

export interface Greeting {
    message: string;
    timestamp: number;
}

export async function greet(name: string): Promise<Greeting> {
    return invoke<Greeting>('greet', { name });
}
```

**The base wrapper** (`src/lib/services/tauri.ts`) handles Tauri detection:

```typescript
export function isTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    if (!isTauri()) {
        throw new Error(`Not running in Tauri (command: ${cmd}).`);
    }
    const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
    return tauriInvoke<T>(cmd, args);
}
```

This means `bun run dev` (browser) won't crash — services throw a clear error, and stores can fall back to defaults.

### Layer 3: Stores (`src/lib/stores/`)

Svelte 5 rune-based stores in `.svelte.ts` files. They hold reactive state and coordinate loading/saving.

```typescript
// src/lib/stores/example.svelte.ts

import * as exampleService from '$lib/services/example';
import { isTauri } from '$lib/services/tauri';
import type { Greeting } from '$lib/services/example';

let greeting = $state<Greeting | null>(null);
let loading = $state(false);
let error = $state<string | null>(null);

export function getGreetingStore() {
    return {
        get current() { return greeting; },
        get loading() { return loading; },
        get error() { return error; },

        async greet(name: string) {
            if (!isTauri()) {
                greeting = { message: `Hello, ${name}!`, timestamp: Date.now() / 1000 };
                return;
            }
            loading = true;
            error = null;
            try {
                greeting = await exampleService.greet(name);
            } catch (e) {
                error = String(e);
            } finally {
                loading = false;
            }
        }
    };
}
```

**Key patterns:**
- `$state` at module level = shared singleton across all components that import it
- Getters (`get current()`) expose reactive reads
- Methods handle loading/error states
- `isTauri()` guard provides browser-mode fallbacks

### Layer 4: Components & Pages (`src/routes/`)

SvelteKit pages consume stores and render UI.

```svelte
<!-- src/routes/example/+page.svelte -->
<script lang="ts">
    import { getGreetingStore } from '$lib/stores/example.svelte';

    const store = getGreetingStore();
    let name = $state('World');
</script>

<input bind:value={name} class="input input-bordered" />
<button class="btn btn-primary" onclick={() => store.greet(name)}>
    {store.loading ? 'Loading...' : 'Greet'}
</button>

{#if store.current}
    <p>{store.current.message}</p>
{/if}

{#if store.error}
    <p class="text-error">{store.error}</p>
{/if}
```

---

## Examples

### Simple: Return a value (no arguments, no errors)

The simplest possible command — no parameters, infallible return.

**Rust:**
```rust
#[tauri::command]
pub fn get_app_name() -> String {
    "Yarvis".to_string()
}
```

**Service:**
```typescript
export async function getAppName(): Promise<string> {
    return invoke<string>('get_app_name');
}
```

**Component (direct call, no store needed):**
```svelte
<script lang="ts">
    import { getAppName } from '$lib/services/example';
    import { onMount } from 'svelte';

    let name = $state('');
    onMount(async () => {
        name = await getAppName();
    });
</script>

<p>App: {name}</p>
```

For one-off reads you can skip the store layer and call the service directly.

---

### Simple: Command with arguments

**Rust:**
```rust
#[tauri::command]
pub fn add_numbers(a: f64, b: f64) -> f64 {
    a + b
}
```

**Service:**
```typescript
export async function addNumbers(a: number, b: number): Promise<number> {
    return invoke<number>('add_numbers', { a, b });
}
```

Note: the keys in the args object (`a`, `b`) must match the Rust parameter names exactly.

---

### Simple: Command that can fail

When a command might fail, return `Result<T, String>`. The error string becomes a rejected promise on the frontend.

**Rust:**
```rust
use std::fs;

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read {}: {}", path, e))
}
```

**Service:**
```typescript
export async function readFile(path: string): Promise<string> {
    return invoke<string>('read_file', { path });
}
```

**Component (with error handling):**
```svelte
<script lang="ts">
    import { readFile } from '$lib/services/files';

    let content = $state('');
    let error = $state('');

    async function load() {
        try {
            content = await readFile('/some/path.txt');
            error = '';
        } catch (e) {
            error = String(e);
        }
    }
</script>
```

---

### Medium: Structured data with CRUD operations

A full create/read/update/delete cycle. This mirrors how the settings system works.

**Types (shared contract):**

```typescript
// src/lib/types/index.ts
export interface Note {
    id: string;
    title: string;
    content: string;
    created_at: number;
    updated_at: number;
}
```

**Rust:**
```rust
// src-tauri/src/commands/notes.rs

use serde::{Deserialize, Serialize};
use rusqlite::{params, Connection};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: String,
    pub created_at: i64,
    pub updated_at: i64,
}

fn db_connection() -> Result<Connection, String> {
    let path = dirs::home_dir()
        .expect("No home dir")
        .join(".yarvis/yarvis.db");
    Connection::open(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn init_notes_db() -> Result<(), String> {
    let conn = db_connection()?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn list_notes() -> Result<Vec<Note>, String> {
    let conn = db_connection()?;
    let mut stmt = conn
        .prepare("SELECT id, title, content, created_at, updated_at FROM notes ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;

    let notes = stmt.query_map([], |row| {
        Ok(Note {
            id: row.get(0)?,
            title: row.get(1)?,
            content: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    })
    .map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(notes)
}

#[tauri::command]
pub fn create_note(title: String, content: String) -> Result<Note, String> {
    let conn = db_connection()?;
    let id = uuid_v4();
    let now = timestamp();

    conn.execute(
        "INSERT INTO notes (id, title, content, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, title, content, now, now],
    ).map_err(|e| e.to_string())?;

    Ok(Note { id, title, content, created_at: now, updated_at: now })
}

#[tauri::command]
pub fn update_note(id: String, title: String, content: String) -> Result<(), String> {
    let conn = db_connection()?;
    let now = timestamp();
    conn.execute(
        "UPDATE notes SET title = ?1, content = ?2, updated_at = ?3 WHERE id = ?4",
        params![title, content, now, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_note(id: String) -> Result<(), String> {
    let conn = db_connection()?;
    conn.execute("DELETE FROM notes WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn uuid_v4() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let t = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
    format!("{:x}-{:x}", t, rand_u32())
}

fn rand_u32() -> u32 {
    use std::collections::hash_map::RandomState;
    use std::hash::{BuildHasher, Hasher};
    RandomState::new().build_hasher().finish() as u32
}

fn timestamp() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as i64
}
```

**Service:**
```typescript
// src/lib/services/notes.ts

import { invoke } from './tauri';
import type { Note } from '$lib/types';

export async function initNotesDb(): Promise<void> {
    return invoke<void>('init_notes_db');
}

export async function listNotes(): Promise<Note[]> {
    return invoke<Note[]>('list_notes');
}

export async function createNote(title: string, content: string): Promise<Note> {
    return invoke<Note>('create_note', { title, content });
}

export async function updateNote(id: string, title: string, content: string): Promise<void> {
    return invoke<void>('update_note', { id, title, content });
}

export async function deleteNote(id: string): Promise<void> {
    return invoke<void>('delete_note', { id });
}
```

**Store:**
```typescript
// src/lib/stores/notes.svelte.ts

import * as notesService from '$lib/services/notes';
import { isTauri } from '$lib/services/tauri';
import type { Note } from '$lib/types';

let notes = $state<Note[]>([]);
let loading = $state(false);
let error = $state<string | null>(null);

export function getNotesStore() {
    return {
        get items() { return notes; },
        get loading() { return loading; },
        get error() { return error; },

        async init() {
            if (!isTauri()) return;
            try {
                await notesService.initNotesDb();
                await this.load();
            } catch (e) {
                error = String(e);
            }
        },

        async load() {
            if (!isTauri()) return;
            loading = true;
            try {
                notes = await notesService.listNotes();
                error = null;
            } catch (e) {
                error = String(e);
            } finally {
                loading = false;
            }
        },

        async create(title: string, content: string) {
            if (!isTauri()) return;
            try {
                const note = await notesService.createNote(title, content);
                notes = [note, ...notes];
                error = null;
            } catch (e) {
                error = String(e);
            }
        },

        async update(id: string, title: string, content: string) {
            if (!isTauri()) return;
            try {
                await notesService.updateNote(id, title, content);
                notes = notes.map(n => n.id === id
                    ? { ...n, title, content, updated_at: Date.now() / 1000 }
                    : n
                );
                error = null;
            } catch (e) {
                error = String(e);
            }
        },

        async remove(id: string) {
            if (!isTauri()) return;
            try {
                await notesService.deleteNote(id);
                notes = notes.filter(n => n.id !== id);
                error = null;
            } catch (e) {
                error = String(e);
            }
        }
    };
}
```

**Page (using SvelteKit load pattern):**
```svelte
<!-- src/routes/notes/+page.svelte -->
<script lang="ts">
    import { getNotesStore } from '$lib/stores/notes.svelte';
    import { onMount } from 'svelte';

    const store = getNotesStore();
    let newTitle = $state('');

    onMount(() => store.init());
</script>

<div class="max-w-2xl mx-auto p-4">
    <div class="flex gap-2 mb-4">
        <input bind:value={newTitle} class="input input-bordered flex-1" placeholder="Note title" />
        <button
            class="btn btn-primary"
            onclick={() => { store.create(newTitle, ''); newTitle = ''; }}
        >
            Add
        </button>
    </div>

    {#if store.loading}
        <span class="loading loading-dots"></span>
    {/if}

    {#each store.items as note (note.id)}
        <div class="card bg-base-200 mb-2 p-3">
            <div class="flex justify-between items-center">
                <span class="font-medium">{note.title}</span>
                <button class="btn btn-ghost btn-xs text-error" onclick={() => store.remove(note.id)}>
                    Delete
                </button>
            </div>
        </div>
    {/each}

    {#if store.error}
        <p class="text-error text-sm">{store.error}</p>
    {/if}
</div>
```

---

### Medium: Running shell commands (Python execution)

Executing external processes from Rust and streaming the output back.

**Rust:**
```rust
// src-tauri/src/commands/python.rs

use std::process::Command;

#[derive(Debug, serde::Serialize)]
pub struct ExecResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

/// Execute a Python script from a string
#[tauri::command]
pub fn run_python_inline(code: String, python_path: String) -> Result<ExecResult, String> {
    let output = Command::new(&python_path)
        .arg("-c")
        .arg(&code)
        .output()
        .map_err(|e| format!("Failed to run Python: {}", e))?;

    Ok(ExecResult {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code().unwrap_or(-1),
    })
}

/// Execute a Python script file
#[tauri::command]
pub fn run_python_file(path: String, python_path: String) -> Result<ExecResult, String> {
    let output = Command::new(&python_path)
        .arg(&path)
        .output()
        .map_err(|e| format!("Failed to run {}: {}", path, e))?;

    Ok(ExecResult {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code().unwrap_or(-1),
    })
}
```

**Service:**
```typescript
// src/lib/services/python.ts

import { invoke } from './tauri';

export interface ExecResult {
    stdout: string;
    stderr: string;
    exit_code: number;
}

export async function runPythonInline(code: string, pythonPath: string = 'python3'): Promise<ExecResult> {
    return invoke<ExecResult>('run_python_inline', { code, pythonPath });
}

export async function runPythonFile(path: string, pythonPath: string = 'python3'): Promise<ExecResult> {
    return invoke<ExecResult>('run_python_file', { path, pythonPath });
}
```

**Component:**
```svelte
<script lang="ts">
    import { runPythonInline } from '$lib/services/python';

    let code = $state('print("Hello from Python!")');
    let result = $state<{ stdout: string; stderr: string } | null>(null);
    let running = $state(false);

    async function run() {
        running = true;
        try {
            result = await runPythonInline(code);
        } catch (e) {
            result = { stdout: '', stderr: String(e) };
        }
        running = false;
    }
</script>

<textarea bind:value={code} class="textarea textarea-bordered w-full font-mono" rows="6"></textarea>
<button class="btn btn-primary mt-2" onclick={run} disabled={running}>
    {running ? 'Running...' : 'Run'}
</button>

{#if result}
    {#if result.stdout}
        <pre class="bg-base-200 p-3 rounded-lg mt-2 text-sm">{result.stdout}</pre>
    {/if}
    {#if result.stderr}
        <pre class="bg-error/10 text-error p-3 rounded-lg mt-2 text-sm">{result.stderr}</pre>
    {/if}
{/if}
```

---

### Medium-Advanced: Tauri state management (shared database connection)

Instead of opening a new SQLite connection for every command, use Tauri's managed state to share a connection pool.

**Rust:**
```rust
// src-tauri/src/db.rs

use rusqlite::Connection;
use std::sync::Mutex;

pub struct Database(pub Mutex<Connection>);

impl Database {
    pub fn new() -> Self {
        let path = dirs::home_dir()
            .expect("No home dir")
            .join(".yarvis/yarvis.db");

        std::fs::create_dir_all(path.parent().unwrap()).ok();
        let conn = Connection::open(path).expect("Failed to open database");

        // Run migrations on startup
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL DEFAULT '',
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS tags (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE
            );
            CREATE TABLE IF NOT EXISTS note_tags (
                note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
                tag_id TEXT REFERENCES tags(id) ON DELETE CASCADE,
                PRIMARY KEY (note_id, tag_id)
            );"
        ).expect("Failed to run migrations");

        Database(Mutex::new(conn))
    }
}
```

**Register as managed state in lib.rs:**
```rust
mod commands;
mod db;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(db::Database::new())  // <-- shared state
        .invoke_handler(tauri::generate_handler![
            commands::notes::list_notes,
            commands::notes::create_note,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Yarvis");
}
```

**Access state in commands:**
```rust
use tauri::State;
use crate::db::Database;

#[tauri::command]
pub fn list_notes(db: State<'_, Database>) -> Result<Vec<Note>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    // use conn for queries...
    Ok(vec![])
}
```

The `State<'_, Database>` parameter is injected automatically by Tauri — it doesn't appear in the frontend `invoke()` call. The frontend call is just:

```typescript
invoke<Note[]>('list_notes')  // no db argument needed
```

---

### Medium-Advanced: Async commands with Tauri

For long-running operations, use async commands so they don't block the main thread.

**Rust:**
```rust
#[tauri::command]
pub async fn download_file(url: String, dest: String) -> Result<String, String> {
    // This runs on a separate thread, won't block the UI
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("Download failed: {}", e))?;

    let bytes = response.bytes()
        .await
        .map_err(|e| format!("Read failed: {}", e))?;

    std::fs::write(&dest, &bytes)
        .map_err(|e| format!("Write failed: {}", e))?;

    Ok(format!("Saved {} bytes to {}", bytes.len(), dest))
}
```

The frontend call is identical — `invoke()` always returns a Promise:

```typescript
const result = await invoke<string>('download_file', {
    url: 'https://example.com/data.json',
    dest: '/tmp/data.json'
});
```

**Note:** Add `reqwest` to `Cargo.toml` if you need HTTP:
```toml
reqwest = { version = "0.12", features = ["rustls-tls"] }
tokio = { version = "1", features = ["full"] }
```

---

## Checklist: Adding a New Feature

1. **Types** — Define shared interfaces in `src/lib/types/index.ts`
2. **Rust command** — Create `src-tauri/src/commands/<feature>.rs`
3. **Register** — Add `pub mod <feature>;` in `commands/mod.rs` and list commands in `lib.rs`
4. **Service** — Create `src/lib/services/<feature>.ts` with typed `invoke()` wrappers
5. **Store** (if needed) — Create `src/lib/stores/<feature>.svelte.ts` with `$state` and `isTauri()` guards
6. **Route** — Create `src/routes/<feature>/+page.svelte` (and `+page.ts` if you want a load function)
7. **Permissions** — If using filesystem or shell, update `src-tauri/capabilities/default.json`
8. **Test** — Run `bun run tauri:dev` to verify the full chain

## Common Pitfalls

| Problem | Cause | Fix |
|---------|-------|-----|
| `Cannot read properties of undefined (reading 'invoke')` | Running in browser, not Tauri | Check `isTauri()` before calling invoke, or use `bun run tauri:dev` |
| Command not found | Not registered in `lib.rs` | Add to `tauri::generate_handler![]` |
| Argument mismatch | Key names differ between TS and Rust | Ensure `invoke('cmd', { myArg })` matches Rust's `fn cmd(my_arg: T)` — Tauri converts camelCase ↔ snake_case |
| `Result` error not caught | Forgot `try/catch` on the frontend | Rust `Err(String)` becomes a rejected promise — always handle it |
| State not updating in UI | Mutating instead of replacing `$state` | Use `value = { ...value, ...changes }` not `value.field = x` on object states |
