use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use std::process::Command;

fn data_dir() -> PathBuf {
    dirs::home_dir()
        .expect("Could not find home directory")
        .join(".yarvis")
}

#[derive(Debug, Serialize)]
pub struct SystemInfo {
    pub app_version: String,
    pub os: String,
    pub arch: String,
    pub rust_version: String,
}

#[tauri::command]
pub fn get_system_info() -> SystemInfo {
    SystemInfo {
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        rust_version: rustc_version(),
    }
}

fn rustc_version() -> String {
    Command::new("rustc")
        .arg("--version")
        .output()
        .ok()
        .and_then(|o| {
            if o.status.success() {
                Some(String::from_utf8_lossy(&o.stdout).trim().to_string())
            } else {
                None
            }
        })
        .unwrap_or_else(|| "unknown".to_string())
}

#[tauri::command]
pub fn get_python_version(python_path: String) -> Result<String, String> {
    let output = Command::new(&python_path)
        .arg("--version")
        .output()
        .map_err(|e| format!("Failed to execute {}: {}", python_path, e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(format!("Python returned error: {}", stderr))
    }
}

#[tauri::command]
pub fn get_sqlite_version() -> String {
    rusqlite::version().to_string()
}

#[tauri::command]
pub fn get_data_dir_size() -> Result<String, String> {
    let dir = data_dir();
    if !dir.exists() {
        return Ok("0 B".to_string());
    }
    let size = dir_size(&dir).map_err(|e| e.to_string())?;
    Ok(format_bytes(size))
}

fn dir_size(path: &PathBuf) -> Result<u64, std::io::Error> {
    let mut total = 0;
    if path.is_dir() {
        for entry in fs::read_dir(path)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() {
                total += dir_size(&path)?;
            } else {
                total += entry.metadata()?.len();
            }
        }
    }
    Ok(total)
}

fn format_bytes(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;

    if bytes >= GB {
        format!("{:.1} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.1} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.1} KB", bytes as f64 / KB as f64)
    } else {
        format!("{} B", bytes)
    }
}
