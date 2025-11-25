//! # Simple Tools Library
//!
//! Backend library for the Simple Tools Tauri application.
//! Provides file system operations for batch renaming, directory listing, and file removal.

mod remove;
mod rename;

// Re-export types for external use
pub use remove::{DeleteProgress, DeleteResult, FileMatchResult, PatternType, SearchProgress};
pub use rename::{ListProgress, RenameProgress};

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
            rename::batch_rename_with_progress,
            rename::list_files_recursively,
            rename::list_files_with_progress,
            remove::search_files_by_pattern,
            remove::search_files_with_progress,
            remove::batch_delete,
            remove::batch_delete_with_progress,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
