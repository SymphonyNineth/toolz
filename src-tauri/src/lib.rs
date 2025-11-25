//! # Simple Tools Library
//!
//! Backend library for the Simple Tools Tauri application.
//! Provides file system operations for batch renaming, directory listing, and file removal.

mod remove;
mod rename;

// Re-export types for external use
pub use remove::{DeleteResult, FileMatchResult, PatternType};

/// Initializes and runs the Tauri application.
///
/// Sets up the Tauri builder with required plugins and command handlers,
/// then starts the application event loop.
///
/// # Panics
///
/// Panics if the Tauri application fails to start.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            rename::batch_rename,
            rename::list_files_recursively,
            remove::search_files_by_pattern,
            remove::batch_delete,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
