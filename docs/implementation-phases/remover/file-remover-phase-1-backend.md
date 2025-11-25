# File Remover - Phase 1: Backend Setup

This phase covers the Rust backend implementation for the file removal tool.

## Goals
- Implement pattern matching logic for three modes
- Create Tauri commands for file search and deletion
- Add comprehensive test coverage for all backend functionality

## Tasks

### 1. Define Data Types in `src-tauri/src/lib.rs`

Add the following types:

```rust
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "lowercase")]
pub enum PatternType {
    Simple,
    Extension,
    Regex,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FileMatchResult {
    pub path: String,
    pub name: String,
    pub match_ranges: Vec<(usize, usize)>,
    pub size: u64,
    pub is_directory: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DeleteResult {
    pub successful: Vec<String>,
    pub failed: Vec<(String, String)>,
    pub deleted_dirs: Vec<String>,
}
```

### 2. Implement Pattern Matching Functions

```rust
/// Match files using simple substring matching
fn match_simple(name: &str, pattern: &str, case_sensitive: bool) -> Option<Vec<(usize, usize)>> {
    let search_name = if case_sensitive { name.to_string() } else { name.to_lowercase() };
    let search_pattern = if case_sensitive { pattern.to_string() } else { pattern.to_lowercase() };
    
    let mut matches = Vec::new();
    let mut start = 0;
    while let Some(pos) = search_name[start..].find(&search_pattern) {
        let abs_pos = start + pos;
        matches.push((abs_pos, abs_pos + pattern.len()));
        start = abs_pos + 1;
    }
    
    if matches.is_empty() { None } else { Some(matches) }
}

/// Match files by extension list (comma-separated)
fn match_extension(name: &str, extensions: &str, case_sensitive: bool) -> Option<Vec<(usize, usize)>> {
    let exts: Vec<&str> = extensions.split(',').map(|s| s.trim()).collect();
    let name_lower = if case_sensitive { name.to_string() } else { name.to_lowercase() };
    
    for ext in exts {
        let ext_pattern = if ext.starts_with('.') { ext.to_string() } else { format!(".{}", ext) };
        let ext_check = if case_sensitive { ext_pattern.clone() } else { ext_pattern.to_lowercase() };
        
        if name_lower.ends_with(&ext_check) {
            let start = name.len() - ext_pattern.len();
            return Some(vec![(start, name.len())]);
        }
    }
    None
}

/// Match files using regex
fn match_regex(name: &str, pattern: &str, case_sensitive: bool) -> Result<Option<Vec<(usize, usize)>>, String> {
    use regex::Regex;
    
    let regex_pattern = if case_sensitive {
        Regex::new(pattern)
    } else {
        Regex::new(&format!("(?i){}", pattern))
    }.map_err(|e| e.to_string())?;
    
    let matches: Vec<(usize, usize)> = regex_pattern
        .find_iter(name)
        .map(|m| (m.start(), m.end()))
        .collect();
    
    if matches.is_empty() { Ok(None) } else { Ok(Some(matches)) }
}
```

### 3. Implement `search_files_by_pattern` Command

```rust
#[tauri::command]
pub fn search_files_by_pattern(
    base_path: String,
    pattern: String,
    pattern_type: PatternType,
    include_subdirs: bool,
    case_sensitive: bool,
) -> Result<Vec<FileMatchResult>, String> {
    use std::fs;
    use walkdir::WalkDir;
    
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
        if path == std::path::Path::new(&base_path) {
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

```rust
#[tauri::command]
pub fn batch_delete(
    files: Vec<String>,
    delete_empty_dirs: bool,
) -> Result<DeleteResult, String> {
    use std::fs;
    use std::collections::HashSet;
    
    let mut successful = Vec::new();
    let mut failed = Vec::new();
    let mut deleted_dirs = Vec::new();
    let mut parent_dirs: HashSet<String> = HashSet::new();
    
    for file_path in files {
        let path = std::path::Path::new(&file_path);
        
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
        dirs.sort_by(|a, b| b.matches('/').count().cmp(&a.matches('/').count()));
        
        for dir in dirs {
            let path = std::path::Path::new(&dir);
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

### 5. Register Commands

Update the Tauri builder in `lib.rs`:

```rust
.invoke_handler(tauri::generate_handler![
    batch_rename,
    list_files_recursively,
    search_files_by_pattern,
    batch_delete,
])
```

### 6. Add Dependencies

Add to `src-tauri/Cargo.toml`:

```toml
[dependencies]
regex = "1"
walkdir = "2"
```

## Testing Requirements

### Unit Tests for Pattern Matching

Create `src-tauri/src/pattern_tests.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    // Simple matching tests
    #[test]
    fn test_match_simple_case_insensitive() {
        let result = match_simple("MyFile.txt", "file", false);
        assert_eq!(result, Some(vec![(2, 6)]));
    }

    #[test]
    fn test_match_simple_case_sensitive() {
        let result = match_simple("MyFile.txt", "file", true);
        assert_eq!(result, None);
        
        let result = match_simple("MyFile.txt", "File", true);
        assert_eq!(result, Some(vec![(2, 6)]));
    }

    #[test]
    fn test_match_simple_multiple_matches() {
        let result = match_simple("test_test.txt", "test", false);
        assert_eq!(result, Some(vec![(0, 4), (5, 9)]));
    }

    // Extension matching tests
    #[test]
    fn test_match_extension_single() {
        let result = match_extension("file.txt", ".txt", false);
        assert!(result.is_some());
    }

    #[test]
    fn test_match_extension_without_dot() {
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

    // Regex matching tests
    #[test]
    fn test_match_regex_simple() {
        let result = match_regex("file123.txt", r"\d+", false);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), Some(vec![(4, 7)]));
    }

    #[test]
    fn test_match_regex_invalid() {
        let result = match_regex("file.txt", r"[invalid", false);
        assert!(result.is_err());
    }

    #[test]
    fn test_match_regex_case_insensitive() {
        let result = match_regex("MyFile.txt", "myfile", false);
        assert!(result.is_ok());
        assert!(result.unwrap().is_some());
    }
}
```

### Integration Tests for Commands

Create `src-tauri/src/command_tests.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::{self, File};
    use tempfile::TempDir;

    fn setup_test_directory() -> TempDir {
        let dir = TempDir::new().unwrap();
        
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

    #[test]
    fn test_search_files_simple_pattern() {
        let dir = setup_test_directory();
        let results = search_files_by_pattern(
            dir.path().to_string_lossy().to_string(),
            "file".to_string(),
            PatternType::Simple,
            false,
            false,
        ).unwrap();
        
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_search_files_extension_pattern() {
        let dir = setup_test_directory();
        let results = search_files_by_pattern(
            dir.path().to_string_lossy().to_string(),
            ".txt".to_string(),
            PatternType::Extension,
            true, // include subdirs
            false,
        ).unwrap();
        
        assert_eq!(results.len(), 3); // file1.txt, file2.txt, nested.txt
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
        ).unwrap();
        
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_batch_delete_files() {
        let dir = setup_test_directory();
        let file_path = dir.path().join("temp.tmp");
        
        let result = batch_delete(
            vec![file_path.to_string_lossy().to_string()],
            false,
        ).unwrap();
        
        assert_eq!(result.successful.len(), 1);
        assert!(result.failed.is_empty());
        assert!(!file_path.exists());
    }

    #[test]
    fn test_batch_delete_with_empty_dir_cleanup() {
        let dir = setup_test_directory();
        let subdir = dir.path().join("subdir");
        let nested_file = subdir.join("nested.txt");
        
        let result = batch_delete(
            vec![nested_file.to_string_lossy().to_string()],
            true, // delete empty dirs
        ).unwrap();
        
        assert_eq!(result.successful.len(), 1);
        assert!(!nested_file.exists());
        // Subdirectory should be deleted since it's now empty
        assert!(!subdir.exists() || result.deleted_dirs.len() == 1);
    }

    #[test]
    fn test_batch_delete_nonexistent_file() {
        let result = batch_delete(
            vec!["/nonexistent/path/file.txt".to_string()],
            false,
        ).unwrap();
        
        assert!(result.successful.is_empty());
        assert_eq!(result.failed.len(), 1);
    }
}
```

## Acceptance Criteria

- [ ] All three pattern matching modes work correctly
- [ ] Pattern matching respects case sensitivity setting
- [ ] Subdirectory inclusion toggle works correctly
- [ ] Files are deleted successfully
- [ ] Empty directory cleanup works when enabled
- [ ] Errors are handled gracefully and reported clearly
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Commands are properly registered with Tauri

