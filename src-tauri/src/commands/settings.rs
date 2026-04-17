use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

fn data_dir() -> PathBuf {
    dirs::home_dir()
        .expect("Could not find home directory")
        .join(".yarvis")
}

fn settings_path() -> PathBuf {
    data_dir().join("settings.json")
}

fn ensure_data_dir() {
    let dir = data_dir();
    if !dir.exists() {
        fs::create_dir_all(&dir).expect("Failed to create ~/.yarvis directory");
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub theme: String,
    pub accent_color: String,
    pub data_directory: String,
    pub pixel_font_headings: bool,
    pub window_opacity: f64,
    pub launch_at_startup: bool,
    pub python_path: String,
    pub briefings_dir: String,
    pub briefings_max_days: u32,
    pub learning_dir: String,
}

impl Default for Settings {
    fn default() -> Self {
        let python_path = which_python().unwrap_or_else(|| "python3".to_string());
        Self {
            theme: "dark".to_string(),
            accent_color: "mauve".to_string(),
            data_directory: data_dir().to_string_lossy().to_string(),
            pixel_font_headings: true,
            window_opacity: 0.95,
            launch_at_startup: false,
            python_path,
            briefings_dir: dirs::home_dir()
                .map(|h| h.join("claude-chats/briefings").to_string_lossy().to_string())
                .unwrap_or_default(),
            briefings_max_days: 5,
            learning_dir: dirs::home_dir()
                .map(|h| h.join("claude-chats/learning").to_string_lossy().to_string())
                .unwrap_or_default(),
        }
    }
}

fn which_python() -> Option<String> {
    for cmd in &["python3", "python"] {
        if let Ok(output) = std::process::Command::new("which").arg(cmd).output() {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !path.is_empty() {
                    return Some(path);
                }
            }
        }
    }
    None
}

#[tauri::command]
pub fn get_default_settings() -> Settings {
    Settings::default()
}

#[tauri::command]
pub fn get_settings() -> Result<Settings, String> {
    ensure_data_dir();
    let path = settings_path();

    if !path.exists() {
        let defaults = Settings::default();
        let json = serde_json::to_string_pretty(&defaults).map_err(|e| e.to_string())?;
        fs::write(&path, json).map_err(|e| e.to_string())?;
        return Ok(defaults);
    }

    let contents = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let settings: Settings = serde_json::from_str(&contents).map_err(|e| e.to_string())?;
    Ok(settings)
}

#[tauri::command]
pub fn save_settings(settings: Settings) -> Result<(), String> {
    ensure_data_dir();
    let json = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(settings_path(), json).map_err(|e| e.to_string())?;
    Ok(())
}
