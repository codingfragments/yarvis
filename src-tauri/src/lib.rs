mod commands;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::settings::get_settings,
            commands::settings::save_settings,
            commands::settings::get_default_settings,
            commands::system::get_system_info,
            commands::system::get_python_version,
            commands::system::get_sqlite_version,
            commands::system::get_data_dir_size,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Yarvis");
}
