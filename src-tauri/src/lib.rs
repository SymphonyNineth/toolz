//! # Simple Tools Library
//!
//! Backend library for the Simple Tools Tauri application.
//! Provides file system operations for batch renaming and directory listing.

use std::fs;
use std::path::Path;

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
        .invoke_handler(tauri::generate_handler![batch_rename, list_files_recursively])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
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
        assert!(files_set
            .iter()
            .any(|f| f.ends_with("file1.txt")));
        assert!(files_set
            .iter()
            .any(|f| f.ends_with("file2.txt")));
        assert!(files_set
            .iter()
            .any(|f| f.ends_with("file3.txt")));
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
}
