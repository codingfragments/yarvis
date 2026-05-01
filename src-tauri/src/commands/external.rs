use std::process::Command;

#[tauri::command]
pub fn open_things_url(url: String) -> Result<(), String> {
    if !url.starts_with("things:") {
        return Err(format!("expected things: URL, got {url}"));
    }
    eprintln!("[things] open_things_url: {url}");
    Command::new("open")
        .arg(&url)
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}
