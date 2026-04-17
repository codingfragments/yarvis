use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

// ── Structs ──────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Clone)]
pub struct CourseSummary {
    pub id: String,
    pub filename: String,
    pub title: String,
    pub emoji: String,
    pub subtitle: String,
    pub session_count: usize,
    pub total_xp: u32,
}

#[derive(Debug, Serialize)]
pub struct LearningCourse {
    pub id: String,
    pub filename: String,
    pub title: String,
    pub emoji: String,
    pub subtitle: String,
    pub session_count: usize,
    pub total_xp: u32,
    pub time_metadata: String,
    pub about_markdown: String,
    pub xp_ranks: Vec<XpRank>,
    pub session_zero: Option<LearningSession>,
    pub phases: Vec<LearningPhase>,
    pub appendix_markdown: String,
}

#[derive(Debug, Serialize)]
pub struct LearningPhase {
    pub number: usize,
    pub name: String,
    pub emoji: String,
    pub intro_markdown: String,
    pub sessions: Vec<LearningSession>,
}

#[derive(Debug, Serialize)]
pub struct LearningSession {
    pub number: usize,
    pub title: String,
    pub goal: String,
    pub time: String,
    pub level: String,
    pub xp_available: Option<XpBreakdown>,
    pub prerequisites: String,
    pub theory_markdown: String,
    pub warmup_markdown: String,
    pub exercises: Vec<LearningExercise>,
    pub boss_challenge: Option<BossChallenge>,
    pub summary_points: Vec<String>,
    pub resources_markdown: String,
    pub is_session_zero: bool,
    pub raw_markdown: String,
}

#[derive(Debug, Serialize)]
pub struct LearningExercise {
    pub index: usize,
    pub title: String,
    pub description_markdown: String,
    pub xp: u32,
}

#[derive(Debug, Serialize)]
pub struct BossChallenge {
    pub title: String,
    pub description_markdown: String,
    pub xp: u32,
}

#[derive(Debug, Serialize, Clone)]
pub struct XpBreakdown {
    pub exercises: u32,
    pub boss: u32,
    pub total: u32,
}

#[derive(Debug, Serialize, Clone)]
pub struct XpRank {
    pub threshold: u32,
    pub emoji: String,
    pub name: String,
    pub meaning: String,
}

// ── Progress structs ─────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LearningProgress {
    pub courses: HashMap<String, CourseProgress>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CourseProgress {
    pub course_id: String,
    pub sessions_completed: HashMap<String, SessionProgress>,
    pub phases_completed: Vec<usize>,
    pub last_accessed: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionProgress {
    pub completed: bool,
    pub exercises_completed: Vec<usize>,
    pub boss_completed: bool,
    pub xp_earned: u32,
}

// ── Helpers ──────────────────────────────────────────────────────────────────

fn resolve_dir(dir: &str) -> PathBuf {
    if dir.starts_with('~') {
        if let Some(home) = dirs::home_dir() {
            return home.join(&dir[2..]);
        }
    }
    PathBuf::from(dir)
}

fn data_dir() -> PathBuf {
    dirs::home_dir()
        .expect("Could not find home directory")
        .join(".yarvis")
}

fn progress_path() -> PathBuf {
    data_dir().join("learning-progress.json")
}

fn trim_section(lines: &[&str]) -> String {
    let mut result: Vec<&str> = lines.to_vec();
    while result.first().map(|l| l.trim().is_empty()).unwrap_or(false) {
        result.remove(0);
    }
    while result.last().map(|l| l.trim().is_empty()).unwrap_or(false) {
        result.pop();
    }
    result.join("\n")
}

// ── Parsing ──────────────────────────────────────────────────────────────────

fn parse_course_summary(content: &str, filename: &str) -> Option<CourseSummary> {
    let id = filename.strip_suffix(".md").unwrap_or(filename).to_string();

    // Parse H1: "# emoji Title: Subtitle"
    let first_line = content.lines().find(|l| l.starts_with("# "))?;
    let after_hash = first_line.strip_prefix("# ")?.trim();

    let (emoji, rest) = split_emoji(after_hash);
    let (title, subtitle) = if let Some(idx) = rest.find(':') {
        let t = rest[..idx].trim().to_string();
        let s = rest[idx + 1..].trim().to_string();
        (t, s)
    } else {
        (rest.to_string(), String::new())
    };

    // Count sessions (### Session N:)
    let re_session = Regex::new(r"(?m)^### Session (\d+):").unwrap();
    let session_count = re_session
        .captures_iter(content)
        .filter(|c| c[1].parse::<usize>().unwrap_or(0) > 0)
        .count();

    // Extract total XP from footer
    let re_xp = Regex::new(r"Total possible XP:\s*(\d+)").unwrap();
    let total_xp = re_xp
        .captures(content)
        .and_then(|c| c[1].parse::<u32>().ok())
        .unwrap_or(0);

    Some(CourseSummary {
        id,
        filename: filename.to_string(),
        title,
        emoji,
        subtitle,
        session_count,
        total_xp,
    })
}

fn split_emoji(s: &str) -> (String, String) {
    // Take leading non-ASCII chars as emoji
    let mut chars = s.chars();
    let mut emoji = String::new();
    let mut rest_start = 0;

    for ch in chars.by_ref() {
        if ch.is_ascii_alphanumeric() || ch == ' ' {
            break;
        }
        emoji.push(ch);
        rest_start += ch.len_utf8();
    }

    let rest = s[rest_start..].trim().to_string();
    if emoji.is_empty() {
        (String::new(), s.to_string())
    } else {
        (emoji.trim().to_string(), rest)
    }
}

fn parse_full_course(content: &str, filename: &str) -> Result<LearningCourse, String> {
    let summary =
        parse_course_summary(content, filename).ok_or("Failed to parse course header")?;

    let lines: Vec<&str> = content.lines().collect();

    // Extract time metadata: "**A N-Session..." line
    let time_metadata = lines
        .iter()
        .find(|l| l.contains("Session") && l.contains("Program"))
        .map(|l| {
            l.trim()
                .trim_start_matches('*')
                .trim_end_matches('*')
                .trim()
                .to_string()
        })
        .unwrap_or_default();

    // Parse XP ranks table
    let xp_ranks = parse_xp_ranks(&lines);

    // Parse all sections using a state machine
    let mut about_lines: Vec<&str> = Vec::new();
    let mut appendix_lines: Vec<&str> = Vec::new();
    let mut session_zero: Option<LearningSession> = None;
    let mut phases: Vec<LearningPhase> = Vec::new();

    let re_phase =
        Regex::new(r"^##\s+.+?\s+PHASE\s+(\d+)\s*[—–\-]+\s*(.+)$").unwrap();
    let re_session = Regex::new(r"^###\s+Session\s+(\d+):\s*(.+)$").unwrap();
    let re_session_zero = Regex::new(r"(?i)^##\s+.+?Session\s+0").unwrap();
    let re_phase_complete =
        Regex::new(r"(?i)^##\s+.*Phase\s+\d+\s+Complete").unwrap();
    let re_xp_tracker = Regex::new(r"(?i)^##\s+XP\s+Tracker").unwrap();
    let re_appendix = Regex::new(r"(?i)^##\s+.*Appendix").unwrap();
    let re_about = Regex::new(r"(?i)^##\s+About\s+This\s+Program").unwrap();
    let re_h2 = Regex::new(r"^##\s+").unwrap();

    #[derive(PartialEq)]
    enum State {
        Top,
        About,
        SessionZero,
        PhaseIntro,
        InSession,
        PhaseComplete,
        XpTracker,
        Appendix,
        Skip,
    }

    let mut state = State::Top;
    let mut current_session_lines: Vec<&str> = Vec::new();
    let mut current_session_number: usize = 0;
    let mut current_session_title = String::new();
    let mut phase_intro_lines: Vec<&str> = Vec::new();
    let mut session_zero_lines: Vec<&str> = Vec::new();
    let mut i = 0;

    while i < lines.len() {
        let line = lines[i];

        // Check for H2/H3 section transitions
        if re_about.is_match(line) {
            flush_session(
                &mut current_session_lines,
                current_session_number,
                &current_session_title,
                &mut phases,
                &mut session_zero,
            );
            state = State::About;
            i += 1;
            continue;
        }

        if re_session_zero.is_match(line) {
            flush_session(
                &mut current_session_lines,
                current_session_number,
                &current_session_title,
                &mut phases,
                &mut session_zero,
            );
            state = State::SessionZero;
            session_zero_lines.clear();
            i += 1;
            continue;
        }

        if let Some(caps) = re_phase.captures(line) {
            flush_session(
                &mut current_session_lines,
                current_session_number,
                &current_session_title,
                &mut phases,
                &mut session_zero,
            );
            let phase_num = caps[1].parse::<usize>().unwrap_or(0);
            let phase_name = caps[2].trim().to_string();
            let (phase_emoji, _) = split_emoji(line.trim_start_matches('#').trim());
            phases.push(LearningPhase {
                number: phase_num,
                name: phase_name,
                emoji: phase_emoji,
                intro_markdown: String::new(),
                sessions: Vec::new(),
            });
            phase_intro_lines.clear();
            state = State::PhaseIntro;
            i += 1;
            continue;
        }

        if let Some(caps) = re_session.captures(line) {
            flush_session(
                &mut current_session_lines,
                current_session_number,
                &current_session_title,
                &mut phases,
                &mut session_zero,
            );
            // Finalize phase intro if we were in it
            if state == State::PhaseIntro {
                if let Some(phase) = phases.last_mut() {
                    phase.intro_markdown = trim_section(&phase_intro_lines);
                }
            }
            current_session_number = caps[1].parse::<usize>().unwrap_or(0);
            current_session_title = caps[2].trim().to_string();
            current_session_lines.clear();
            state = State::InSession;
            i += 1;
            continue;
        }

        if re_phase_complete.is_match(line) {
            flush_session(
                &mut current_session_lines,
                current_session_number,
                &current_session_title,
                &mut phases,
                &mut session_zero,
            );
            state = State::PhaseComplete;
            i += 1;
            continue;
        }

        if re_xp_tracker.is_match(line) {
            flush_session(
                &mut current_session_lines,
                current_session_number,
                &current_session_title,
                &mut phases,
                &mut session_zero,
            );
            state = State::XpTracker;
            i += 1;
            continue;
        }

        if re_appendix.is_match(line) {
            flush_session(
                &mut current_session_lines,
                current_session_number,
                &current_session_title,
                &mut phases,
                &mut session_zero,
            );
            state = State::Appendix;
            i += 1;
            continue;
        }

        // Skip other H2 sections we don't explicitly handle (Prerequisites, XP System, Curriculum Map)
        if re_h2.is_match(line) && state != State::Appendix && state != State::SessionZero {
            if state == State::About {
                // End about section at next H2
                state = State::Skip;
            }
            if state == State::InSession {
                flush_session(
                    &mut current_session_lines,
                    current_session_number,
                    &current_session_title,
                    &mut phases,
                    &mut session_zero,
                );
            }
            // Continue accumulating for appendix, skip otherwise
            if state != State::Appendix {
                state = State::Skip;
            }
        }

        // Accumulate lines based on state
        match state {
            State::About => about_lines.push(line),
            State::SessionZero => session_zero_lines.push(line),
            State::PhaseIntro => phase_intro_lines.push(line),
            State::InSession => current_session_lines.push(line),
            State::Appendix => appendix_lines.push(line),
            _ => {}
        }

        i += 1;
    }

    // Flush any remaining session
    flush_session(
        &mut current_session_lines,
        current_session_number,
        &current_session_title,
        &mut phases,
        &mut session_zero,
    );

    // Build session zero if we have content
    if session_zero.is_none() && !session_zero_lines.is_empty() {
        session_zero = Some(build_session_zero(&session_zero_lines));
    }

    Ok(LearningCourse {
        id: summary.id,
        filename: summary.filename,
        title: summary.title,
        emoji: summary.emoji,
        subtitle: summary.subtitle,
        session_count: summary.session_count,
        total_xp: summary.total_xp,
        time_metadata,
        about_markdown: trim_section(&about_lines),
        xp_ranks,
        session_zero,
        phases,
        appendix_markdown: trim_section(&appendix_lines),
    })
}

fn flush_session(
    lines: &mut Vec<&str>,
    number: usize,
    title: &str,
    phases: &mut Vec<LearningPhase>,
    session_zero: &mut Option<LearningSession>,
) {
    if lines.is_empty() {
        return;
    }

    if number == 0 && session_zero.is_none() {
        *session_zero = Some(build_session_zero(lines));
    } else if number > 0 {
        let session = parse_session(lines, number, title);
        if let Some(phase) = phases.last_mut() {
            phase.sessions.push(session);
        }
    }

    lines.clear();
}

fn build_session_zero(lines: &[&str]) -> LearningSession {
    let raw = trim_section(lines);
    LearningSession {
        number: 0,
        title: "Before We Begin".to_string(),
        goal: String::new(),
        time: String::new(),
        level: String::new(),
        xp_available: None,
        prerequisites: String::new(),
        theory_markdown: raw.clone(),
        warmup_markdown: String::new(),
        exercises: Vec::new(),
        boss_challenge: None,
        summary_points: Vec::new(),
        resources_markdown: String::new(),
        is_session_zero: true,
        raw_markdown: raw,
    }
}

fn parse_session(lines: &[&str], number: usize, title: &str) -> LearningSession {
    let raw = lines.join("\n");

    // Extract metadata from the top lines
    let mut goal = String::new();
    let mut time = String::new();
    let mut level = String::new();
    let mut xp_available: Option<XpBreakdown> = None;
    let mut prerequisites = String::new();

    let re_goal = Regex::new(r"\*\*Goal:\*\*\s*(.+)").unwrap();
    let re_time = Regex::new(r"\*\*⏱?\s*Time:\*\*\s*(.+)").unwrap();
    let re_level = Regex::new(r"\*\*Level:\*\*\s*(.+)").unwrap();
    let re_xp = Regex::new(r"\*\*XP available:\*\*\s*(\d+)\s*\+\s*(\d+)\s*=\s*(\d+)").unwrap();
    let re_prereqs = Regex::new(r"\*\*Prerequisites?:\*\*\s*(.+)").unwrap();

    for line in lines.iter().take(15) {
        if let Some(caps) = re_goal.captures(line) {
            goal = caps[1].trim().to_string();
        }
        if let Some(caps) = re_time.captures(line) {
            time = caps[1].trim().to_string();
        }
        if let Some(caps) = re_level.captures(line) {
            level = caps[1].trim().to_string();
        }
        if let Some(caps) = re_xp.captures(line) {
            xp_available = Some(XpBreakdown {
                exercises: caps[1].parse().unwrap_or(0),
                boss: caps[2].parse().unwrap_or(0),
                total: caps[3].parse().unwrap_or(0),
            });
        }
        if let Some(caps) = re_prereqs.captures(line) {
            prerequisites = caps[1].trim().to_string();
        }
        // Also handle combined "Time: X | Level: Y | XP available: Z" lines
        if line.contains("**⏱") || line.contains("**Time") {
            if let Some(caps) = Regex::new(r"Level:\*?\*?\s*(.+?)(?:\s*\||\s*$)")
                .unwrap()
                .captures(line)
            {
                if level.is_empty() {
                    level = caps[1].trim().trim_end_matches('*').to_string();
                }
            }
        }
    }

    // Split content by H4 sections
    let mut sections: Vec<(String, Vec<&str>)> = Vec::new();
    let mut current_h4 = String::new();
    let mut current_lines: Vec<&str> = Vec::new();

    let re_h4 = Regex::new(r"^####\s+(.+)$").unwrap();

    for line in lines {
        if let Some(caps) = re_h4.captures(line) {
            if !current_h4.is_empty() || !current_lines.is_empty() {
                sections.push((current_h4.clone(), current_lines.clone()));
            }
            current_h4 = caps[1].trim().to_string();
            current_lines.clear();
        } else {
            current_lines.push(line);
        }
    }
    if !current_h4.is_empty() || !current_lines.is_empty() {
        sections.push((current_h4, current_lines));
    }

    let mut theory_markdown = String::new();
    let mut warmup_markdown = String::new();
    let mut exercises_markdown = String::new();
    let mut boss_markdown = String::new();
    let mut summary_points: Vec<String> = Vec::new();
    let mut resources_markdown = String::new();

    for (header, section_lines) in &sections {
        let header_lower = header.to_lowercase();
        let content = trim_section(section_lines);

        if header_lower.contains("concept") || header_lower.contains("theory") {
            theory_markdown = content;
        } else if header_lower.contains("warm") {
            warmup_markdown = content;
        } else if header_lower.contains("exercise") {
            exercises_markdown = content;
        } else if header_lower.contains("boss") {
            boss_markdown = content;
        } else if header_lower.contains("summary") || header_lower.contains("remember") {
            summary_points = extract_summary_points(&content);
        } else if header_lower.contains("resource") {
            resources_markdown = content;
        }
    }

    // Parse individual exercises
    let exercises = parse_exercises(&exercises_markdown);

    // Parse boss challenge
    let boss_challenge = parse_boss_challenge(&boss_markdown);

    LearningSession {
        number,
        title: title.to_string(),
        goal,
        time,
        level,
        xp_available,
        prerequisites,
        theory_markdown,
        warmup_markdown,
        exercises,
        boss_challenge,
        summary_points,
        resources_markdown,
        is_session_zero: false,
        raw_markdown: raw,
    }
}

fn parse_exercises(markdown: &str) -> Vec<LearningExercise> {
    if markdown.is_empty() {
        return Vec::new();
    }

    let re_exercise =
        Regex::new(r"(?m)^\*\*(?:Exercise\s*)?(\d+)?[\.\):]*\s*(.+?)(?:\s*\((\d+)\s*XP\))?\s*\*\*")
            .unwrap();
    let re_xp_inline = Regex::new(r"\((\d+)\s*XP\)").unwrap();

    let lines: Vec<&str> = markdown.lines().collect();
    let mut exercises: Vec<LearningExercise> = Vec::new();
    let mut current_title = String::new();
    let mut current_xp: u32 = 0;
    let mut current_lines: Vec<&str> = Vec::new();
    let mut found_any = false;

    for line in &lines {
        if let Some(caps) = re_exercise.captures(line) {
            // Flush previous exercise
            if found_any {
                exercises.push(LearningExercise {
                    index: exercises.len(),
                    title: current_title.clone(),
                    description_markdown: trim_section(&current_lines),
                    xp: current_xp,
                });
            }
            current_title = caps[2].trim().trim_end_matches('*').to_string();
            // Remove XP from title if present
            current_title = re_xp_inline.replace(&current_title, "").trim().to_string();
            current_xp = caps
                .get(3)
                .and_then(|m| m.as_str().parse().ok())
                .unwrap_or(0);
            current_lines.clear();
            found_any = true;
        } else if found_any {
            current_lines.push(line);
        }
    }

    // Flush last exercise
    if found_any {
        exercises.push(LearningExercise {
            index: exercises.len(),
            title: current_title,
            description_markdown: trim_section(&current_lines),
            xp: current_xp,
        });
    }

    exercises
}

fn parse_boss_challenge(markdown: &str) -> Option<BossChallenge> {
    if markdown.is_empty() {
        return None;
    }

    let re_xp = Regex::new(r"\((\d+)\s*XP\)").unwrap();
    let xp = re_xp
        .captures(markdown)
        .and_then(|c| c[1].parse::<u32>().ok())
        .unwrap_or(0);

    // Title is usually in the H4 header or first bold line
    let first_line = markdown.lines().next().unwrap_or("");
    let title = re_xp
        .replace(first_line, "")
        .trim()
        .trim_start_matches('*')
        .trim_end_matches('*')
        .trim()
        .to_string();

    let description = markdown
        .lines()
        .skip(if title.is_empty() { 0 } else { 1 })
        .collect::<Vec<_>>()
        .join("\n");

    Some(BossChallenge {
        title: if title.is_empty() {
            "Boss Challenge".to_string()
        } else {
            title
        },
        description_markdown: description.trim().to_string(),
        xp,
    })
}

fn extract_summary_points(content: &str) -> Vec<String> {
    let re_numbered = Regex::new(r"^\s*(\d+)\.\s+\*\*(.+?)\*\*(.*)$").unwrap();

    content
        .lines()
        .filter_map(|line| {
            if let Some(caps) = re_numbered.captures(line) {
                let bold_part = caps[2].trim().to_string();
                let rest = caps[3].trim().to_string();
                if rest.is_empty() {
                    Some(bold_part)
                } else {
                    Some(format!("**{}** {}", bold_part, rest))
                }
            } else {
                None
            }
        })
        .collect()
}

fn parse_xp_ranks(lines: &[&str]) -> Vec<XpRank> {
    // Find "XP System" or "Rank Progression" section
    let start = lines.iter().position(|l| {
        let lower = l.to_lowercase();
        lower.contains("xp system") || lower.contains("rank progression")
    });

    let start = match start {
        Some(s) => s,
        None => return Vec::new(),
    };

    // Find the table within this section
    let mut ranks: Vec<XpRank> = Vec::new();
    let mut in_table = false;
    let mut past_separator = false;

    for line in &lines[start..] {
        // Stop at next H2
        if line.starts_with("## ") && in_table {
            break;
        }
        if line.starts_with("---") && in_table {
            break;
        }

        if line.starts_with('|') && line.contains("---") {
            past_separator = true;
            in_table = true;
            continue;
        }

        if line.starts_with('|') && !line.contains("---") {
            if !in_table {
                in_table = true;
                continue; // skip header row
            }
            if !past_separator {
                continue;
            }

            let cells: Vec<&str> = line
                .split('|')
                .map(|c| c.trim())
                .filter(|c| !c.is_empty())
                .collect();

            if cells.len() >= 3 {
                // Parse threshold from first cell (e.g., "0–149" or "0-149")
                let threshold_str = cells[0];
                let threshold = Regex::new(r"(\d+)")
                    .unwrap()
                    .captures(threshold_str)
                    .and_then(|c| c[1].parse::<u32>().ok())
                    .unwrap_or(0);

                let rank_cell = cells[1];
                let (emoji, name) = split_emoji(rank_cell);

                let meaning = if cells.len() >= 4 {
                    cells[3].to_string()
                } else {
                    cells.get(2).unwrap_or(&"").to_string()
                };

                ranks.push(XpRank {
                    threshold,
                    emoji,
                    name,
                    meaning,
                });
            }
        } else if in_table && past_separator {
            break; // end of table
        }
    }

    ranks
}

// ── Commands ─────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn scan_learning_courses(dir: String) -> Result<Vec<CourseSummary>, String> {
    let base = resolve_dir(&dir);
    if !base.is_dir() {
        return Err(format!("Learning directory not found: {}", base.display()));
    }

    let mut courses: Vec<CourseSummary> = Vec::new();
    let entries = fs::read_dir(&base).map_err(|e| e.to_string())?;

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        if !path.is_file() || !name.ends_with("-curriculum.md") {
            continue;
        }

        // Read the file for summary parsing
        if let Ok(content) = fs::read_to_string(&path) {
            if let Some(summary) = parse_course_summary(&content, &name) {
                courses.push(summary);
            }
        }
    }

    courses.sort_by(|a, b| a.title.cmp(&b.title));
    Ok(courses)
}

#[tauri::command]
pub fn get_learning_course(dir: String, filename: String) -> Result<LearningCourse, String> {
    let path = resolve_dir(&dir).join(&filename);
    let content =
        fs::read_to_string(&path).map_err(|e| format!("Failed to read {}: {}", filename, e))?;
    parse_full_course(&content, &filename)
}

#[tauri::command]
pub fn get_learning_progress() -> Result<LearningProgress, String> {
    let path = progress_path();
    if !path.exists() {
        return Ok(LearningProgress {
            courses: HashMap::new(),
        });
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_learning_progress(progress: LearningProgress) -> Result<(), String> {
    let dir = data_dir();
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(&progress).map_err(|e| e.to_string())?;
    fs::write(progress_path(), json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn reset_learning_progress(course_id: Option<String>) -> Result<(), String> {
    let path = progress_path();
    if !path.exists() {
        return Ok(());
    }

    match course_id {
        Some(id) => {
            let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
            let mut progress: LearningProgress =
                serde_json::from_str(&content).map_err(|e| e.to_string())?;
            progress.courses.remove(&id);
            let json = serde_json::to_string_pretty(&progress).map_err(|e| e.to_string())?;
            fs::write(&path, json).map_err(|e| e.to_string())?;
        }
        None => {
            let empty = LearningProgress {
                courses: HashMap::new(),
            };
            let json = serde_json::to_string_pretty(&empty).map_err(|e| e.to_string())?;
            fs::write(&path, json).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}
