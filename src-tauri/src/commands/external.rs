use std::io::Write;
use std::process::{Command, Stdio};

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ThingsAddResult {
    pub status: String,
}

/// JXA script run via `osascript -l JavaScript -`. Receives args from `argv`.
/// Order: [title, notes, deadline (YYYY-MM-DD or empty), tags_csv, dedup_key].
///
/// Strategy:
/// 1. Embed `[yarvis:{dedup_key}]` as a marker line inside the task notes.
/// 2. Before creating, search Things for any to-do whose notes contain the
///    marker. If found, return {"status":"exists"} and do nothing.
/// 3. Otherwise create the task in the Inbox and return {"status":"created"}.
///
/// `Things.launch()` (instead of `activate()`) starts the app in the
/// background — no window pop, no focus change.
const THINGS_ADD_JXA: &str = r#"
function run(argv) {
  var title = argv[0] || '';
  var notes = argv[1] || '';
  var deadline = argv[2] || '';
  var tagsCsv = argv[3] || '';
  var dedupKey = argv[4] || '';

  var Things = Application('Things3');
  Things.launch();

  var marker = '[yarvis:' + dedupKey + ']';
  var fullNotes = notes ? notes + '\n\n' + marker : marker;

  var existing = Things.toDos.whose({ notes: { _contains: marker } })();
  if (existing.length > 0) {
    return JSON.stringify({ status: 'exists' });
  }

  var props = { name: title, notes: fullNotes };
  if (deadline) props.dueDate = new Date(deadline + 'T00:00:00');
  if (tagsCsv) props.tagNames = tagsCsv;

  var todo = Things.ToDo(props);
  Things.toDos.push(todo);

  return JSON.stringify({ status: 'created' });
}
"#;

#[tauri::command]
pub fn add_to_things(
    title: String,
    notes: Option<String>,
    deadline: Option<String>,
    tags: Vec<String>,
    dedup_key: String,
) -> Result<ThingsAddResult, String> {
    if title.trim().is_empty() {
        return Err("title required".into());
    }
    if dedup_key.trim().is_empty() {
        return Err("dedup_key required".into());
    }

    let mut child = Command::new("osascript")
        .arg("-l")
        .arg("JavaScript")
        .arg("-")
        .arg(&title)
        .arg(notes.unwrap_or_default())
        .arg(deadline.unwrap_or_default())
        .arg(tags.join(","))
        .arg(&dedup_key)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("failed to spawn osascript: {e}"))?;

    {
        let stdin = child
            .stdin
            .as_mut()
            .ok_or_else(|| "osascript stdin missing".to_string())?;
        stdin
            .write_all(THINGS_ADD_JXA.as_bytes())
            .map_err(|e| format!("failed to write JXA script: {e}"))?;
    }

    let output = child
        .wait_with_output()
        .map_err(|e| format!("osascript wait failed: {e}"))?;

    if !output.status.success() {
        return Err(format!(
            "osascript exit {}: {}",
            output.status,
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    serde_json::from_str(&stdout).map_err(|e| format!("parse {stdout}: {e}"))
}
