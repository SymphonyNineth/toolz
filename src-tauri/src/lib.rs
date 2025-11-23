// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn batch_rename(files: Vec<(String, String)>) -> Result<Vec<String>, String> {
    let mut renamed_files = Vec::new();
    let mut errors = Vec::new();

    for (old_path, new_path) in files {
        match std::fs::rename(&old_path, &new_path) {
            Ok(_) => renamed_files.push(new_path),
            Err(e) => errors.push(format!("Failed to rename {}: {}", old_path, e)),
        }
    }

    if errors.is_empty() {
        Ok(renamed_files)
    } else {
        Err(errors.join("\n"))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![greet, batch_rename])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
