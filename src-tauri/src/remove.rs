//! File removal and pattern matching functionality.
//!
//! This module provides commands for searching files by pattern and batch
//! deleting files with optional empty directory cleanup.

use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

// ==================== Types ====================

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

#[cfg(test)]
mod tests {
    use super::*;
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
}

