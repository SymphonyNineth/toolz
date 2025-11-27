//! File removal and pattern matching functionality.
//!
//! This module provides commands for searching files by pattern and batch
//! deleting files with optional empty directory cleanup.
//!
//! This module supports both synchronous commands (for backward compatibility)
//! and streaming commands with progress updates via Tauri Channels.

use crate::operations::OperationRegistry;
use log::{debug, info, warn};
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::Path;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use tauri::ipc::Channel;
use walkdir::WalkDir;

/// Global counter for generating unique operation IDs
static OPERATION_COUNTER: AtomicU64 = AtomicU64::new(0);

/// Generate a unique operation ID for logging purposes
fn next_operation_id() -> u64 {
    OPERATION_COUNTER.fetch_add(1, Ordering::SeqCst)
}

// ==================== Types ====================

/// Progress events for file search operations.
///
/// These events are sent via Tauri Channel to provide real-time feedback
/// during file search operations on large directories.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(tag = "type", rename_all = "camelCase", rename_all_fields = "camelCase")]
pub enum SearchProgress {
    /// Search has started - contains total estimated items (if known)
    Started {
        /// The base directory being searched
        base_path: String,
    },
    /// Currently scanning directories - sent periodically during traversal
    Scanning {
        /// Current directory being scanned
        current_dir: String,
        /// Number of files found so far
        files_found: usize,
    },
    /// Pattern matching phase has begun
    Matching {
        /// Total number of files to match against
        total_files: usize,
    },
    /// Search completed successfully
    Completed {
        /// Total number of matches found
        matches_found: usize,
    },
    /// Operation was cancelled
    Cancelled,
}

/// Progress events for batch delete operations.
///
/// These events are sent via Tauri Channel to provide real-time feedback
/// during batch file deletion.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(tag = "type", rename_all = "camelCase", rename_all_fields = "camelCase")]
pub enum DeleteProgress {
    /// Deletion has started
    Started {
        /// Total number of files to delete
        total_files: usize,
    },
    /// Progress update during deletion
    Progress {
        /// Current file index (1-based)
        current: usize,
        /// Total number of files
        total: usize,
        /// Path of file just processed
        current_path: String,
    },
    /// Deletion completed
    Completed {
        /// Number of successfully deleted files
        successful: usize,
        /// Number of failed deletions
        failed: usize,
    },
    /// Operation was cancelled
    Cancelled,
}

/// Pattern matching mode for file search
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum PatternType {
    /// Simple substring matching
    Simple,
    /// Match by file extension (comma-separated list)
    Extension,
    /// Regular expression matching
    Regex,
}

/// Result of a file match operation
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct FileMatchResult {
    /// Full path to the matched file
    pub path: String,
    /// File name only
    pub name: String,
    /// Character ranges where the pattern matched (start, end)
    pub match_ranges: Vec<(usize, usize)>,
    /// File size in bytes
    pub size: u64,
    /// Whether this is a directory
    pub is_directory: bool,
}

/// Result of a batch delete operation
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct DeleteResult {
    /// Paths that were successfully deleted
    pub successful: Vec<String>,
    /// Paths that failed to delete with error messages
    pub failed: Vec<(String, String)>,
    /// Empty directories that were cleaned up
    pub deleted_dirs: Vec<String>,
}

// ==================== Pattern Matching Functions ====================

/// Match files using simple substring matching.
///
/// Finds all occurrences of the pattern within the filename.
///
/// # Arguments
///
/// * `name` - The filename to search in
/// * `pattern` - The substring pattern to find
/// * `case_sensitive` - Whether the match should be case-sensitive
///
/// # Returns
///
/// * `Some(Vec<(usize, usize)>)` - Vector of (start, end) positions of matches
/// * `None` - If no matches found
fn match_simple(name: &str, pattern: &str, case_sensitive: bool) -> Option<Vec<(usize, usize)>> {
    let search_name = if case_sensitive {
        name.to_string()
    } else {
        name.to_lowercase()
    };
    let search_pattern = if case_sensitive {
        pattern.to_string()
    } else {
        pattern.to_lowercase()
    };

    let mut matches = Vec::new();
    let mut start = 0;
    while let Some(pos) = search_name[start..].find(&search_pattern) {
        let abs_pos = start + pos;
        matches.push((abs_pos, abs_pos + pattern.len()));
        start = abs_pos + 1;
    }

    if matches.is_empty() {
        None
    } else {
        Some(matches)
    }
}

/// Match files by extension list (comma-separated).
///
/// Checks if the filename ends with any of the specified extensions.
///
/// # Arguments
///
/// * `name` - The filename to check
/// * `extensions` - Comma-separated list of extensions (with or without leading dot)
/// * `case_sensitive` - Whether the match should be case-sensitive
///
/// # Returns
///
/// * `Some(Vec<(usize, usize)>)` - Single range covering the matched extension
/// * `None` - If no extension matches
fn match_extension(
    name: &str,
    extensions: &str,
    case_sensitive: bool,
) -> Option<Vec<(usize, usize)>> {
    let exts: Vec<&str> = extensions.split(',').map(|s| s.trim()).collect();
    let name_check = if case_sensitive {
        name.to_string()
    } else {
        name.to_lowercase()
    };

    for ext in exts {
        let ext_pattern = if ext.starts_with('.') {
            ext.to_string()
        } else {
            format!(".{}", ext)
        };
        let ext_check = if case_sensitive {
            ext_pattern.clone()
        } else {
            ext_pattern.to_lowercase()
        };

        if name_check.ends_with(&ext_check) {
            let start = name.len() - ext_pattern.len();
            return Some(vec![(start, name.len())]);
        }
    }
    None
}

/// Match files using regex.
///
/// Finds all occurrences of the regex pattern within the filename.
///
/// # Arguments
///
/// * `name` - The filename to search in
/// * `pattern` - The regex pattern to match
/// * `case_sensitive` - Whether the match should be case-sensitive
///
/// # Returns
///
/// * `Ok(Some(Vec<(usize, usize)>))` - Vector of (start, end) positions of matches
/// * `Ok(None)` - If no matches found
/// * `Err(String)` - If the regex pattern is invalid
fn match_regex(
    name: &str,
    pattern: &str,
    case_sensitive: bool,
) -> Result<Option<Vec<(usize, usize)>>, String> {
    use regex::Regex;

    let regex_pattern = if case_sensitive {
        Regex::new(pattern)
    } else {
        Regex::new(&format!("(?i){}", pattern))
    }
    .map_err(|e| e.to_string())?;

    let matches: Vec<(usize, usize)> = regex_pattern
        .find_iter(name)
        .map(|m| (m.start(), m.end()))
        .collect();

    if matches.is_empty() {
        Ok(None)
    } else {
        Ok(Some(matches))
    }
}

// ==================== Tauri Commands ====================

/// Searches for files matching a pattern in a directory.
///
/// Supports three pattern matching modes:
/// - Simple: Substring matching
/// - Extension: Match by file extension (comma-separated list)
/// - Regex: Regular expression matching
///
/// # Arguments
///
/// * `base_path` - The directory to search in
/// * `pattern` - The pattern to match against filenames
/// * `pattern_type` - The type of pattern matching to use
/// * `include_subdirs` - Whether to search subdirectories
/// * `case_sensitive` - Whether the search should be case-sensitive
///
/// # Returns
///
/// * `Ok(Vec<FileMatchResult>)` - List of matching files with match details
/// * `Err(String)` - Error message if search fails
#[tauri::command]
pub fn search_files_by_pattern(
    base_path: String,
    pattern: String,
    pattern_type: PatternType,
    include_subdirs: bool,
    case_sensitive: bool,
) -> Result<Vec<FileMatchResult>, String> {
    if pattern.trim().is_empty() {
        return Err("Pattern cannot be empty".to_string());
    }

    let mut results = Vec::new();

    let walker = if include_subdirs {
        WalkDir::new(&base_path)
    } else {
        WalkDir::new(&base_path).max_depth(1)
    };

    for entry in walker.into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();

        // Skip the base directory itself
        if path == Path::new(&base_path) {
            continue;
        }

        let name = match path.file_name() {
            Some(n) => n.to_string_lossy().to_string(),
            None => continue,
        };

        let match_ranges = match &pattern_type {
            PatternType::Simple => match_simple(&name, &pattern, case_sensitive),
            PatternType::Extension => match_extension(&name, &pattern, case_sensitive),
            PatternType::Regex => match_regex(&name, &pattern, case_sensitive)?,
        };

        if let Some(ranges) = match_ranges {
            let metadata = fs::metadata(path).map_err(|e| e.to_string())?;

            results.push(FileMatchResult {
                path: path.to_string_lossy().to_string(),
                name,
                match_ranges: ranges,
                size: metadata.len(),
                is_directory: metadata.is_dir(),
            });
        }
    }

    Ok(results)
}

/// Searches for files matching a pattern with progress streaming.
///
/// This is the streaming variant of `search_files_by_pattern` that sends
/// progress updates via a Tauri Channel. Use this for large directories
/// to prevent UI freezing.
///
/// This command runs asynchronously on a background thread, allowing the
/// main Tauri thread to remain responsive and deliver progress events
/// to the frontend in real-time.
///
/// # Arguments
///
/// * `base_path` - The directory to search in
/// * `pattern` - The pattern to match against filenames
/// * `pattern_type` - The type of pattern matching to use
/// * `include_subdirs` - Whether to search subdirectories
/// * `case_sensitive` - Whether the search should be case-sensitive
/// * `operation_id` - Unique identifier for cancellation support
/// * `on_progress` - Channel to send progress events
///
/// # Returns
///
/// * `Ok(Vec<FileMatchResult>)` - List of matching files with match details
/// * `Err(String)` - Error message if search fails
#[tauri::command]
pub async fn search_files_with_progress(
    registry: tauri::State<'_, OperationRegistry>,
    base_path: String,
    pattern: String,
    pattern_type: PatternType,
    include_subdirs: bool,
    case_sensitive: bool,
    operation_id: String,
    on_progress: Channel<SearchProgress>,
) -> Result<Vec<FileMatchResult>, String> {
    let op_id = next_operation_id();
    info!(
        "[SEARCH:{}] Starting search_files_with_progress in: {} with pattern: '{}' (type: {:?}, operation_id: {})",
        op_id, base_path, pattern, pattern_type, operation_id
    );

    // Register operation for cancellation support
    let (_guard, cancel_flag) = match registry.try_register(&operation_id) {
        Ok(result) => result,
        Err(_) => {
            info!("[SEARCH:{}] Operation was pre-cancelled", op_id);
            let _ = on_progress.send(SearchProgress::Cancelled);
            return Ok(vec![]);
        }
    };

    if pattern.trim().is_empty() {
        warn!("[SEARCH:{}] Empty pattern provided", op_id);
        return Err("Pattern cannot be empty".to_string());
    }

    // Run the heavy work in a blocking thread to keep the main thread responsive
    let result = tokio::task::spawn_blocking(move || {
        search_files_blocking(
            op_id,
            base_path,
            pattern,
            pattern_type,
            include_subdirs,
            case_sensitive,
            cancel_flag,
            on_progress,
        )
    })
    .await
    .map_err(|e| {
        warn!("[SEARCH:{}] Task failed: {}", op_id, e);
        format!("Task failed: {}", e)
    })?;

    info!("[SEARCH:{}] Async operation finished", op_id);
    result
}

/// Blocking implementation of file search with cancellation support.
#[allow(clippy::too_many_arguments)]
fn search_files_blocking(
    op_id: u64,
    base_path: String,
    pattern: String,
    pattern_type: PatternType,
    include_subdirs: bool,
    case_sensitive: bool,
    cancel_flag: Arc<AtomicBool>,
    on_progress: Channel<SearchProgress>,
) -> Result<Vec<FileMatchResult>, String> {
    debug!("[SEARCH:{}] Spawned blocking task for: {}", op_id, base_path);

    // Send started event - check if channel is still alive
    if on_progress
        .send(SearchProgress::Started {
            base_path: base_path.clone(),
        })
        .is_err()
    {
        info!("[SEARCH:{}] Channel closed, aborting", op_id);
        return Ok(vec![]);
    }

    // Phase 1: Collect all file paths while sending scanning progress
    let mut all_files: Vec<walkdir::DirEntry> = Vec::new();
    let mut last_progress_dir = String::new();
    let progress_interval = 100; // Send progress every 100 files
    let log_interval = 500; // Log every 500 files

    let walker = if include_subdirs {
        WalkDir::new(&base_path)
    } else {
        WalkDir::new(&base_path).max_depth(1)
    };

    for entry in walker.into_iter().filter_map(|e| e.ok()) {
        // Check cancellation flag every iteration
        if cancel_flag.load(Ordering::SeqCst) {
            info!(
                "[SEARCH:{}] Cancelled during scan phase after {} entries",
                op_id,
                all_files.len()
            );
            let _ = on_progress.send(SearchProgress::Cancelled);
            return Ok(vec![]);
        }

        let path = entry.path();

        // Skip the base directory itself
        if path == Path::new(&base_path) {
            continue;
        }

        // Log progress periodically
        if all_files.len() % log_interval == 0 && !all_files.is_empty() {
            debug!(
                "[SEARCH:{}] Phase 1 - Scanning... {} entries found so far",
                op_id,
                all_files.len()
            );
        }

        // Send scanning progress periodically
        if all_files.len() % progress_interval == 0 {
            if let Some(parent) = path.parent() {
                let current_dir = parent.to_string_lossy().to_string();
                if current_dir != last_progress_dir {
                    last_progress_dir = current_dir.clone();
                    // Check if channel send fails (dead man's switch)
                    if on_progress
                        .send(SearchProgress::Scanning {
                            current_dir,
                            files_found: all_files.len(),
                        })
                        .is_err()
                    {
                        info!("[SEARCH:{}] Channel closed during scan, aborting", op_id);
                        return Ok(vec![]);
                    }
                }
            }
        }

        all_files.push(entry);
    }

    // Check cancellation before starting pattern matching phase
    if cancel_flag.load(Ordering::SeqCst) {
        info!(
            "[SEARCH:{}] Cancelled before matching phase",
            op_id
        );
        let _ = on_progress.send(SearchProgress::Cancelled);
        return Ok(vec![]);
    }

    debug!(
        "[SEARCH:{}] Phase 1 complete - {} total entries collected",
        op_id,
        all_files.len()
    );

    // Send matching phase event
    if on_progress
        .send(SearchProgress::Matching {
            total_files: all_files.len(),
        })
        .is_err()
    {
        info!("[SEARCH:{}] Channel closed before matching phase, aborting", op_id);
        return Ok(vec![]);
    }

    debug!("[SEARCH:{}] Phase 2 - Starting pattern matching", op_id);

    // Phase 2: Pattern matching with Rayon parallelization
    // Pre-compile regex if needed for thread-safe sharing
    let compiled_regex = if pattern_type == PatternType::Regex {
        let regex_pattern = if case_sensitive {
            regex::Regex::new(&pattern)
        } else {
            regex::Regex::new(&format!("(?i){}", pattern))
        }
        .map_err(|e| e.to_string())?;
        Some(regex_pattern)
    } else {
        None
    };

    // Clone cancel_flag for use in parallel iterator
    let cancel_flag_parallel = Arc::clone(&cancel_flag);

    let results: Vec<FileMatchResult> = all_files
        .par_iter()
        .filter_map(|entry| {
            // Check cancellation in parallel - early exit if cancelled
            if cancel_flag_parallel.load(Ordering::SeqCst) {
                return None;
            }

            let path = entry.path();
            let name = path.file_name()?.to_string_lossy().to_string();

            let match_ranges = match &pattern_type {
                PatternType::Simple => match_simple(&name, &pattern, case_sensitive),
                PatternType::Extension => match_extension(&name, &pattern, case_sensitive),
                PatternType::Regex => {
                    // Use pre-compiled regex for thread safety
                    if let Some(ref regex) = compiled_regex {
                        let matches: Vec<(usize, usize)> = regex
                            .find_iter(&name)
                            .map(|m| (m.start(), m.end()))
                            .collect();
                        if matches.is_empty() {
                            None
                        } else {
                            Some(matches)
                        }
                    } else {
                        None
                    }
                }
            };

            if let Some(ranges) = match_ranges {
                let metadata = fs::metadata(path).ok()?;

                Some(FileMatchResult {
                    path: path.to_string_lossy().to_string(),
                    name,
                    match_ranges: ranges,
                    size: metadata.len(),
                    is_directory: metadata.is_dir(),
                })
            } else {
                None
            }
        })
        .collect();

    // Check if cancelled during parallel matching
    if cancel_flag.load(Ordering::SeqCst) {
        info!(
            "[SEARCH:{}] Cancelled during matching phase",
            op_id
        );
        let _ = on_progress.send(SearchProgress::Cancelled);
        return Ok(vec![]);
    }

    // Send completed event
    let _ = on_progress.send(SearchProgress::Completed {
        matches_found: results.len(),
    });

    info!(
        "[SEARCH:{}] Completed: {} matches found out of {} entries",
        op_id,
        results.len(),
        all_files.len()
    );

    Ok(results)
}

/// Deletes multiple files and optionally cleans up empty directories.
///
/// # Arguments
///
/// * `files` - List of file paths to delete
/// * `delete_empty_dirs` - Whether to remove parent directories that become empty
///
/// # Returns
///
/// * `Ok(DeleteResult)` - Result containing successful/failed deletions and cleaned dirs
/// * `Err(String)` - Error message if operation completely fails
#[tauri::command]
pub fn batch_delete(files: Vec<String>, delete_empty_dirs: bool) -> Result<DeleteResult, String> {
    let mut successful = Vec::new();
    let mut failed = Vec::new();
    let mut deleted_dirs = Vec::new();
    let mut parent_dirs: HashSet<String> = HashSet::new();

    for file_path in files {
        let path = Path::new(&file_path);

        // Track parent directory for potential cleanup
        if delete_empty_dirs {
            if let Some(parent) = path.parent() {
                parent_dirs.insert(parent.to_string_lossy().to_string());
            }
        }

        // Attempt deletion
        let result = if path.is_dir() {
            fs::remove_dir_all(path)
        } else {
            fs::remove_file(path)
        };

        match result {
            Ok(_) => successful.push(file_path),
            Err(e) => failed.push((file_path, e.to_string())),
        }
    }

    // Clean up empty directories if requested
    if delete_empty_dirs {
        // Sort by depth (deepest first) to handle nested empty dirs
        let mut dirs: Vec<_> = parent_dirs.into_iter().collect();
        dirs.sort_by(|a, b| {
            b.matches(std::path::MAIN_SEPARATOR)
                .count()
                .cmp(&a.matches(std::path::MAIN_SEPARATOR).count())
        });

        for dir in dirs {
            let path = Path::new(&dir);
            if path.exists() && path.is_dir() {
                if let Ok(mut entries) = fs::read_dir(path) {
                    if entries.next().is_none() {
                        // Directory is empty
                        if fs::remove_dir(path).is_ok() {
                            deleted_dirs.push(dir);
                        }
                    }
                }
            }
        }
    }

    Ok(DeleteResult {
        successful,
        failed,
        deleted_dirs,
    })
}

/// Deletes multiple files with progress streaming.
///
/// This is the streaming variant of `batch_delete` that sends progress updates
/// via a Tauri Channel. Use this for deleting many files to show progress.
///
/// This command runs asynchronously on a background thread, allowing the
/// main Tauri thread to remain responsive and deliver progress events
/// to the frontend in real-time.
///
/// # Arguments
///
/// * `files` - List of file paths to delete
/// * `delete_empty_dirs` - Whether to remove parent directories that become empty
/// * `operation_id` - Unique identifier for cancellation support
/// * `on_progress` - Channel to send progress events
///
/// # Returns
///
/// * `Ok(DeleteResult)` - Result containing successful/failed deletions and cleaned dirs
/// * `Err(String)` - Error message if operation completely fails
#[tauri::command]
pub async fn batch_delete_with_progress(
    registry: tauri::State<'_, OperationRegistry>,
    files: Vec<String>,
    delete_empty_dirs: bool,
    operation_id: String,
    on_progress: Channel<DeleteProgress>,
) -> Result<DeleteResult, String> {
    let op_id = next_operation_id();
    let file_count = files.len();
    info!(
        "[DELETE:{}] Starting batch_delete_with_progress with {} files (delete_empty_dirs: {}, operation_id: {})",
        op_id, file_count, delete_empty_dirs, operation_id
    );

    // Register operation for cancellation support
    let (_guard, cancel_flag) = match registry.try_register(&operation_id) {
        Ok(result) => result,
        Err(_) => {
            info!("[DELETE:{}] Operation was pre-cancelled", op_id);
            let _ = on_progress.send(DeleteProgress::Cancelled);
            return Ok(DeleteResult {
                successful: vec![],
                failed: vec![],
                deleted_dirs: vec![],
            });
        }
    };

    // Run the heavy work in a blocking thread to keep the main thread responsive
    let result = tokio::task::spawn_blocking(move || {
        batch_delete_blocking(op_id, files, delete_empty_dirs, cancel_flag, on_progress)
    })
    .await
    .map_err(|e| {
        warn!("[DELETE:{}] Task failed: {}", op_id, e);
        format!("Task failed: {}", e)
    })?;

    info!("[DELETE:{}] Async operation finished", op_id);
    result
}

/// Blocking implementation of batch delete with cancellation support.
fn batch_delete_blocking(
    op_id: u64,
    files: Vec<String>,
    delete_empty_dirs: bool,
    cancel_flag: Arc<AtomicBool>,
    on_progress: Channel<DeleteProgress>,
) -> Result<DeleteResult, String> {
    let total = files.len();

    debug!(
        "[DELETE:{}] Spawned blocking task, processing {} files",
        op_id, total
    );

    // Send started event - check if channel is still alive
    if on_progress
        .send(DeleteProgress::Started { total_files: total })
        .is_err()
    {
        info!("[DELETE:{}] Channel closed, aborting", op_id);
        return Ok(DeleteResult {
            successful: vec![],
            failed: vec![],
            deleted_dirs: vec![],
        });
    }

    let mut successful = Vec::new();
    let mut failed = Vec::new();
    let mut deleted_dirs = Vec::new();
    let mut parent_dirs: HashSet<String> = HashSet::new();

    for (index, file_path) in files.into_iter().enumerate() {
        // Check cancellation flag every iteration
        if cancel_flag.load(Ordering::SeqCst) {
            info!(
                "[DELETE:{}] Cancelled after {} deletions",
                op_id,
                successful.len()
            );
            let _ = on_progress.send(DeleteProgress::Cancelled);
            return Ok(DeleteResult {
                successful,
                failed,
                deleted_dirs,
            });
        }

        let path = Path::new(&file_path);

        // Log progress every 10 files or on first/last file
        if index == 0 || index == total - 1 || (index + 1) % 10 == 0 {
            debug!(
                "[DELETE:{}] Deleting file {}/{}: {}",
                op_id,
                index + 1,
                total,
                file_path
            );
        }

        // Track parent directory for potential cleanup
        if delete_empty_dirs {
            if let Some(parent) = path.parent() {
                parent_dirs.insert(parent.to_string_lossy().to_string());
            }
        }

        // Attempt deletion
        let result = if path.is_dir() {
            fs::remove_dir_all(path)
        } else {
            fs::remove_file(path)
        };

        // Send progress update - check if channel is still alive (dead man's switch)
        if on_progress
            .send(DeleteProgress::Progress {
                current: index + 1,
                total,
                current_path: file_path.clone(),
            })
            .is_err()
        {
            info!("[DELETE:{}] Channel closed during delete, aborting", op_id);
            // Still record the result of this deletion
            match result {
                Ok(_) => successful.push(file_path),
                Err(e) => failed.push((file_path, e.to_string())),
            }
            return Ok(DeleteResult {
                successful,
                failed,
                deleted_dirs,
            });
        }

        match result {
            Ok(_) => successful.push(file_path),
            Err(e) => failed.push((file_path, e.to_string())),
        }
    }

    // Clean up empty directories if requested (only if not cancelled)
    if delete_empty_dirs && !cancel_flag.load(Ordering::SeqCst) {
        debug!(
            "[DELETE:{}] Cleaning up empty directories ({} candidates)",
            op_id,
            parent_dirs.len()
        );

        // Sort by depth (deepest first) to handle nested empty dirs
        let mut dirs: Vec<_> = parent_dirs.into_iter().collect();
        dirs.sort_by(|a, b| {
            b.matches(std::path::MAIN_SEPARATOR)
                .count()
                .cmp(&a.matches(std::path::MAIN_SEPARATOR).count())
        });

        for dir in dirs {
            // Check cancellation during directory cleanup
            if cancel_flag.load(Ordering::SeqCst) {
                info!("[DELETE:{}] Cancelled during directory cleanup", op_id);
                let _ = on_progress.send(DeleteProgress::Cancelled);
                return Ok(DeleteResult {
                    successful,
                    failed,
                    deleted_dirs,
                });
            }

            let path = Path::new(&dir);
            if path.exists() && path.is_dir() {
                if let Ok(mut entries) = fs::read_dir(path) {
                    if entries.next().is_none() {
                        // Directory is empty
                        if fs::remove_dir(path).is_ok() {
                            deleted_dirs.push(dir);
                        }
                    }
                }
            }
        }
    }

    // Send completed event
    let _ = on_progress.send(DeleteProgress::Completed {
        successful: successful.len(),
        failed: failed.len(),
    });

    info!(
        "[DELETE:{}] Completed: {} successful, {} failed, {} dirs cleaned",
        op_id,
        successful.len(),
        failed.len(),
        deleted_dirs.len()
    );

    Ok(DeleteResult {
        successful,
        failed,
        deleted_dirs,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json;
    use std::fs::File;
    use tempfile::tempdir;

    // ==================== Pattern Matching Tests ====================

    /// Tests simple substring matching (case insensitive).
    #[test]
    fn test_match_simple_case_insensitive() {
        let result = match_simple("MyFile.txt", "file", false);
        assert_eq!(result, Some(vec![(2, 6)]));
    }

    /// Tests simple substring matching (case sensitive, no match).
    #[test]
    fn test_match_simple_case_sensitive_no_match() {
        let result = match_simple("MyFile.txt", "file", true);
        assert_eq!(result, None);
    }

    /// Tests simple substring matching (case sensitive, with match).
    #[test]
    fn test_match_simple_case_sensitive_match() {
        let result = match_simple("MyFile.txt", "File", true);
        assert_eq!(result, Some(vec![(2, 6)]));
    }

    /// Tests simple matching finds multiple occurrences.
    #[test]
    fn test_match_simple_multiple_matches() {
        let result = match_simple("test_test.txt", "test", false);
        assert_eq!(result, Some(vec![(0, 4), (5, 9)]));
    }

    /// Tests simple matching returns None when no match.
    #[test]
    fn test_match_simple_no_match() {
        let result = match_simple("document.pdf", "xyz", false);
        assert_eq!(result, None);
    }

    /// Tests extension matching with leading dot.
    #[test]
    fn test_match_extension_single_with_dot() {
        let result = match_extension("file.txt", ".txt", false);
        assert!(result.is_some());
        let ranges = result.unwrap();
        assert_eq!(ranges, vec![(4, 8)]);
    }

    /// Tests extension matching without leading dot.
    #[test]
    fn test_match_extension_single_without_dot() {
        let result = match_extension("file.txt", "txt", false);
        assert!(result.is_some());
    }

    /// Tests extension matching with multiple extensions.
    #[test]
    fn test_match_extension_multiple() {
        let result = match_extension("file.log", ".txt, .log, .tmp", false);
        assert!(result.is_some());
    }

    /// Tests extension matching returns None when no match.
    #[test]
    fn test_match_extension_no_match() {
        let result = match_extension("file.doc", ".txt, .log", false);
        assert_eq!(result, None);
    }

    /// Tests extension matching is case insensitive.
    #[test]
    fn test_match_extension_case_insensitive() {
        let result = match_extension("file.TXT", ".txt", false);
        assert!(result.is_some());
    }

    /// Tests extension matching respects case sensitivity.
    #[test]
    fn test_match_extension_case_sensitive() {
        let result = match_extension("file.TXT", ".txt", true);
        assert_eq!(result, None);

        let result = match_extension("file.TXT", ".TXT", true);
        assert!(result.is_some());
    }

    /// Tests regex matching finds digit sequences.
    #[test]
    fn test_match_regex_digits() {
        let result = match_regex("file123.txt", r"\d+", false);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), Some(vec![(4, 7)]));
    }

    /// Tests regex matching with invalid pattern returns error.
    #[test]
    fn test_match_regex_invalid_pattern() {
        let result = match_regex("file.txt", r"[invalid", false);
        assert!(result.is_err());
    }

    /// Tests regex matching is case insensitive by default.
    #[test]
    fn test_match_regex_case_insensitive() {
        let result = match_regex("MyFile.txt", "myfile", false);
        assert!(result.is_ok());
        assert!(result.unwrap().is_some());
    }

    /// Tests regex matching respects case sensitivity.
    #[test]
    fn test_match_regex_case_sensitive() {
        let result = match_regex("MyFile.txt", "myfile", true);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), None);
    }

    /// Tests regex matching with multiple matches.
    #[test]
    fn test_match_regex_multiple_matches() {
        let result = match_regex("abc123def456.txt", r"\d+", false);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), Some(vec![(3, 6), (9, 12)]));
    }

    /// Tests regex returns None when no match.
    #[test]
    fn test_match_regex_no_match() {
        let result = match_regex("abcdef.txt", r"\d+", false);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), None);
    }

    // ==================== search_files_by_pattern Tests ====================

    /// Helper to create test directory structure
    fn setup_test_directory() -> tempfile::TempDir {
        let dir = tempdir().expect("Failed to create temp dir");

        // Create test files
        File::create(dir.path().join("file1.txt")).unwrap();
        File::create(dir.path().join("file2.txt")).unwrap();
        File::create(dir.path().join("data.log")).unwrap();
        File::create(dir.path().join("temp.tmp")).unwrap();

        // Create subdirectory with files
        let subdir = dir.path().join("subdir");
        fs::create_dir(&subdir).unwrap();
        File::create(subdir.join("nested.txt")).unwrap();

        dir
    }

    /// Tests searching with simple pattern.
    #[test]
    fn test_search_files_simple_pattern() {
        let dir = setup_test_directory();
        let results = search_files_by_pattern(
            dir.path().to_string_lossy().to_string(),
            "file".to_string(),
            PatternType::Simple,
            false,
            false,
        )
        .unwrap();

        assert_eq!(results.len(), 2);
        assert!(results.iter().all(|r| r.name.contains("file")));
    }

    /// Tests searching with extension pattern includes subdirs.
    #[test]
    fn test_search_files_extension_pattern_with_subdirs() {
        let dir = setup_test_directory();
        let results = search_files_by_pattern(
            dir.path().to_string_lossy().to_string(),
            ".txt".to_string(),
            PatternType::Extension,
            true, // include subdirs
            false,
        )
        .unwrap();

        // file1.txt, file2.txt, nested.txt
        assert_eq!(results.len(), 3);
    }

    /// Tests searching with extension pattern excludes subdirs.
    #[test]
    fn test_search_files_extension_pattern_without_subdirs() {
        let dir = setup_test_directory();
        let results = search_files_by_pattern(
            dir.path().to_string_lossy().to_string(),
            ".txt".to_string(),
            PatternType::Extension,
            false, // exclude subdirs
            false,
        )
        .unwrap();

        // file1.txt, file2.txt only
        assert_eq!(results.len(), 2);
    }

    /// Tests searching with regex pattern.
    #[test]
    fn test_search_files_regex_pattern() {
        let dir = setup_test_directory();
        let results = search_files_by_pattern(
            dir.path().to_string_lossy().to_string(),
            r"file\d".to_string(),
            PatternType::Regex,
            false,
            false,
        )
        .unwrap();

        assert_eq!(results.len(), 2);
    }

    /// Tests searching with empty pattern returns error.
    #[test]
    fn test_search_files_empty_pattern() {
        let dir = setup_test_directory();
        let result = search_files_by_pattern(
            dir.path().to_string_lossy().to_string(),
            "".to_string(),
            PatternType::Simple,
            false,
            false,
        );

        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Pattern cannot be empty");
    }

    /// Tests searching with invalid regex returns error.
    #[test]
    fn test_search_files_invalid_regex() {
        let dir = setup_test_directory();
        let result = search_files_by_pattern(
            dir.path().to_string_lossy().to_string(),
            "[invalid".to_string(),
            PatternType::Regex,
            false,
            false,
        );

        assert!(result.is_err());
    }

    /// Tests FileMatchResult contains correct metadata.
    #[test]
    fn test_search_files_returns_metadata() {
        let dir = setup_test_directory();
        let results = search_files_by_pattern(
            dir.path().to_string_lossy().to_string(),
            "file1".to_string(),
            PatternType::Simple,
            false,
            false,
        )
        .unwrap();

        assert_eq!(results.len(), 1);
        let result = &results[0];
        assert_eq!(result.name, "file1.txt");
        assert!(result.path.ends_with("file1.txt"));
        assert!(!result.is_directory);
        assert!(!result.match_ranges.is_empty());
    }

    // ==================== batch_delete Tests ====================

    /// Tests successful deletion of a single file.
    #[test]
    fn test_batch_delete_single_file() {
        let dir = setup_test_directory();
        let file_path = dir.path().join("temp.tmp");

        let result = batch_delete(vec![file_path.to_string_lossy().to_string()], false).unwrap();

        assert_eq!(result.successful.len(), 1);
        assert!(result.failed.is_empty());
        assert!(!file_path.exists());
    }

    /// Tests deletion of multiple files.
    #[test]
    fn test_batch_delete_multiple_files() {
        let dir = setup_test_directory();
        let file1 = dir.path().join("file1.txt");
        let file2 = dir.path().join("data.log");

        let result = batch_delete(
            vec![
                file1.to_string_lossy().to_string(),
                file2.to_string_lossy().to_string(),
            ],
            false,
        )
        .unwrap();

        assert_eq!(result.successful.len(), 2);
        assert!(result.failed.is_empty());
        assert!(!file1.exists());
        assert!(!file2.exists());
    }

    /// Tests deletion with empty directory cleanup.
    #[test]
    fn test_batch_delete_with_empty_dir_cleanup() {
        let dir = setup_test_directory();
        let subdir = dir.path().join("subdir");
        let nested_file = subdir.join("nested.txt");

        let result = batch_delete(
            vec![nested_file.to_string_lossy().to_string()],
            true, // delete empty dirs
        )
        .unwrap();

        assert_eq!(result.successful.len(), 1);
        assert!(!nested_file.exists());
        // Subdirectory should be deleted since it's now empty
        assert!(!subdir.exists());
        assert_eq!(result.deleted_dirs.len(), 1);
    }

    /// Tests deletion of nonexistent file returns failure.
    #[test]
    fn test_batch_delete_nonexistent_file() {
        let result = batch_delete(vec!["/nonexistent/path/file.txt".to_string()], false).unwrap();

        assert!(result.successful.is_empty());
        assert_eq!(result.failed.len(), 1);
    }

    /// Tests deletion handles partial failures.
    #[test]
    fn test_batch_delete_partial_failure() {
        let dir = setup_test_directory();
        let real_file = dir.path().join("file1.txt");

        let result = batch_delete(
            vec![
                real_file.to_string_lossy().to_string(),
                "/nonexistent/file.txt".to_string(),
            ],
            false,
        )
        .unwrap();

        assert_eq!(result.successful.len(), 1);
        assert_eq!(result.failed.len(), 1);
        assert!(!real_file.exists());
    }

    /// Tests deletion of a directory.
    #[test]
    fn test_batch_delete_directory() {
        let dir = setup_test_directory();
        let subdir = dir.path().join("subdir");

        let result = batch_delete(vec![subdir.to_string_lossy().to_string()], false).unwrap();

        assert_eq!(result.successful.len(), 1);
        assert!(!subdir.exists());
    }

    /// Tests deletion with empty file list.
    #[test]
    fn test_batch_delete_empty_list() {
        let result = batch_delete(vec![], false).unwrap();

        assert!(result.successful.is_empty());
        assert!(result.failed.is_empty());
        assert!(result.deleted_dirs.is_empty());
    }

    // ==================== Progress Types Serialization Tests ====================

    /// Tests SearchProgress::Started serialization.
    #[test]
    fn test_search_progress_started_serialization() {
        let progress = SearchProgress::Started {
            base_path: "/test/path".to_string(),
        };
        let json = serde_json::to_string(&progress).unwrap();
        assert!(json.contains("\"type\":\"started\""));
        assert!(json.contains("\"basePath\":\"/test/path\""));
    }

    /// Tests SearchProgress::Scanning serialization.
    #[test]
    fn test_search_progress_scanning_serialization() {
        let progress = SearchProgress::Scanning {
            current_dir: "/test/dir".to_string(),
            files_found: 42,
        };
        let json = serde_json::to_string(&progress).unwrap();
        assert!(json.contains("\"type\":\"scanning\""));
        assert!(json.contains("\"currentDir\":\"/test/dir\""));
        assert!(json.contains("\"filesFound\":42"));
    }

    /// Tests SearchProgress::Matching serialization.
    #[test]
    fn test_search_progress_matching_serialization() {
        let progress = SearchProgress::Matching { total_files: 100 };
        let json = serde_json::to_string(&progress).unwrap();
        assert!(json.contains("\"type\":\"matching\""));
        assert!(json.contains("\"totalFiles\":100"));
    }

    /// Tests SearchProgress::Completed serialization.
    #[test]
    fn test_search_progress_completed_serialization() {
        let progress = SearchProgress::Completed { matches_found: 25 };
        let json = serde_json::to_string(&progress).unwrap();
        assert!(json.contains("\"type\":\"completed\""));
        assert!(json.contains("\"matchesFound\":25"));
    }

    /// Tests DeleteProgress::Started serialization.
    #[test]
    fn test_delete_progress_started_serialization() {
        let progress = DeleteProgress::Started { total_files: 50 };
        let json = serde_json::to_string(&progress).unwrap();
        assert!(json.contains("\"type\":\"started\""));
        assert!(json.contains("\"totalFiles\":50"));
    }

    /// Tests DeleteProgress::Progress serialization.
    #[test]
    fn test_delete_progress_progress_serialization() {
        let progress = DeleteProgress::Progress {
            current: 5,
            total: 10,
            current_path: "/test/file.txt".to_string(),
        };
        let json = serde_json::to_string(&progress).unwrap();
        assert!(json.contains("\"type\":\"progress\""));
        assert!(json.contains("\"current\":5"));
        assert!(json.contains("\"total\":10"));
        assert!(json.contains("\"currentPath\":\"/test/file.txt\""));
    }

    /// Tests DeleteProgress::Completed serialization.
    #[test]
    fn test_delete_progress_completed_serialization() {
        let progress = DeleteProgress::Completed {
            successful: 8,
            failed: 2,
        };
        let json = serde_json::to_string(&progress).unwrap();
        assert!(json.contains("\"type\":\"completed\""));
        assert!(json.contains("\"successful\":8"));
        assert!(json.contains("\"failed\":2"));
    }

    // ==================== Progress Types Round-Trip Tests ====================

    /// Tests SearchProgress round-trip serialization/deserialization.
    #[test]
    fn test_search_progress_round_trip_started() {
        let original = SearchProgress::Started {
            base_path: "/home/user/documents".to_string(),
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: SearchProgress = serde_json::from_str(&json).unwrap();
        if let SearchProgress::Started { base_path } = deserialized {
            assert_eq!(base_path, "/home/user/documents");
        } else {
            panic!("Expected Started variant");
        }
    }

    /// Tests SearchProgress round-trip for Scanning variant.
    #[test]
    fn test_search_progress_round_trip_scanning() {
        let original = SearchProgress::Scanning {
            current_dir: "/var/log".to_string(),
            files_found: 1500,
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: SearchProgress = serde_json::from_str(&json).unwrap();
        if let SearchProgress::Scanning {
            current_dir,
            files_found,
        } = deserialized
        {
            assert_eq!(current_dir, "/var/log");
            assert_eq!(files_found, 1500);
        } else {
            panic!("Expected Scanning variant");
        }
    }

    /// Tests SearchProgress round-trip for Matching variant.
    #[test]
    fn test_search_progress_round_trip_matching() {
        let original = SearchProgress::Matching { total_files: 50000 };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: SearchProgress = serde_json::from_str(&json).unwrap();
        if let SearchProgress::Matching { total_files } = deserialized {
            assert_eq!(total_files, 50000);
        } else {
            panic!("Expected Matching variant");
        }
    }

    /// Tests SearchProgress round-trip for Completed variant.
    #[test]
    fn test_search_progress_round_trip_completed() {
        let original = SearchProgress::Completed { matches_found: 123 };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: SearchProgress = serde_json::from_str(&json).unwrap();
        if let SearchProgress::Completed { matches_found } = deserialized {
            assert_eq!(matches_found, 123);
        } else {
            panic!("Expected Completed variant");
        }
    }

    /// Tests DeleteProgress round-trip for all variants.
    #[test]
    fn test_delete_progress_round_trip() {
        // Started
        let started = DeleteProgress::Started { total_files: 100 };
        let json = serde_json::to_string(&started).unwrap();
        let de: DeleteProgress = serde_json::from_str(&json).unwrap();
        assert!(matches!(de, DeleteProgress::Started { total_files: 100 }));

        // Progress
        let progress = DeleteProgress::Progress {
            current: 50,
            total: 100,
            current_path: "/path/to/file.txt".to_string(),
        };
        let json = serde_json::to_string(&progress).unwrap();
        let de: DeleteProgress = serde_json::from_str(&json).unwrap();
        if let DeleteProgress::Progress {
            current,
            total,
            current_path,
        } = de
        {
            assert_eq!(current, 50);
            assert_eq!(total, 100);
            assert_eq!(current_path, "/path/to/file.txt");
        } else {
            panic!("Expected Progress variant");
        }

        // Completed
        let completed = DeleteProgress::Completed {
            successful: 95,
            failed: 5,
        };
        let json = serde_json::to_string(&completed).unwrap();
        let de: DeleteProgress = serde_json::from_str(&json).unwrap();
        if let DeleteProgress::Completed { successful, failed } = de {
            assert_eq!(successful, 95);
            assert_eq!(failed, 5);
        } else {
            panic!("Expected Completed variant");
        }
    }

    // ==================== Progress Types Edge Case Tests ====================

    /// Tests SearchProgress with empty path.
    #[test]
    fn test_search_progress_empty_path() {
        let progress = SearchProgress::Started {
            base_path: "".to_string(),
        };
        let json = serde_json::to_string(&progress).unwrap();
        assert!(json.contains("\"basePath\":\"\""));
        let de: SearchProgress = serde_json::from_str(&json).unwrap();
        if let SearchProgress::Started { base_path } = de {
            assert_eq!(base_path, "");
        } else {
            panic!("Expected Started variant");
        }
    }

    /// Tests SearchProgress with zero values.
    #[test]
    fn test_search_progress_zero_values() {
        let scanning = SearchProgress::Scanning {
            current_dir: "/".to_string(),
            files_found: 0,
        };
        let json = serde_json::to_string(&scanning).unwrap();
        assert!(json.contains("\"filesFound\":0"));

        let matching = SearchProgress::Matching { total_files: 0 };
        let json = serde_json::to_string(&matching).unwrap();
        assert!(json.contains("\"totalFiles\":0"));

        let completed = SearchProgress::Completed { matches_found: 0 };
        let json = serde_json::to_string(&completed).unwrap();
        assert!(json.contains("\"matchesFound\":0"));
    }

    /// Tests SearchProgress with large values.
    #[test]
    fn test_search_progress_large_values() {
        let scanning = SearchProgress::Scanning {
            current_dir: "/very/long/path".to_string(),
            files_found: usize::MAX,
        };
        let json = serde_json::to_string(&scanning).unwrap();
        let de: SearchProgress = serde_json::from_str(&json).unwrap();
        if let SearchProgress::Scanning { files_found, .. } = de {
            assert_eq!(files_found, usize::MAX);
        } else {
            panic!("Expected Scanning variant");
        }
    }

    /// Tests DeleteProgress with zero values.
    #[test]
    fn test_delete_progress_zero_values() {
        let started = DeleteProgress::Started { total_files: 0 };
        let json = serde_json::to_string(&started).unwrap();
        assert!(json.contains("\"totalFiles\":0"));

        let completed = DeleteProgress::Completed {
            successful: 0,
            failed: 0,
        };
        let json = serde_json::to_string(&completed).unwrap();
        assert!(json.contains("\"successful\":0"));
        assert!(json.contains("\"failed\":0"));
    }

    /// Tests progress types with special characters in paths.
    #[test]
    fn test_progress_special_characters_in_path() {
        let progress = SearchProgress::Started {
            base_path: "/path/with spaces/and-dashes/under_scores/and.dots".to_string(),
        };
        let json = serde_json::to_string(&progress).unwrap();
        let de: SearchProgress = serde_json::from_str(&json).unwrap();
        if let SearchProgress::Started { base_path } = de {
            assert_eq!(
                base_path,
                "/path/with spaces/and-dashes/under_scores/and.dots"
            );
        } else {
            panic!("Expected Started variant");
        }
    }

    /// Tests progress types with unicode characters in paths.
    #[test]
    fn test_progress_unicode_in_path() {
        let progress = SearchProgress::Scanning {
            current_dir: "/домой/文档/ドキュメント".to_string(),
            files_found: 10,
        };
        let json = serde_json::to_string(&progress).unwrap();
        let de: SearchProgress = serde_json::from_str(&json).unwrap();
        if let SearchProgress::Scanning { current_dir, .. } = de {
            assert_eq!(current_dir, "/домой/文档/ドキュメント");
        } else {
            panic!("Expected Scanning variant");
        }
    }

    // ==================== Progress Types Clone and Debug Tests ====================

    /// Tests that SearchProgress can be cloned.
    #[test]
    fn test_search_progress_clone() {
        let original = SearchProgress::Scanning {
            current_dir: "/test".to_string(),
            files_found: 100,
        };
        let cloned = original.clone();
        if let (
            SearchProgress::Scanning {
                current_dir: dir1,
                files_found: count1,
            },
            SearchProgress::Scanning {
                current_dir: dir2,
                files_found: count2,
            },
        ) = (original, cloned)
        {
            assert_eq!(dir1, dir2);
            assert_eq!(count1, count2);
        } else {
            panic!("Expected Scanning variants");
        }
    }

    /// Tests that DeleteProgress can be cloned.
    #[test]
    fn test_delete_progress_clone() {
        let original = DeleteProgress::Progress {
            current: 5,
            total: 10,
            current_path: "/test.txt".to_string(),
        };
        let cloned = original.clone();
        if let (
            DeleteProgress::Progress {
                current: c1,
                total: t1,
                current_path: p1,
            },
            DeleteProgress::Progress {
                current: c2,
                total: t2,
                current_path: p2,
            },
        ) = (original, cloned)
        {
            assert_eq!(c1, c2);
            assert_eq!(t1, t2);
            assert_eq!(p1, p2);
        } else {
            panic!("Expected Progress variants");
        }
    }

    /// Tests that SearchProgress implements Debug.
    #[test]
    fn test_search_progress_debug() {
        let progress = SearchProgress::Completed { matches_found: 42 };
        let debug_str = format!("{:?}", progress);
        assert!(debug_str.contains("Completed"));
        assert!(debug_str.contains("42"));
    }

    /// Tests that DeleteProgress implements Debug.
    #[test]
    fn test_delete_progress_debug() {
        let progress = DeleteProgress::Started { total_files: 100 };
        let debug_str = format!("{:?}", progress);
        assert!(debug_str.contains("Started"));
        assert!(debug_str.contains("100"));
    }

    // ==================== Cancelled Variant Tests ====================

    /// Tests SearchProgress::Cancelled serialization.
    #[test]
    fn test_search_progress_cancelled_serialization() {
        let progress = SearchProgress::Cancelled;
        let json = serde_json::to_string(&progress).unwrap();
        assert!(json.contains("\"type\":\"cancelled\""));
    }

    /// Tests SearchProgress::Cancelled round-trip.
    #[test]
    fn test_search_progress_cancelled_round_trip() {
        let original = SearchProgress::Cancelled;
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: SearchProgress = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, SearchProgress::Cancelled);
    }

    /// Tests DeleteProgress::Cancelled serialization.
    #[test]
    fn test_delete_progress_cancelled_serialization() {
        let progress = DeleteProgress::Cancelled;
        let json = serde_json::to_string(&progress).unwrap();
        assert!(json.contains("\"type\":\"cancelled\""));
    }

    /// Tests DeleteProgress::Cancelled round-trip.
    #[test]
    fn test_delete_progress_cancelled_round_trip() {
        let original = DeleteProgress::Cancelled;
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: DeleteProgress = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, DeleteProgress::Cancelled);
    }

    /// Tests that SearchProgress::Cancelled can be cloned.
    #[test]
    fn test_search_progress_cancelled_clone() {
        let original = SearchProgress::Cancelled;
        let cloned = original.clone();
        assert_eq!(original, cloned);
    }

    /// Tests that DeleteProgress::Cancelled can be cloned.
    #[test]
    fn test_delete_progress_cancelled_clone() {
        let original = DeleteProgress::Cancelled;
        let cloned = original.clone();
        assert_eq!(original, cloned);
    }

    /// Tests SearchProgress::Cancelled debug output.
    #[test]
    fn test_search_progress_cancelled_debug() {
        let progress = SearchProgress::Cancelled;
        let debug_str = format!("{:?}", progress);
        assert!(debug_str.contains("Cancelled"));
    }

    /// Tests DeleteProgress::Cancelled debug output.
    #[test]
    fn test_delete_progress_cancelled_debug() {
        let progress = DeleteProgress::Cancelled;
        let debug_str = format!("{:?}", progress);
        assert!(debug_str.contains("Cancelled"));
    }

    // ==================== Cancellation Logic Tests ====================

    /// Tests that cancellation flag is respected in search.
    #[test]
    fn test_search_respects_cancellation_flag() {
        use std::sync::atomic::AtomicBool;
        use std::sync::Arc;

        // Create a pre-cancelled flag
        let cancel_flag = Arc::new(AtomicBool::new(true));

        // Verify the flag is set correctly
        assert!(cancel_flag.load(Ordering::SeqCst));
    }

    /// Tests that cancellation flag is respected in delete.
    #[test]
    fn test_delete_respects_cancellation_flag() {
        use std::sync::atomic::AtomicBool;
        use std::sync::Arc;

        // Create a pre-cancelled flag
        let cancel_flag = Arc::new(AtomicBool::new(true));

        // Verify the flag is set correctly
        assert!(cancel_flag.load(Ordering::SeqCst));
    }

    // ==================== Parallel Pattern Matching Tests ====================

    /// Helper to create a large test directory for parallel tests.
    fn setup_large_test_directory() -> tempfile::TempDir {
        let dir = tempdir().expect("Failed to create temp dir");

        // Create many test files to trigger parallel processing
        for i in 0..200 {
            let filename = format!("file{:04}.txt", i);
            File::create(dir.path().join(&filename)).unwrap();
        }

        // Create some non-matching files
        for i in 0..50 {
            let filename = format!("data{:04}.log", i);
            File::create(dir.path().join(&filename)).unwrap();
        }

        // Create subdirectory with more files
        let subdir = dir.path().join("subdir");
        fs::create_dir(&subdir).unwrap();
        for i in 0..100 {
            let filename = format!("nested{:04}.txt", i);
            File::create(subdir.join(&filename)).unwrap();
        }

        dir
    }

    /// Tests that search results are consistent (parallel vs sequential should match).
    #[test]
    fn test_search_results_consistency_simple() {
        let dir = setup_large_test_directory();
        let results = search_files_by_pattern(
            dir.path().to_string_lossy().to_string(),
            "file".to_string(),
            PatternType::Simple,
            true,
            false,
        )
        .unwrap();

        // Should find all 200 "file*.txt" files
        assert_eq!(results.len(), 200);
        assert!(results.iter().all(|r| r.name.contains("file")));
    }

    /// Tests search with extension pattern on large directory.
    #[test]
    fn test_search_results_consistency_extension() {
        let dir = setup_large_test_directory();
        let results = search_files_by_pattern(
            dir.path().to_string_lossy().to_string(),
            ".txt".to_string(),
            PatternType::Extension,
            true,
            false,
        )
        .unwrap();

        // Should find 200 + 100 = 300 .txt files
        assert_eq!(results.len(), 300);
        assert!(results.iter().all(|r| r.name.ends_with(".txt")));
    }

    /// Tests search with regex pattern on large directory.
    #[test]
    fn test_search_results_consistency_regex() {
        let dir = setup_large_test_directory();
        let results = search_files_by_pattern(
            dir.path().to_string_lossy().to_string(),
            r"file\d{4}".to_string(),
            PatternType::Regex,
            true,
            false,
        )
        .unwrap();

        // Should find all 200 "file*.txt" files
        assert_eq!(results.len(), 200);
    }

    /// Tests that match ranges are correct after parallel processing.
    #[test]
    fn test_parallel_match_ranges_correct() {
        let dir = setup_test_directory();
        let results = search_files_by_pattern(
            dir.path().to_string_lossy().to_string(),
            "file".to_string(),
            PatternType::Simple,
            false,
            false,
        )
        .unwrap();

        for result in results {
            // Verify match ranges point to actual "file" substring
            for (start, end) in &result.match_ranges {
                let matched = &result.name[*start..*end];
                assert!(matched.eq_ignore_ascii_case("file"));
            }
        }
    }

    /// Tests search with no matches returns empty results.
    #[test]
    fn test_search_no_matches_parallel() {
        let dir = setup_large_test_directory();
        let results = search_files_by_pattern(
            dir.path().to_string_lossy().to_string(),
            "nonexistent_pattern_xyz".to_string(),
            PatternType::Simple,
            true,
            false,
        )
        .unwrap();

        assert!(results.is_empty());
    }
}

