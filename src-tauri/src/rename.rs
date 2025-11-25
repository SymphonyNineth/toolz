//! Batch renaming and file listing functionality.
//!
//! This module provides commands for batch renaming files and recursively
//! listing files in directories.
//!
//! This module supports both synchronous commands (for backward compatibility)
//! and streaming commands with progress updates via Tauri Channels.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tauri::ipc::Channel;
use walkdir::WalkDir;

// ==================== Progress Types ====================

/// Progress events for file listing operations.
///
/// These events are sent via Tauri Channel to provide real-time feedback
/// during recursive directory listing on large directories.
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type", rename_all = "camelCase", rename_all_fields = "camelCase")]
pub enum ListProgress {
    /// Listing has started
    Started {
        /// The base directory being listed
        base_path: String,
    },
    /// Currently scanning directories - sent periodically during traversal
    Scanning {
        /// Current directory being scanned
        current_dir: String,
        /// Number of files found so far
        files_found: usize,
    },
    /// Listing completed successfully
    Completed {
        /// Total number of files found
        total_files: usize,
    },
}

/// Progress events for batch rename operations.
///
/// These events are sent via Tauri Channel to provide real-time feedback
/// during batch file renaming.
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type", rename_all = "camelCase", rename_all_fields = "camelCase")]
pub enum RenameProgress {
    /// Renaming has started
    Started {
        /// Total number of files to rename
        total_files: usize,
    },
    /// Progress update during renaming
    Progress {
        /// Current file index (1-based)
        current: usize,
        /// Total number of files
        total: usize,
        /// Path of file just processed
        current_path: String,
    },
    /// Renaming completed
    Completed {
        /// Number of successfully renamed files
        successful: usize,
        /// Number of failed renames
        failed: usize,
    },
}

/// Renames multiple files in a single batch operation.
///
/// Takes a vector of tuples containing (old_path, new_path) pairs and attempts
/// to rename each file. Returns all successfully renamed files or an error
/// containing all failures.
///
/// # Arguments
///
/// * `files` - A vector of tuples where each tuple contains:
///   - `old_path`: The current path of the file
///   - `new_path`: The desired new path for the file
///
/// # Returns
///
/// * `Ok(Vec<String>)` - A vector of successfully renamed file paths (new paths)
/// * `Err(String)` - A newline-separated string of all errors that occurred
///
/// # Example
///
/// ```ignore
/// let files = vec![
///     ("/path/to/old1.txt".to_string(), "/path/to/new1.txt".to_string()),
///     ("/path/to/old2.txt".to_string(), "/path/to/new2.txt".to_string()),
/// ];
/// let result = batch_rename(files);
/// ```
#[tauri::command]
pub fn batch_rename(files: Vec<(String, String)>) -> Result<Vec<String>, String> {
    let mut renamed_files = Vec::new();
    let mut errors = Vec::new();

    for (old_path, new_path) in files {
        match fs::rename(&old_path, &new_path) {
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

/// Renames multiple files with progress streaming.
///
/// This is the streaming variant of `batch_rename` that sends progress updates
/// via a Tauri Channel. Use this for renaming many files to show progress.
///
/// This command runs asynchronously on a background thread, allowing the
/// main Tauri thread to remain responsive and deliver progress events
/// to the frontend in real-time.
///
/// # Arguments
///
/// * `files` - A vector of tuples where each tuple contains:
///   - `old_path`: The current path of the file
///   - `new_path`: The desired new path for the file
/// * `on_progress` - Channel to send progress events
///
/// # Returns
///
/// * `Ok(Vec<String>)` - A vector of successfully renamed file paths (new paths)
/// * `Err(String)` - A newline-separated string of all errors that occurred
#[tauri::command]
pub async fn batch_rename_with_progress(
    files: Vec<(String, String)>,
    on_progress: Channel<RenameProgress>,
) -> Result<Vec<String>, String> {
    // Run the heavy work in a blocking thread to keep the main thread responsive
    tokio::task::spawn_blocking(move || {
        let total = files.len();

        // Send started event
        let _ = on_progress.send(RenameProgress::Started { total_files: total });

        let mut renamed_files = Vec::new();
        let mut errors = Vec::new();

        for (index, (old_path, new_path)) in files.into_iter().enumerate() {
            match fs::rename(&old_path, &new_path) {
                Ok(_) => renamed_files.push(new_path.clone()),
                Err(e) => errors.push(format!("Failed to rename {}: {}", old_path, e)),
            }

            // Send progress update
            let _ = on_progress.send(RenameProgress::Progress {
                current: index + 1,
                total,
                current_path: new_path,
            });
        }

        // Send completed event
        let _ = on_progress.send(RenameProgress::Completed {
            successful: renamed_files.len(),
            failed: errors.len(),
        });

        if errors.is_empty() {
            Ok(renamed_files)
        } else {
            Err(errors.join("\n"))
        }
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

/// Lists all files recursively within a directory.
///
/// Traverses the given directory and all its subdirectories, collecting
/// the full paths of all files (excluding directories).
///
/// # Arguments
///
/// * `dir_path` - The path to the directory to scan
///
/// # Returns
///
/// * `Ok(Vec<String>)` - A vector of file paths found in the directory tree
/// * `Err(String)` - An error message if the path doesn't exist, isn't a directory,
///   or if there was an error reading the directory
///
/// # Errors
///
/// Returns an error if:
/// - The path does not exist
/// - The path is not a directory
/// - There was an I/O error while reading the directory
///
/// # Example
///
/// ```ignore
/// let files = list_files_recursively("/home/user/documents".to_string());
/// match files {
///     Ok(file_list) => println!("Found {} files", file_list.len()),
///     Err(e) => eprintln!("Error: {}", e),
/// }
/// ```
#[tauri::command]
pub fn list_files_recursively(dir_path: String) -> Result<Vec<String>, String> {
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

/// Lists all files recursively with progress streaming.
///
/// This is the streaming variant of `list_files_recursively` that sends
/// progress updates via a Tauri Channel. Use this for large directories
/// to prevent UI freezing.
///
/// This command runs asynchronously on a background thread, allowing the
/// main Tauri thread to remain responsive and deliver progress events
/// to the frontend in real-time.
///
/// # Arguments
///
/// * `dir_path` - The path to the directory to scan
/// * `on_progress` - Channel to send progress events
///
/// # Returns
///
/// * `Ok(Vec<String>)` - A vector of file paths found in the directory tree
/// * `Err(String)` - An error message if the path doesn't exist, isn't a directory,
///   or if there was an error reading the directory
#[tauri::command]
pub async fn list_files_with_progress(
    dir_path: String,
    on_progress: Channel<ListProgress>,
) -> Result<Vec<String>, String> {
    let path = Path::new(&dir_path);

    if !path.exists() {
        return Err(format!("Path does not exist: {}", dir_path));
    }

    if !path.is_dir() {
        return Err(format!("Path is not a directory: {}", dir_path));
    }

    let dir_path_clone = dir_path.clone();

    // Run the heavy work in a blocking thread to keep the main thread responsive
    tokio::task::spawn_blocking(move || {
        // Send started event
        let _ = on_progress.send(ListProgress::Started {
            base_path: dir_path_clone.clone(),
        });

        let mut files = Vec::new();
        let mut last_progress_dir = String::new();
        let progress_interval = 50; // Send progress every 50 files

        // Use WalkDir for efficient directory traversal
        for entry in WalkDir::new(&dir_path_clone)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.path().is_file())
        {
            if let Some(path_str) = entry.path().to_str() {
                files.push(path_str.to_string());

                // Send scanning progress periodically
                if files.len() % progress_interval == 0 {
                    if let Some(parent) = entry.path().parent() {
                        let current_dir = parent.to_string_lossy().to_string();
                        if current_dir != last_progress_dir {
                            last_progress_dir = current_dir.clone();
                            let _ = on_progress.send(ListProgress::Scanning {
                                current_dir,
                                files_found: files.len(),
                            });
                        }
                    }
                }
            }
        }

        // Send completed event
        let _ = on_progress.send(ListProgress::Completed {
            total_files: files.len(),
        });

        Ok(files)
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

/// Recursively collects file paths from a directory and its subdirectories.
///
/// This is a helper function that walks through a directory tree and appends
/// all file paths to the provided vector.
///
/// # Arguments
///
/// * `dir` - The directory path to start collecting from
/// * `files` - A mutable reference to a vector where file paths will be stored
///
/// # Returns
///
/// * `Ok(())` - If all files were collected successfully
/// * `Err(std::io::Error)` - If there was an I/O error reading any directory
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

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json;
    use std::fs::File;
    use std::io::Write;
    use tempfile::tempdir;

    // ==================== batch_rename tests ====================

    /// Tests successful batch renaming of multiple files.
    #[test]
    fn test_batch_rename_success() {
        // Create a temporary directory
        let temp_dir = tempdir().expect("Failed to create temp dir");

        // Create test files
        let file1_old = temp_dir.path().join("file1.txt");
        let file1_new = temp_dir.path().join("renamed1.txt");
        let file2_old = temp_dir.path().join("file2.txt");
        let file2_new = temp_dir.path().join("renamed2.txt");

        File::create(&file1_old)
            .unwrap()
            .write_all(b"content1")
            .unwrap();
        File::create(&file2_old)
            .unwrap()
            .write_all(b"content2")
            .unwrap();

        // Prepare rename pairs
        let files = vec![
            (
                file1_old.to_string_lossy().to_string(),
                file1_new.to_string_lossy().to_string(),
            ),
            (
                file2_old.to_string_lossy().to_string(),
                file2_new.to_string_lossy().to_string(),
            ),
        ];

        // Execute batch rename
        let result = batch_rename(files);

        // Verify success
        assert!(result.is_ok());
        let renamed = result.unwrap();
        assert_eq!(renamed.len(), 2);

        // Verify old files no longer exist
        assert!(!file1_old.exists());
        assert!(!file2_old.exists());

        // Verify new files exist
        assert!(file1_new.exists());
        assert!(file2_new.exists());
    }

    /// Tests batch rename with an empty file list.
    #[test]
    fn test_batch_rename_empty_list() {
        let result = batch_rename(vec![]);
        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }

    /// Tests batch rename when a file doesn't exist.
    #[test]
    fn test_batch_rename_nonexistent_file() {
        let files = vec![(
            "/nonexistent/path/file.txt".to_string(),
            "/nonexistent/path/renamed.txt".to_string(),
        )];

        let result = batch_rename(files);
        assert!(result.is_err());
        let error = result.unwrap_err();
        assert!(error.contains("Failed to rename"));
    }

    /// Tests batch rename with partial failures (some files succeed, some fail).
    #[test]
    fn test_batch_rename_partial_failure() {
        let temp_dir = tempdir().expect("Failed to create temp dir");

        // Create one real file
        let file_old = temp_dir.path().join("real_file.txt");
        let file_new = temp_dir.path().join("renamed_file.txt");
        File::create(&file_old)
            .unwrap()
            .write_all(b"content")
            .unwrap();

        // Mix real and nonexistent files
        let files = vec![
            (
                file_old.to_string_lossy().to_string(),
                file_new.to_string_lossy().to_string(),
            ),
            (
                "/nonexistent/file.txt".to_string(),
                "/nonexistent/renamed.txt".to_string(),
            ),
        ];

        let result = batch_rename(files);

        // Should return error because one file failed
        assert!(result.is_err());
        let error = result.unwrap_err();
        assert!(error.contains("Failed to rename"));

        // The real file should still have been renamed
        assert!(file_new.exists());
        assert!(!file_old.exists());
    }

    /// Tests renaming a file to a path that already exists.
    #[test]
    fn test_batch_rename_overwrites_existing() {
        let temp_dir = tempdir().expect("Failed to create temp dir");

        let source = temp_dir.path().join("source.txt");
        let target = temp_dir.path().join("target.txt");

        // Create both files with different content
        File::create(&source)
            .unwrap()
            .write_all(b"source content")
            .unwrap();
        File::create(&target)
            .unwrap()
            .write_all(b"target content")
            .unwrap();

        let files = vec![(
            source.to_string_lossy().to_string(),
            target.to_string_lossy().to_string(),
        )];

        let result = batch_rename(files);

        // On most systems, rename will overwrite the target
        assert!(result.is_ok());
        assert!(!source.exists());
        assert!(target.exists());

        // Verify content is from source
        let content = fs::read_to_string(&target).unwrap();
        assert_eq!(content, "source content");
    }

    // ==================== list_files_recursively tests ====================

    /// Tests listing files in a directory with nested subdirectories.
    #[test]
    fn test_list_files_recursively_nested() {
        let temp_dir = tempdir().expect("Failed to create temp dir");

        // Create directory structure:
        // temp_dir/
        //   file1.txt
        //   subdir1/
        //     file2.txt
        //     subdir2/
        //       file3.txt

        let subdir1 = temp_dir.path().join("subdir1");
        let subdir2 = subdir1.join("subdir2");

        fs::create_dir(&subdir1).unwrap();
        fs::create_dir(&subdir2).unwrap();

        File::create(temp_dir.path().join("file1.txt")).unwrap();
        File::create(subdir1.join("file2.txt")).unwrap();
        File::create(subdir2.join("file3.txt")).unwrap();

        let result = list_files_recursively(temp_dir.path().to_string_lossy().to_string());

        assert!(result.is_ok());
        let files = result.unwrap();
        assert_eq!(files.len(), 3);

        // Verify all files are included (order may vary)
        let files_set: std::collections::HashSet<_> = files.iter().collect();
        assert!(files_set.iter().any(|f| f.ends_with("file1.txt")));
        assert!(files_set.iter().any(|f| f.ends_with("file2.txt")));
        assert!(files_set.iter().any(|f| f.ends_with("file3.txt")));
    }

    /// Tests listing files in an empty directory.
    #[test]
    fn test_list_files_recursively_empty_dir() {
        let temp_dir = tempdir().expect("Failed to create temp dir");

        let result = list_files_recursively(temp_dir.path().to_string_lossy().to_string());

        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }

    /// Tests listing files when the path doesn't exist.
    #[test]
    fn test_list_files_recursively_nonexistent_path() {
        let result = list_files_recursively("/this/path/does/not/exist".to_string());

        assert!(result.is_err());
        let error = result.unwrap_err();
        assert!(error.contains("Path does not exist"));
    }

    /// Tests listing files when the path is a file, not a directory.
    #[test]
    fn test_list_files_recursively_file_not_dir() {
        let temp_dir = tempdir().expect("Failed to create temp dir");
        let file_path = temp_dir.path().join("not_a_dir.txt");
        File::create(&file_path).unwrap();

        let result = list_files_recursively(file_path.to_string_lossy().to_string());

        assert!(result.is_err());
        let error = result.unwrap_err();
        assert!(error.contains("Path is not a directory"));
    }

    /// Tests that directories are not included in the file list.
    #[test]
    fn test_list_files_recursively_excludes_directories() {
        let temp_dir = tempdir().expect("Failed to create temp dir");

        let subdir = temp_dir.path().join("subdir");
        fs::create_dir(&subdir).unwrap();

        // Only create one file
        File::create(temp_dir.path().join("file.txt")).unwrap();

        let result = list_files_recursively(temp_dir.path().to_string_lossy().to_string());

        assert!(result.is_ok());
        let files = result.unwrap();
        assert_eq!(files.len(), 1);
        assert!(files[0].ends_with("file.txt"));
    }

    // ==================== collect_files_recursive tests ====================

    /// Tests the helper function directly.
    #[test]
    fn test_collect_files_recursive_basic() {
        let temp_dir = tempdir().expect("Failed to create temp dir");

        File::create(temp_dir.path().join("test.txt")).unwrap();
        File::create(temp_dir.path().join("test2.txt")).unwrap();

        let mut files = Vec::new();
        let result = collect_files_recursive(temp_dir.path(), &mut files);

        assert!(result.is_ok());
        assert_eq!(files.len(), 2);
    }

    /// Tests collect_files_recursive with deeply nested structure.
    #[test]
    fn test_collect_files_recursive_deep_nesting() {
        let temp_dir = tempdir().expect("Failed to create temp dir");

        // Create deeply nested structure
        let mut current = temp_dir.path().to_path_buf();
        for i in 0..5 {
            current = current.join(format!("level{}", i));
            fs::create_dir(&current).unwrap();
            File::create(current.join(format!("file{}.txt", i))).unwrap();
        }

        let mut files = Vec::new();
        let result = collect_files_recursive(temp_dir.path(), &mut files);

        assert!(result.is_ok());
        assert_eq!(files.len(), 5);
    }

    /// Tests collect_files_recursive handles special characters in filenames.
    #[test]
    fn test_collect_files_recursive_special_characters() {
        let temp_dir = tempdir().expect("Failed to create temp dir");

        // Files with spaces and special characters
        File::create(temp_dir.path().join("file with spaces.txt")).unwrap();
        File::create(temp_dir.path().join("file-with-dashes.txt")).unwrap();
        File::create(temp_dir.path().join("file_with_underscores.txt")).unwrap();

        let mut files = Vec::new();
        let result = collect_files_recursive(temp_dir.path(), &mut files);

        assert!(result.is_ok());
        assert_eq!(files.len(), 3);
    }

    // ==================== Progress Types Serialization Tests ====================

    /// Tests ListProgress::Started serialization.
    #[test]
    fn test_list_progress_started_serialization() {
        let progress = ListProgress::Started {
            base_path: "/test/path".to_string(),
        };
        let json = serde_json::to_string(&progress).unwrap();
        assert!(json.contains("\"type\":\"started\""));
        assert!(json.contains("\"basePath\":\"/test/path\""));
    }

    /// Tests ListProgress::Scanning serialization.
    #[test]
    fn test_list_progress_scanning_serialization() {
        let progress = ListProgress::Scanning {
            current_dir: "/test/dir".to_string(),
            files_found: 42,
        };
        let json = serde_json::to_string(&progress).unwrap();
        assert!(json.contains("\"type\":\"scanning\""));
        assert!(json.contains("\"currentDir\":\"/test/dir\""));
        assert!(json.contains("\"filesFound\":42"));
    }

    /// Tests ListProgress::Completed serialization.
    #[test]
    fn test_list_progress_completed_serialization() {
        let progress = ListProgress::Completed { total_files: 100 };
        let json = serde_json::to_string(&progress).unwrap();
        assert!(json.contains("\"type\":\"completed\""));
        assert!(json.contains("\"totalFiles\":100"));
    }

    /// Tests RenameProgress::Started serialization.
    #[test]
    fn test_rename_progress_started_serialization() {
        let progress = RenameProgress::Started { total_files: 50 };
        let json = serde_json::to_string(&progress).unwrap();
        assert!(json.contains("\"type\":\"started\""));
        assert!(json.contains("\"totalFiles\":50"));
    }

    /// Tests RenameProgress::Progress serialization.
    #[test]
    fn test_rename_progress_progress_serialization() {
        let progress = RenameProgress::Progress {
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

    /// Tests RenameProgress::Completed serialization.
    #[test]
    fn test_rename_progress_completed_serialization() {
        let progress = RenameProgress::Completed {
            successful: 8,
            failed: 2,
        };
        let json = serde_json::to_string(&progress).unwrap();
        assert!(json.contains("\"type\":\"completed\""));
        assert!(json.contains("\"successful\":8"));
        assert!(json.contains("\"failed\":2"));
    }

    // ==================== Progress Types Round-Trip Tests ====================

    /// Tests ListProgress round-trip serialization/deserialization.
    #[test]
    fn test_list_progress_round_trip_started() {
        let original = ListProgress::Started {
            base_path: "/home/user/documents".to_string(),
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: ListProgress = serde_json::from_str(&json).unwrap();
        if let ListProgress::Started { base_path } = deserialized {
            assert_eq!(base_path, "/home/user/documents");
        } else {
            panic!("Expected Started variant");
        }
    }

    /// Tests ListProgress round-trip for Scanning variant.
    #[test]
    fn test_list_progress_round_trip_scanning() {
        let original = ListProgress::Scanning {
            current_dir: "/var/log".to_string(),
            files_found: 1500,
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: ListProgress = serde_json::from_str(&json).unwrap();
        if let ListProgress::Scanning {
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

    /// Tests ListProgress round-trip for Completed variant.
    #[test]
    fn test_list_progress_round_trip_completed() {
        let original = ListProgress::Completed { total_files: 5000 };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: ListProgress = serde_json::from_str(&json).unwrap();
        if let ListProgress::Completed { total_files } = deserialized {
            assert_eq!(total_files, 5000);
        } else {
            panic!("Expected Completed variant");
        }
    }

    /// Tests RenameProgress round-trip for all variants.
    #[test]
    fn test_rename_progress_round_trip() {
        // Started
        let started = RenameProgress::Started { total_files: 100 };
        let json = serde_json::to_string(&started).unwrap();
        let de: RenameProgress = serde_json::from_str(&json).unwrap();
        assert!(matches!(de, RenameProgress::Started { total_files: 100 }));

        // Progress
        let progress = RenameProgress::Progress {
            current: 50,
            total: 100,
            current_path: "/path/to/renamed.txt".to_string(),
        };
        let json = serde_json::to_string(&progress).unwrap();
        let de: RenameProgress = serde_json::from_str(&json).unwrap();
        if let RenameProgress::Progress {
            current,
            total,
            current_path,
        } = de
        {
            assert_eq!(current, 50);
            assert_eq!(total, 100);
            assert_eq!(current_path, "/path/to/renamed.txt");
        } else {
            panic!("Expected Progress variant");
        }

        // Completed
        let completed = RenameProgress::Completed {
            successful: 95,
            failed: 5,
        };
        let json = serde_json::to_string(&completed).unwrap();
        let de: RenameProgress = serde_json::from_str(&json).unwrap();
        if let RenameProgress::Completed { successful, failed } = de {
            assert_eq!(successful, 95);
            assert_eq!(failed, 5);
        } else {
            panic!("Expected Completed variant");
        }
    }

    // ==================== Progress Types Edge Case Tests ====================

    /// Tests ListProgress with empty path.
    #[test]
    fn test_list_progress_empty_path() {
        let progress = ListProgress::Started {
            base_path: "".to_string(),
        };
        let json = serde_json::to_string(&progress).unwrap();
        assert!(json.contains("\"basePath\":\"\""));
        let de: ListProgress = serde_json::from_str(&json).unwrap();
        if let ListProgress::Started { base_path } = de {
            assert_eq!(base_path, "");
        } else {
            panic!("Expected Started variant");
        }
    }

    /// Tests ListProgress with zero values.
    #[test]
    fn test_list_progress_zero_values() {
        let scanning = ListProgress::Scanning {
            current_dir: "/".to_string(),
            files_found: 0,
        };
        let json = serde_json::to_string(&scanning).unwrap();
        assert!(json.contains("\"filesFound\":0"));

        let completed = ListProgress::Completed { total_files: 0 };
        let json = serde_json::to_string(&completed).unwrap();
        assert!(json.contains("\"totalFiles\":0"));
    }

    /// Tests ListProgress with large values.
    #[test]
    fn test_list_progress_large_values() {
        let scanning = ListProgress::Scanning {
            current_dir: "/very/long/path".to_string(),
            files_found: usize::MAX,
        };
        let json = serde_json::to_string(&scanning).unwrap();
        let de: ListProgress = serde_json::from_str(&json).unwrap();
        if let ListProgress::Scanning { files_found, .. } = de {
            assert_eq!(files_found, usize::MAX);
        } else {
            panic!("Expected Scanning variant");
        }
    }

    /// Tests RenameProgress with zero values.
    #[test]
    fn test_rename_progress_zero_values() {
        let started = RenameProgress::Started { total_files: 0 };
        let json = serde_json::to_string(&started).unwrap();
        assert!(json.contains("\"totalFiles\":0"));

        let completed = RenameProgress::Completed {
            successful: 0,
            failed: 0,
        };
        let json = serde_json::to_string(&completed).unwrap();
        assert!(json.contains("\"successful\":0"));
        assert!(json.contains("\"failed\":0"));
    }

    /// Tests progress types with special characters in paths.
    #[test]
    fn test_list_progress_special_characters_in_path() {
        let progress = ListProgress::Started {
            base_path: "/path/with spaces/and-dashes/under_scores/and.dots".to_string(),
        };
        let json = serde_json::to_string(&progress).unwrap();
        let de: ListProgress = serde_json::from_str(&json).unwrap();
        if let ListProgress::Started { base_path } = de {
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
    fn test_list_progress_unicode_in_path() {
        let progress = ListProgress::Scanning {
            current_dir: "/домой/文档/ドキュメント".to_string(),
            files_found: 10,
        };
        let json = serde_json::to_string(&progress).unwrap();
        let de: ListProgress = serde_json::from_str(&json).unwrap();
        if let ListProgress::Scanning { current_dir, .. } = de {
            assert_eq!(current_dir, "/домой/文档/ドキュメント");
        } else {
            panic!("Expected Scanning variant");
        }
    }

    /// Tests RenameProgress with unicode in path.
    #[test]
    fn test_rename_progress_unicode_in_path() {
        let progress = RenameProgress::Progress {
            current: 1,
            total: 1,
            current_path: "/путь/к/файлу.txt".to_string(),
        };
        let json = serde_json::to_string(&progress).unwrap();
        let de: RenameProgress = serde_json::from_str(&json).unwrap();
        if let RenameProgress::Progress { current_path, .. } = de {
            assert_eq!(current_path, "/путь/к/файлу.txt");
        } else {
            panic!("Expected Progress variant");
        }
    }

    // ==================== Progress Types Clone and Debug Tests ====================

    /// Tests that ListProgress can be cloned.
    #[test]
    fn test_list_progress_clone() {
        let original = ListProgress::Scanning {
            current_dir: "/test".to_string(),
            files_found: 100,
        };
        let cloned = original.clone();
        if let (
            ListProgress::Scanning {
                current_dir: dir1,
                files_found: count1,
            },
            ListProgress::Scanning {
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

    /// Tests that RenameProgress can be cloned.
    #[test]
    fn test_rename_progress_clone() {
        let original = RenameProgress::Progress {
            current: 5,
            total: 10,
            current_path: "/test.txt".to_string(),
        };
        let cloned = original.clone();
        if let (
            RenameProgress::Progress {
                current: c1,
                total: t1,
                current_path: p1,
            },
            RenameProgress::Progress {
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

    /// Tests that ListProgress implements Debug.
    #[test]
    fn test_list_progress_debug() {
        let progress = ListProgress::Completed { total_files: 42 };
        let debug_str = format!("{:?}", progress);
        assert!(debug_str.contains("Completed"));
        assert!(debug_str.contains("42"));
    }

    /// Tests that RenameProgress implements Debug.
    #[test]
    fn test_rename_progress_debug() {
        let progress = RenameProgress::Started { total_files: 100 };
        let debug_str = format!("{:?}", progress);
        assert!(debug_str.contains("Started"));
        assert!(debug_str.contains("100"));
    }

    // ==================== Large Directory Listing Tests ====================

    /// Helper to create a large test directory for listing tests.
    fn setup_large_listing_directory() -> tempfile::TempDir {
        let dir = tempdir().expect("Failed to create temp dir");

        // Create many test files
        for i in 0..150 {
            let filename = format!("file{:04}.txt", i);
            File::create(dir.path().join(&filename)).unwrap();
        }

        // Create subdirectory with more files
        let subdir = dir.path().join("subdir");
        fs::create_dir(&subdir).unwrap();
        for i in 0..100 {
            let filename = format!("nested{:04}.txt", i);
            File::create(subdir.join(&filename)).unwrap();
        }

        // Create nested subdirectory
        let nested = subdir.join("deep");
        fs::create_dir(&nested).unwrap();
        for i in 0..50 {
            let filename = format!("deep{:04}.txt", i);
            File::create(nested.join(&filename)).unwrap();
        }

        dir
    }

    /// Tests that list_files_recursively finds all files in large directory.
    #[test]
    fn test_list_files_large_directory() {
        let dir = setup_large_listing_directory();
        let result = list_files_recursively(dir.path().to_string_lossy().to_string());

        assert!(result.is_ok());
        let files = result.unwrap();
        // 150 + 100 + 50 = 300 files
        assert_eq!(files.len(), 300);
    }

    /// Tests that all files returned are actual files (not directories).
    #[test]
    fn test_list_files_only_files_not_dirs() {
        let dir = setup_large_listing_directory();
        let result = list_files_recursively(dir.path().to_string_lossy().to_string());

        assert!(result.is_ok());
        let files = result.unwrap();
        for file_path in files {
            let path = std::path::Path::new(&file_path);
            assert!(path.is_file(), "Expected file but got: {}", file_path);
        }
    }

    /// Tests listing files with various file extensions.
    #[test]
    fn test_list_files_mixed_extensions() {
        let dir = tempdir().expect("Failed to create temp dir");

        // Create files with different extensions
        File::create(dir.path().join("file1.txt")).unwrap();
        File::create(dir.path().join("file2.log")).unwrap();
        File::create(dir.path().join("file3.json")).unwrap();
        File::create(dir.path().join("file4")).unwrap(); // No extension

        let result = list_files_recursively(dir.path().to_string_lossy().to_string());

        assert!(result.is_ok());
        let files = result.unwrap();
        assert_eq!(files.len(), 4);
    }

    // ==================== Batch Rename Consistency Tests ====================

    /// Tests batch rename with many files.
    #[test]
    fn test_batch_rename_many_files() {
        let dir = tempdir().expect("Failed to create temp dir");

        // Create 50 files
        let mut rename_pairs = Vec::new();
        for i in 0..50 {
            let old_name = format!("old_{:03}.txt", i);
            let new_name = format!("new_{:03}.txt", i);
            let old_path = dir.path().join(&old_name);
            let new_path = dir.path().join(&new_name);

            File::create(&old_path).unwrap();

            rename_pairs.push((
                old_path.to_string_lossy().to_string(),
                new_path.to_string_lossy().to_string(),
            ));
        }

        let result = batch_rename(rename_pairs);

        assert!(result.is_ok());
        let renamed = result.unwrap();
        assert_eq!(renamed.len(), 50);

        // Verify all new files exist
        for i in 0..50 {
            let new_name = format!("new_{:03}.txt", i);
            assert!(dir.path().join(&new_name).exists());
        }
    }

    /// Tests batch rename preserves file content.
    #[test]
    fn test_batch_rename_preserves_content() {
        let dir = tempdir().expect("Failed to create temp dir");

        let old_path = dir.path().join("original.txt");
        let new_path = dir.path().join("renamed.txt");

        let content = "This is test content that should be preserved!";
        let mut file = File::create(&old_path).unwrap();
        file.write_all(content.as_bytes()).unwrap();

        let result = batch_rename(vec![(
            old_path.to_string_lossy().to_string(),
            new_path.to_string_lossy().to_string(),
        )]);

        assert!(result.is_ok());

        // Verify content is preserved
        let read_content = fs::read_to_string(&new_path).unwrap();
        assert_eq!(read_content, content);
    }

    /// Tests batch rename with unicode filenames.
    #[test]
    fn test_batch_rename_unicode_filenames() {
        let dir = tempdir().expect("Failed to create temp dir");

        let old_path = dir.path().join("文件.txt");
        let new_path = dir.path().join("ファイル.txt");

        File::create(&old_path).unwrap();

        let result = batch_rename(vec![(
            old_path.to_string_lossy().to_string(),
            new_path.to_string_lossy().to_string(),
        )]);

        assert!(result.is_ok());
        assert!(new_path.exists());
        assert!(!old_path.exists());
    }
}

