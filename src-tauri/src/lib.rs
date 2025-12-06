//! # Simple Tools Library
//!
//! Backend library for the Simple Tools Tauri application.
//! Provides file system operations for batch renaming, directory listing, and file removal.

mod diff;
mod file_state;
mod operations;
mod remove;
mod rename;

// Re-export types for external use
pub use diff::{
    compute_diff, get_regex_highlights, has_capture_groups, DiffSegment, DiffSegmentType,
    RegexSegment,
};
pub use file_state::FileState;
pub use operations::{CancelledError, OperationRegistry};
pub use remove::{DeleteProgress, DeleteResult, FileMatchResult, PatternType, SearchProgress};
pub use rename::{ListProgress, RenameProgress};

/// Cancels an in-progress operation by its ID.
///
/// If the operation is active, sets its cancellation flag to true.
/// If the operation doesn't exist yet, creates a tombstone to prevent future registration.
///
/// This command is idempotent - calling it multiple times is safe.
#[tauri::command]
fn cancel_operation(registry: tauri::State<'_, OperationRegistry>, operation_id: String) {
    log::debug!("Cancelling operation: {}", operation_id);
    registry.cancel(&operation_id);
}

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
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Stdout,
                ))
                .level(log::LevelFilter::Debug)
                .build(),
        )
        .manage(OperationRegistry::new())
        .manage(FileState::new())
        .invoke_handler(tauri::generate_handler![
            cancel_operation,
            rename::batch_rename,
            rename::batch_rename_with_progress,
            rename::list_files_recursively,
            rename::list_files_with_progress,
            rename::compute_previews,
            remove::search_files_by_pattern,
            remove::search_files_with_progress,
            remove::batch_delete,
            remove::batch_delete_with_progress,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
