# File Remover - Phase 1: Backend Setup

This phase covers the Rust backend implementation for the file removal tool.

## Goals
- Implement pattern matching logic for three modes
- Create Tauri commands for file search and deletion
- Add comprehensive test coverage for all backend functionality

## File Structure

The backend is organized into separate modules for better maintainability:

```
src-tauri/src/
├── lib.rs      # Entry point - module imports, re-exports, run()
├── rename.rs   # Renaming module - batch_rename, list_files_recursively
└── remove.rs   # Removal module - types, pattern matching, commands
```

## Tasks

### 1. Create `src-tauri/src/remove.rs` Module

Create a new file with the following types and implementations:

```rust
//! File removal and pattern matching functionality.

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
```

### 2. Implement Pattern Matching Functions

Add to `src-tauri/src/remove.rs`:

```rust
/// Match files using simple substring matching
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

/// Match files by extension list (comma-separated)
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

/// Match files using regex
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
```

### 3. Implement `search_files_by_pattern` Command

Add to `src-tauri/src/remove.rs`:

```rust
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
```

### 4. Implement `batch_delete` Command

Add to `src-tauri/src/remove.rs`:

```rust
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
```

### 5. Update `lib.rs` Entry Point

Update `src-tauri/src/lib.rs` to import and register the module:

```rust
//! # Simple Tools Library
//!
//! Backend library for the Simple Tools Tauri application.
//! Provides file system operations for batch renaming, directory listing, and file removal.

mod remove;
mod rename;

// Re-export types for external use
pub use remove::{DeleteResult, FileMatchResult, PatternType};

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
```

### 6. Add Dependencies

Add to `src-tauri/Cargo.toml`:

```toml
[dependencies]
regex = "1"
walkdir = "2"
```

## Testing Requirements

All tests are included in the `remove.rs` module using Rust's built-in test framework.

### Unit Tests for Pattern Matching

Add to `src-tauri/src/remove.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use tempfile::tempdir;

    // ==================== Pattern Matching Tests ====================

    #[test]
    fn test_match_simple_case_insensitive() {
        let result = match_simple("MyFile.txt", "file", false);
        assert_eq!(result, Some(vec![(2, 6)]));
    }

    #[test]
    fn test_match_simple_case_sensitive_no_match() {
        let result = match_simple("MyFile.txt", "file", true);
        assert_eq!(result, None);
    }

    #[test]
    fn test_match_simple_case_sensitive_match() {
        let result = match_simple("MyFile.txt", "File", true);
        assert_eq!(result, Some(vec![(2, 6)]));
    }

    #[test]
    fn test_match_simple_multiple_matches() {
        let result = match_simple("test_test.txt", "test", false);
        assert_eq!(result, Some(vec![(0, 4), (5, 9)]));
    }

    #[test]
    fn test_match_simple_no_match() {
        let result = match_simple("document.pdf", "xyz", false);
        assert_eq!(result, None);
    }

    #[test]
    fn test_match_extension_single_with_dot() {
        let result = match_extension("file.txt", ".txt", false);
        assert!(result.is_some());
        assert_eq!(result.unwrap(), vec![(4, 8)]);
    }

    #[test]
    fn test_match_extension_single_without_dot() {
        let result = match_extension("file.txt", "txt", false);
        assert!(result.is_some());
    }

    #[test]
    fn test_match_extension_multiple() {
        let result = match_extension("file.log", ".txt, .log, .tmp", false);
        assert!(result.is_some());
    }

    #[test]
    fn test_match_extension_no_match() {
        let result = match_extension("file.doc", ".txt, .log", false);
        assert_eq!(result, None);
    }

    #[test]
    fn test_match_extension_case_insensitive() {
        let result = match_extension("file.TXT", ".txt", false);
        assert!(result.is_some());
    }

    #[test]
    fn test_match_extension_case_sensitive() {
        let result = match_extension("file.TXT", ".txt", true);
        assert_eq!(result, None);

        let result = match_extension("file.TXT", ".TXT", true);
        assert!(result.is_some());
    }

    #[test]
    fn test_match_regex_digits() {
        let result = match_regex("file123.txt", r"\d+", false);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), Some(vec![(4, 7)]));
    }

    #[test]
    fn test_match_regex_invalid_pattern() {
        let result = match_regex("file.txt", r"[invalid", false);
        assert!(result.is_err());
    }

    #[test]
    fn test_match_regex_case_insensitive() {
        let result = match_regex("MyFile.txt", "myfile", false);
        assert!(result.is_ok());
        assert!(result.unwrap().is_some());
    }

    #[test]
    fn test_match_regex_case_sensitive() {
        let result = match_regex("MyFile.txt", "myfile", true);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), None);
    }

    #[test]
    fn test_match_regex_multiple_matches() {
        let result = match_regex("abc123def456.txt", r"\d+", false);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), Some(vec![(3, 6), (9, 12)]));
    }

    #[test]
    fn test_match_regex_no_match() {
        let result = match_regex("abcdef.txt", r"\d+", false);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), None);
    }

    // ==================== Command Integration Tests ====================

    fn setup_test_directory() -> tempfile::TempDir {
        let dir = tempdir().expect("Failed to create temp dir");

        File::create(dir.path().join("file1.txt")).unwrap();
        File::create(dir.path().join("file2.txt")).unwrap();
        File::create(dir.path().join("data.log")).unwrap();
        File::create(dir.path().join("temp.tmp")).unwrap();

        let subdir = dir.path().join("subdir");
        fs::create_dir(&subdir).unwrap();
        File::create(subdir.join("nested.txt")).unwrap();

        dir
    }

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

    #[test]
    fn test_search_files_extension_pattern_with_subdirs() {
        let dir = setup_test_directory();
        let results = search_files_by_pattern(
            dir.path().to_string_lossy().to_string(),
            ".txt".to_string(),
            PatternType::Extension,
            true,
            false,
        )
        .unwrap();

        assert_eq!(results.len(), 3); // file1.txt, file2.txt, nested.txt
    }

    #[test]
    fn test_search_files_extension_pattern_without_subdirs() {
        let dir = setup_test_directory();
        let results = search_files_by_pattern(
            dir.path().to_string_lossy().to_string(),
            ".txt".to_string(),
            PatternType::Extension,
            false,
            false,
        )
        .unwrap();

        assert_eq!(results.len(), 2); // file1.txt, file2.txt only
    }

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

    #[test]
    fn test_batch_delete_single_file() {
        let dir = setup_test_directory();
        let file_path = dir.path().join("temp.tmp");

        let result = batch_delete(vec![file_path.to_string_lossy().to_string()], false).unwrap();

        assert_eq!(result.successful.len(), 1);
        assert!(result.failed.is_empty());
        assert!(!file_path.exists());
    }

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

    #[test]
    fn test_batch_delete_with_empty_dir_cleanup() {
        let dir = setup_test_directory();
        let subdir = dir.path().join("subdir");
        let nested_file = subdir.join("nested.txt");

        let result = batch_delete(
            vec![nested_file.to_string_lossy().to_string()],
            true,
        )
        .unwrap();

        assert_eq!(result.successful.len(), 1);
        assert!(!nested_file.exists());
        assert!(!subdir.exists());
        assert_eq!(result.deleted_dirs.len(), 1);
    }

    #[test]
    fn test_batch_delete_nonexistent_file() {
        let result = batch_delete(vec!["/nonexistent/path/file.txt".to_string()], false).unwrap();

        assert!(result.successful.is_empty());
        assert_eq!(result.failed.len(), 1);
    }

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

    #[test]
    fn test_batch_delete_directory() {
        let dir = setup_test_directory();
        let subdir = dir.path().join("subdir");

        let result = batch_delete(vec![subdir.to_string_lossy().to_string()], false).unwrap();

        assert_eq!(result.successful.len(), 1);
        assert!(!subdir.exists());
    }

    #[test]
    fn test_batch_delete_empty_list() {
        let result = batch_delete(vec![], false).unwrap();

        assert!(result.successful.is_empty());
        assert!(result.failed.is_empty());
        assert!(result.deleted_dirs.is_empty());
    }
}
```

## Running Tests

Run all tests with:

```bash
cd src-tauri
cargo test
```

Expected output:
```
running 44 tests
test remove::tests::test_batch_delete_empty_list ... ok
test remove::tests::test_batch_delete_nonexistent_file ... ok
...
test result: ok. 44 passed; 0 failed; 0 ignored
```

## Acceptance Criteria

- [x] All three pattern matching modes work correctly
- [x] Pattern matching respects case sensitivity setting
- [x] Subdirectory inclusion toggle works correctly
- [x] Files are deleted successfully
- [x] Empty directory cleanup works when enabled
- [x] Errors are handled gracefully and reported clearly
- [x] All unit tests pass (31 tests in remove.rs)
- [x] All integration tests pass (13 tests in rename.rs)
- [x] Commands are properly registered with Tauri
