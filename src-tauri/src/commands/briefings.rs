use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize)]
pub struct DateEntry {
    pub key: String,
    pub display: String,
    pub is_today: bool,
    pub file_count: usize,
}

#[derive(Debug, Serialize)]
pub struct FileEntry {
    pub filename: String,
    pub label: String,
    pub icon: String,
    pub time: Option<String>,
    pub is_morning: bool,
    pub unchecked_count: usize,
}

fn resolve_dir(dir: &str) -> PathBuf {
    if dir.starts_with('~') {
        if let Some(home) = dirs::home_dir() {
            return home.join(&dir[2..]);
        }
    }
    PathBuf::from(dir)
}

fn today_key() -> String {
    let now = chrono::Local::now();
    now.format("%Y_%m_%d").to_string()
}

fn format_date_display(key: &str) -> String {
    let parts: Vec<&str> = key.split('_').collect();
    if parts.len() != 3 {
        return key.to_string();
    }
    let (y, m, d) = (
        parts[0].parse::<i32>().unwrap_or(0),
        parts[1].parse::<u32>().unwrap_or(0),
        parts[2].parse::<u32>().unwrap_or(0),
    );
    let months = [
        "", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    let month_name = months.get(m as usize).unwrap_or(&"???");
    format!("{} {}, {}", month_name, d, y)
}

fn is_real_md_file(path: &Path) -> bool {
    if !path.is_file() {
        return false;
    }
    // Skip symlinks
    if path.symlink_metadata().map(|m| m.file_type().is_symlink()).unwrap_or(false) {
        return false;
    }
    path.extension().map(|e| e == "md").unwrap_or(false)
}

fn parse_file_label(name: &str) -> (String, Option<String>, String, bool) {
    // Returns: (label, time, icon, is_morning)
    if name.starts_with("morning-briefing") {
        return ("Morning Briefing".to_string(), None, "🌅".to_string(), true);
    }

    // meeting-prep-HHMM-topic.md
    if let Some(rest) = name.strip_prefix("meeting-prep-") {
        let rest = rest.strip_suffix(".md").unwrap_or(rest);
        if rest.len() >= 4 {
            let time_part = &rest[..4];
            if time_part.chars().all(|c| c.is_ascii_digit()) {
                let hh = &time_part[..2];
                let mm = &time_part[2..];
                let time_str = format!("{}:{}", hh, mm);
                let topic = rest[4..].trim_start_matches('-');
                let label = topic
                    .split('-')
                    .map(|w| {
                        let mut c = w.chars();
                        match c.next() {
                            None => String::new(),
                            Some(f) => f.to_uppercase().to_string() + c.as_str(),
                        }
                    })
                    .collect::<Vec<_>>()
                    .join(" ");
                return (label, Some(time_str), "📝".to_string(), false);
            }
        }
    }

    // Generic .md file
    let label = name
        .strip_suffix(".md")
        .unwrap_or(name)
        .replace(&['-', '_'][..], " ");
    (label, None, "📄".to_string(), false)
}

fn count_unchecked(content: &str) -> usize {
    content
        .lines()
        .filter(|line| {
            let trimmed = line.trim();
            trimmed.starts_with("- [ ]") || trimmed.starts_with("* [ ]") || trimmed.starts_with("+ [ ]")
        })
        .count()
}

#[tauri::command]
pub fn scan_briefings(dir: String, max_days: usize) -> Result<Vec<DateEntry>, String> {
    let base = resolve_dir(&dir);
    if !base.is_dir() {
        return Err(format!("Briefings directory not found: {}", base.display()));
    }

    let today = today_key();
    let mut dates: Vec<String> = Vec::new();

    let entries = fs::read_dir(&base).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        if entry.path().is_dir() && is_date_folder(&name) {
            dates.push(name);
        }
    }

    dates.sort_by(|a, b| b.cmp(a));
    dates.truncate(max_days);

    let result: Vec<DateEntry> = dates
        .into_iter()
        .map(|key| {
            let date_dir = base.join(&key);
            let file_count = fs::read_dir(&date_dir)
                .map(|entries| {
                    entries
                        .filter_map(|e| e.ok())
                        .filter(|e| is_real_md_file(&e.path()))
                        .count()
                })
                .unwrap_or(0);
            let display = format_date_display(&key);
            let is_today = key == today;
            DateEntry {
                key,
                display,
                is_today,
                file_count,
            }
        })
        .collect();

    Ok(result)
}

fn is_date_folder(name: &str) -> bool {
    if name.len() != 10 {
        return false;
    }
    let parts: Vec<&str> = name.split('_').collect();
    parts.len() == 3
        && parts[0].len() == 4
        && parts[1].len() == 2
        && parts[2].len() == 2
        && parts.iter().all(|p| p.chars().all(|c| c.is_ascii_digit()))
}

#[tauri::command]
pub fn list_date_files(dir: String, date_key: String) -> Result<Vec<FileEntry>, String> {
    let date_dir = resolve_dir(&dir).join(&date_key);
    if !date_dir.is_dir() {
        return Err(format!("Date folder not found: {}", date_dir.display()));
    }

    let mut files: Vec<FileEntry> = Vec::new();
    let entries = fs::read_dir(&date_dir).map_err(|e| e.to_string())?;

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if !is_real_md_file(&path) {
            continue;
        }
        let filename = entry.file_name().to_string_lossy().to_string();
        let (label, time, icon, is_morning) = parse_file_label(&filename);

        let unchecked_count = fs::read_to_string(&path)
            .map(|content| count_unchecked(&content))
            .unwrap_or(0);

        files.push(FileEntry {
            filename,
            label,
            icon,
            time,
            is_morning,
            unchecked_count,
        });
    }

    // Sort: morning briefing first, then by time
    files.sort_by(|a, b| {
        if a.is_morning != b.is_morning {
            return if a.is_morning {
                std::cmp::Ordering::Less
            } else {
                std::cmp::Ordering::Greater
            };
        }
        a.time.cmp(&b.time)
    });

    Ok(files)
}

#[tauri::command]
pub fn read_briefing(dir: String, date_key: String, filename: String) -> Result<String, String> {
    let path = resolve_dir(&dir).join(&date_key).join(&filename);
    fs::read_to_string(&path).map_err(|e| format!("Failed to read {}: {}", filename, e))
}

#[tauri::command]
pub fn toggle_checkbox(
    dir: String,
    date_key: String,
    filename: String,
    index: usize,
    checked: bool,
) -> Result<(), String> {
    let path = resolve_dir(&dir).join(&date_key).join(&filename);
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let patched = patch_checkbox(&content, index, checked);
    fs::write(&path, patched).map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Debug, Serialize)]
pub struct TodayWidgets {
    pub focus: Option<String>,
    pub fun_fact: Option<String>,
    pub date_display: String,
}

#[tauri::command]
pub fn get_today_widgets(dir: String) -> Result<TodayWidgets, String> {
    let base = resolve_dir(&dir);
    let today = today_key();
    let date_display = format_date_display(&today);

    let date_dir = base.join(&today);
    if !date_dir.is_dir() {
        return Ok(TodayWidgets {
            focus: None,
            fun_fact: None,
            date_display,
        });
    }

    // Find the morning briefing file
    let morning = fs::read_dir(&date_dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .find(|e| {
            let name = e.file_name().to_string_lossy().to_string();
            name.starts_with("morning-briefing") && name.ends_with(".md") && is_real_md_file(&e.path())
        });

    let content = match morning {
        Some(entry) => fs::read_to_string(entry.path()).map_err(|e| e.to_string())?,
        None => {
            return Ok(TodayWidgets {
                focus: None,
                fun_fact: None,
                date_display,
            })
        }
    };

    let focus = extract_section(&content, "TODAY'S FOCUS");
    let fun_fact = extract_section(&content, "FUN FACT");

    Ok(TodayWidgets {
        focus,
        fun_fact,
        date_display,
    })
}

fn extract_section(content: &str, header_contains: &str) -> Option<String> {
    let lines: Vec<&str> = content.lines().collect();
    let header_idx = lines.iter().position(|line| {
        line.starts_with("## ") && line.to_uppercase().contains(header_contains)
    })?;

    // Collect lines until the next H2, HR, or end of file
    let mut section_lines: Vec<&str> = Vec::new();
    for line in &lines[header_idx + 1..] {
        if line.starts_with("## ") || line.starts_with("---") {
            break;
        }
        section_lines.push(line);
    }

    // Trim empty lines from start and end
    while section_lines.first().map(|l| l.trim().is_empty()).unwrap_or(false) {
        section_lines.remove(0);
    }
    while section_lines.last().map(|l| l.trim().is_empty()).unwrap_or(false) {
        section_lines.pop();
    }

    if section_lines.is_empty() {
        None
    } else {
        Some(section_lines.join("\n"))
    }
}

fn patch_checkbox(text: &str, target_idx: usize, checked: bool) -> String {
    let re = regex::Regex::new(r"(?m)^(\s*[-*+] \[)([x ])(])").unwrap();
    let mut count = 0;
    re.replace_all(text, |caps: &regex::Captures| {
        let hit = count == target_idx;
        count += 1;
        if hit {
            format!(
                "{}{}{}",
                &caps[1],
                if checked { "x" } else { " " },
                &caps[3]
            )
        } else {
            caps[0].to_string()
        }
    })
    .to_string()
}
