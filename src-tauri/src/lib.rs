// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::fs;
use std::path::Path;

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

#[tauri::command]
fn list_files_recursively(dir_path: String) -> Result<Vec<String>, String> {
    let path = Path::new(&dir_path);
    
    if !path.exists() {
        return Err(format!("Path does not exist: {}", dir_path));
    }
    
    if !path.is_dir() {
        return Err(format!("Path is not a directory: {}", dir_path));
    }
    
    let mut files = Vec::new();
    
    match collect_files_recursive(path, &mut files) {
        Ok(_) => Ok(files),
        Err(e) => Err(format!("Error reading directory: {}", e)),
    }
}

fn collect_files_recursive(dir: &Path, files: &mut Vec<String>) -> std::io::Result<()> {
    if dir.is_dir() {
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            
            if path.is_dir() {
                // Recursively collect files from subdirectories
                collect_files_recursive(&path, files)?;
            } else if path.is_file() {
                // Add file path as string
                if let Some(path_str) = path.to_str() {
                    files.push(path_str.to_string());
                }
            }
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![batch_rename, list_files_recursively])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
