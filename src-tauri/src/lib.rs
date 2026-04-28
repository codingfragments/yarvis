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
            commands::dashboard::read_daily,
            commands::dashboard::read_config,
            commands::dashboard::read_memory,
            commands::dashboard::read_prep,
            commands::dashboard::daily_status,
            commands::dashboard::read_questions,
            commands::dashboard::answer_question,
            commands::learning::scan_learning_courses,
            commands::learning::get_learning_course,
            commands::learning::get_learning_progress,
            commands::learning::save_learning_progress,
            commands::learning::reset_learning_progress,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Yarvis");
}
