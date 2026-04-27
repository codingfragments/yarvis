use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

fn resolve_dir(dir: &str) -> PathBuf {
    if let Some(rest) = dir.strip_prefix("~/") {
        if let Some(home) = dirs::home_dir() {
            return home.join(rest);
        }
    }
    if dir == "~" {
        if let Some(home) = dirs::home_dir() {
            return home;
        }
    }
    PathBuf::from(dir)
}

// ── Daily JSON schema ───────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyBriefing {
    pub meta: BriefingMeta,
    #[serde(default)]
    pub greeting: Option<Greeting>,
    #[serde(default)]
    pub meeting_preps: Vec<MeetingPrep>,
    #[serde(default)]
    pub calendar: Option<Calendar>,
    #[serde(default)]
    pub email: Option<EmailSection>,
    #[serde(default)]
    pub slack: Option<SlackSection>,
    #[serde(default)]
    pub intelligence: Vec<IntelCategory>,
    #[serde(default)]
    pub action_items: Vec<ActionItem>,
    #[serde(default)]
    pub focus_prompt: Option<String>,
    #[serde(default)]
    pub fun: Option<Fun>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BriefingMeta {
    pub briefing_date: String,
    pub generated_at: String,
    #[serde(default)]
    pub timezone: Option<String>,
    #[serde(default)]
    pub update_sequence: Option<u32>,
    #[serde(default)]
    pub last_successful_run: Option<String>,
    #[serde(default)]
    pub run_type: Option<String>,
    #[serde(default)]
    pub next_meeting: Option<NextMeeting>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NextMeeting {
    pub title: String,
    pub starts_at: String,
    pub minutes_away: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Greeting {
    pub text: String,
    #[serde(default)]
    pub context_note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeetingPrep {
    pub time: String,
    pub title: String,
    #[serde(default)]
    pub file: Option<String>,
    #[serde(default)]
    pub deal_tag: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Calendar {
    #[serde(default)]
    pub summary: Option<String>,
    #[serde(default)]
    pub events: Vec<CalendarEvent>,
    #[serde(default)]
    pub conflicts: Vec<Conflict>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalendarEvent {
    pub start: String,
    pub end: String,
    pub title: String,
    #[serde(default)]
    pub participants: Vec<String>,
    #[serde(rename = "type")]
    pub event_type: String,
    #[serde(default)]
    pub is_external: bool,
    pub urgency: String,
    #[serde(default)]
    pub deal_tag: Option<String>,
    #[serde(default)]
    pub initiative: Option<String>,
    #[serde(default)]
    pub links: Option<EventLinks>,
    #[serde(default)]
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventLinks {
    #[serde(default)]
    pub doc: Option<String>,
    #[serde(default)]
    pub zoom: Option<String>,
    #[serde(default)]
    pub other: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conflict {
    pub time: String,
    pub event_titles: Vec<String>,
    pub description: String,
    #[serde(default)]
    pub action_needed: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmailSection {
    #[serde(default)]
    pub act_today: Vec<EmailItem>,
    #[serde(default)]
    pub fyi: Vec<EmailItem>,
    #[serde(default)]
    pub no_action_summary: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmailItem {
    pub id: String,
    pub from: String,
    pub subject: String,
    pub received: String,
    #[serde(default)]
    pub url: Option<String>,
    pub summary: String,
    #[serde(default)]
    pub action: Option<String>,
    #[serde(default)]
    pub context: Option<String>,
    pub urgency: String,
    #[serde(default)]
    pub deal_tag: Option<String>,
    #[serde(default)]
    pub initiative: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlackSection {
    #[serde(default)]
    pub since: Option<String>,
    #[serde(default)]
    pub channels: Vec<SlackChannel>,
    #[serde(default)]
    pub dms: Vec<SlackDm>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlackChannel {
    pub channel_id: String,
    pub channel_name: String,
    #[serde(default)]
    pub url: Option<String>,
    #[serde(default)]
    pub deal_tag: Option<String>,
    pub activity_level: String,
    #[serde(default)]
    pub messages: Vec<SlackMessage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlackMessage {
    #[serde(default)]
    pub author: Option<String>,
    #[serde(default)]
    pub timestamp: Option<String>,
    pub summary: String,
    #[serde(default)]
    pub links: Vec<NamedLink>,
    #[serde(default)]
    pub action: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NamedLink {
    pub label: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlackDm {
    pub with: String,
    #[serde(default)]
    pub url: Option<String>,
    pub summary: String,
    #[serde(default)]
    pub action: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntelCategory {
    pub category_id: String,
    #[serde(default)]
    pub items: Vec<IntelItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntelItem {
    pub headline: String,
    pub detail: String,
    #[serde(default)]
    pub date: Option<String>,
    #[serde(default)]
    pub source: Option<String>,
    #[serde(default)]
    pub url: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub relevance: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionItem {
    pub id: String,
    pub text: String,
    pub priority: String,
    #[serde(default)]
    pub deadline: Option<String>,
    #[serde(default)]
    pub source_type: Option<String>,
    #[serde(default)]
    pub source_ref: Option<String>,
    #[serde(default)]
    pub url: Option<String>,
    #[serde(default)]
    pub deal_tag: Option<String>,
    #[serde(default)]
    pub done: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Fun {
    #[serde(default)]
    pub fact: Option<String>,
    #[serde(default)]
    pub joke: Option<String>,
}

// ── Briefing config (YAML) — minimum needed for rendering ───────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BriefingConfig {
    #[serde(default)]
    pub user: Option<UserProfile>,
    #[serde(default)]
    pub intelligence_categories: Vec<IntelligenceCategoryDef>,
    #[serde(default)]
    pub active_deals: Vec<ActiveDealDef>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile {
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub role: Option<String>,
    #[serde(default)]
    pub timezone: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntelligenceCategoryDef {
    pub id: String,
    pub label: String,
    pub icon: String,
    #[serde(default)]
    pub order: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveDealDef {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub stage: Option<String>,
    /// Optional accent colour (hex like `#f5a97f`). Frontend falls back to a
    /// neutral when missing — users can add this to `briefing_config.yaml`.
    #[serde(default)]
    pub color: Option<String>,
}

// ── Status + questions ──────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct DailyStatus {
    pub exists: bool,
    pub briefing_date: Option<String>,
    pub generated_at: Option<String>,
    pub pending_questions: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct DashboardQuestion {
    pub index: usize,
    pub status: String,
    pub title: String,
    pub asked: Option<String>,
    pub run: Option<String>,
    pub context: Option<String>,
    pub body: String,
    pub answer: Option<String>,
}

// ── Commands ────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn read_daily(daily_dir: String, briefings_dir: String) -> Result<DailyBriefing, String> {
    let path = resolve_dir(&daily_dir).join("daily.json");
    let raw = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read daily.json at {}: {}", path.display(), e))?;
    let mut briefing: DailyBriefing = serde_json::from_str(&raw)
        .map_err(|e| format!("daily.json parse error: {}", e))?;

    let briefings_root = resolve_dir(&briefings_dir);
    briefing.meeting_preps =
        resolve_meeting_preps(&briefings_root, &briefing.meta.briefing_date, briefing.meeting_preps);

    Ok(briefing)
}

/// Filter meeting_preps to only those that have a matching `meeting-prep-HHMM-*.md`
/// on disk in the dated briefings folder, and backfill the `file` field with the
/// real filename. Entries without a matching prep file are dropped.
fn resolve_meeting_preps(
    briefings_root: &PathBuf,
    briefing_date: &str,
    preps: Vec<MeetingPrep>,
) -> Vec<MeetingPrep> {
    let folder_name = briefing_date.replace('-', "_");
    let dated_dir = briefings_root.join(&folder_name);
    if !dated_dir.is_dir() {
        return Vec::new();
    }

    let mut prep_files: Vec<String> = match fs::read_dir(&dated_dir) {
        Ok(entries) => entries
            .filter_map(|e| e.ok())
            .map(|e| e.file_name().to_string_lossy().to_string())
            .filter(|n| n.starts_with("meeting-prep-") && n.ends_with(".md"))
            .collect(),
        Err(_) => Vec::new(),
    };
    prep_files.sort();

    preps
        .into_iter()
        .filter_map(|mut p| {
            let compact_time = p.time.replace(':', "");
            let prefix = format!("meeting-prep-{}-", compact_time);
            prep_files
                .iter()
                .find(|name| name.starts_with(&prefix))
                .map(|name| {
                    p.file = Some(name.clone());
                    p
                })
        })
        .collect()
}

#[tauri::command]
pub fn read_config(daily_src_dir: String) -> Result<BriefingConfig, String> {
    let path = resolve_dir(&daily_src_dir).join("briefing_config.yaml");
    let raw = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read briefing_config.yaml at {}: {}", path.display(), e))?;
    serde_yaml::from_str::<BriefingConfig>(&raw)
        .map_err(|e| format!("briefing_config.yaml parse error: {}", e))
}

#[tauri::command]
pub fn read_memory(daily_dir: String) -> Result<String, String> {
    let path = resolve_dir(&daily_dir).join("memory.md");
    fs::read_to_string(&path).map_err(|e| format!("Failed to read memory.md: {}", e))
}

/// Read a single meeting-prep markdown file from the dated briefings folder.
/// Refuses anything that isn't a `meeting-prep-*.md` (so morning-briefing
/// files and arbitrary paths can never be opened through this command).
#[tauri::command]
pub fn read_prep(
    briefings_dir: String,
    briefing_date: String,
    filename: String,
) -> Result<String, String> {
    if !filename.starts_with("meeting-prep-") || !filename.ends_with(".md") {
        return Err(format!(
            "Refusing to read non-prep file: {}",
            filename
        ));
    }
    if filename.contains('/') || filename.contains('\\') || filename.contains("..") {
        return Err("Invalid filename".to_string());
    }

    let folder_name = briefing_date.replace('-', "_");
    let path = resolve_dir(&briefings_dir).join(&folder_name).join(&filename);
    fs::read_to_string(&path).map_err(|e| format!("Failed to read {}: {}", filename, e))
}

#[tauri::command]
pub fn daily_status(daily_dir: String) -> Result<DailyStatus, String> {
    let dir = resolve_dir(&daily_dir);
    let json_path = dir.join("daily.json");
    if !json_path.exists() {
        return Ok(DailyStatus {
            exists: false,
            briefing_date: None,
            generated_at: None,
            pending_questions: 0,
        });
    }

    let (briefing_date, generated_at) = match fs::read_to_string(&json_path) {
        Ok(raw) => match serde_json::from_str::<serde_json::Value>(&raw) {
            Ok(v) => (
                v.get("meta").and_then(|m| m.get("briefing_date")).and_then(|s| s.as_str()).map(String::from),
                v.get("meta").and_then(|m| m.get("generated_at")).and_then(|s| s.as_str()).map(String::from),
            ),
            Err(_) => (None, None),
        },
        Err(_) => (None, None),
    };

    let pending_questions = fs::read_to_string(dir.join("question.md"))
        .map(|content| count_pending_questions(&content))
        .unwrap_or(0);

    Ok(DailyStatus {
        exists: true,
        briefing_date,
        generated_at,
        pending_questions,
    })
}

#[tauri::command]
pub fn read_questions(daily_dir: String) -> Result<Vec<DashboardQuestion>, String> {
    let path = resolve_dir(&daily_dir).join("question.md");
    if !path.exists() {
        return Ok(Vec::new());
    }
    let raw = fs::read_to_string(&path).map_err(|e| format!("Failed to read question.md: {}", e))?;
    Ok(parse_questions(&raw))
}

fn count_pending_questions(content: &str) -> usize {
    content
        .lines()
        .filter(|l| {
            let t = l.trim_start();
            t.starts_with("## [PENDING]")
        })
        .count()
}

fn parse_questions(content: &str) -> Vec<DashboardQuestion> {
    let mut out = Vec::new();
    let mut current: Option<DashboardQuestion> = None;
    let mut body_lines: Vec<String> = Vec::new();
    let mut answer_lines: Vec<String> = Vec::new();
    let mut in_answer = false;
    let mut idx = 0usize;

    let push_current = |current: &mut Option<DashboardQuestion>,
                        body_lines: &mut Vec<String>,
                        answer_lines: &mut Vec<String>,
                        out: &mut Vec<DashboardQuestion>| {
        if let Some(mut q) = current.take() {
            q.body = trim_blank(body_lines).join("\n");
            let answer_text = trim_blank(answer_lines).join("\n").trim().to_string();
            q.answer = if is_placeholder_answer(&answer_text) || answer_text.is_empty() {
                None
            } else {
                Some(answer_text)
            };
            out.push(q);
        }
        body_lines.clear();
        answer_lines.clear();
    };

    for line in content.lines() {
        let trimmed = line.trim_start();
        if let Some(rest) = trimmed.strip_prefix("## [") {
            // header line like: ## [PENDING] question text
            if let Some(end) = rest.find(']') {
                push_current(&mut current, &mut body_lines, &mut answer_lines, &mut out);
                in_answer = false;
                let status = rest[..end].to_string();
                let title = rest[end + 1..].trim().to_string();
                current = Some(DashboardQuestion {
                    index: idx,
                    status,
                    title,
                    asked: None,
                    run: None,
                    context: None,
                    body: String::new(),
                    answer: None,
                });
                idx += 1;
                continue;
            }
        }
        if line.trim() == "---" {
            push_current(&mut current, &mut body_lines, &mut answer_lines, &mut out);
            in_answer = false;
            continue;
        }
        if let Some(q) = current.as_mut() {
            if let Some(rest) = trimmed.strip_prefix("**Asked:**") {
                let parts: Vec<&str> = rest.split('·').collect();
                q.asked = parts.first().map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
                if let Some(run_part) = parts.get(1) {
                    let run = run_part.trim().trim_start_matches("**Run:**").trim().to_string();
                    if !run.is_empty() {
                        q.run = Some(run);
                    }
                }
                continue;
            }
            if let Some(rest) = trimmed.strip_prefix("**Context:**") {
                q.context = Some(rest.trim().to_string());
                continue;
            }
            if trimmed.starts_with('>') {
                in_answer = true;
                let stripped = trimmed.trim_start_matches('>').trim();
                answer_lines.push(stripped.to_string());
                continue;
            }
            if in_answer && trimmed.is_empty() {
                in_answer = false;
                continue;
            }
            body_lines.push(line.to_string());
        }
    }
    push_current(&mut current, &mut body_lines, &mut answer_lines, &mut out);
    out
}

fn trim_blank(lines: &[String]) -> Vec<String> {
    let mut start = 0;
    let mut end = lines.len();
    while start < end && lines[start].trim().is_empty() {
        start += 1;
    }
    while end > start && lines[end - 1].trim().is_empty() {
        end -= 1;
    }
    lines[start..end].to_vec()
}

fn is_placeholder_answer(text: &str) -> bool {
    let t = text.trim();
    t == "*(type your answer here)*" || t == "(type your answer here)"
}
