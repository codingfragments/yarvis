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
            commands::briefings::scan_briefings,
            commands::briefings::list_date_files,
            commands::briefings::read_briefing,
            commands::briefings::toggle_checkbox,
            commands::briefings::get_today_widgets,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Yarvis");
}
