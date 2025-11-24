# Rust Backend Unit Testing Guide

This document covers the approach and best practices for unit testing the Rust backend functions in the Simple Tools application.

## Overview

The Rust backend provides file system operations through Tauri commands. We use Rust's built-in testing framework with the `tempfile` crate for testing file operations safely.

## Running Tests

```bash
# Run all Rust tests
cd src-tauri && cargo test

# Run with verbose output
cd src-tauri && cargo test -- --nocapture

# Run a specific test
cd src-tauri && cargo test test_batch_rename_success

# Run all tests matching a pattern
cd src-tauri && cargo test batch_rename
```

## Test Structure

Tests are located in `src-tauri/src/lib.rs` within a `#[cfg(test)]` module. This follows Rust conventions for unit testing.

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use std::io::Write;
    use tempfile::tempdir;
    
    #[test]
    fn test_function_name() {
        // Test implementation
    }
}
```

## Testing File Operations

Since our backend deals with file system operations, we use the `tempfile` crate to:

1. Create temporary directories that are automatically cleaned up
2. Isolate tests from each other
3. Avoid polluting the real file system

### Example: Testing File Creation

```rust
#[test]
fn test_with_temp_files() {
    // Create a temporary directory (auto-deleted when dropped)
    let temp_dir = tempdir().expect("Failed to create temp dir");
    
    // Create test files
    let file_path = temp_dir.path().join("test.txt");
    File::create(&file_path)
        .unwrap()
        .write_all(b"test content")
        .unwrap();
    
    // Your test logic here
    assert!(file_path.exists());
}
```

## Covered Functions

### `batch_rename`

| Test Case | Description |
|-----------|-------------|
| `test_batch_rename_success` | Renames multiple files successfully |
| `test_batch_rename_empty_list` | Handles empty input gracefully |
| `test_batch_rename_nonexistent_file` | Returns error for missing files |
| `test_batch_rename_partial_failure` | Reports errors while completing valid renames |
| `test_batch_rename_overwrites_existing` | Handles overwriting existing target files |

### `list_files_recursively`

| Test Case | Description |
|-----------|-------------|
| `test_list_files_recursively_nested` | Correctly traverses nested directories |
| `test_list_files_recursively_empty_dir` | Handles empty directories |
| `test_list_files_recursively_nonexistent_path` | Returns error for non-existent paths |
| `test_list_files_recursively_file_not_dir` | Returns error when path is a file |
| `test_list_files_recursively_excludes_directories` | Only includes files, not directories |

### `collect_files_recursive` (Helper Function)

| Test Case | Description |
|-----------|-------------|
| `test_collect_files_recursive_basic` | Collects files from a simple directory |
| `test_collect_files_recursive_deep_nesting` | Handles deeply nested directory structures |
| `test_collect_files_recursive_special_characters` | Handles filenames with spaces and special characters |

## Writing New Tests

When adding new tests, follow these guidelines:

### 1. Use Descriptive Names

```rust
// Good
#[test]
fn test_batch_rename_handles_permission_denied() { }

// Bad
#[test]
fn test1() { }
```

### 2. Follow the Arrange-Act-Assert Pattern

```rust
#[test]
fn test_example() {
    // Arrange: Set up test data
    let temp_dir = tempdir().unwrap();
    let file = temp_dir.path().join("test.txt");
    File::create(&file).unwrap();
    
    // Act: Call the function under test
    let result = some_function(file.to_string_lossy().to_string());
    
    // Assert: Verify the results
    assert!(result.is_ok());
    assert_eq!(result.unwrap(), expected_value);
}
```

### 3. Test Both Success and Error Cases

Always test:
- Happy path (normal operation)
- Edge cases (empty inputs, boundary conditions)
- Error cases (invalid inputs, missing files)
- Recovery scenarios (partial failures)

### 4. Keep Tests Independent

Each test should:
- Create its own temporary directory
- Not depend on other tests
- Clean up after itself (handled automatically by `tempfile`)

## Documentation Comments

All public functions should have doc comments (`///`) that include:
- A brief description
- `# Arguments` section
- `# Returns` section
- `# Errors` section (if applicable)
- `# Example` section with runnable code

Example:
```rust
/// Renames multiple files in a single batch operation.
///
/// # Arguments
///
/// * `files` - A vector of tuples containing (old_path, new_path) pairs
///
/// # Returns
///
/// * `Ok(Vec<String>)` - Successfully renamed file paths
/// * `Err(String)` - Error messages for failed renames
///
/// # Example
///
/// ```ignore
/// let files = vec![("old.txt".to_string(), "new.txt".to_string())];
/// let result = batch_rename(files);
/// ```
#[tauri::command]
fn batch_rename(files: Vec<(String, String)>) -> Result<Vec<String>, String> {
    // Implementation
}
```

## Generating Documentation

Generate HTML documentation for the Rust code:

```bash
cd src-tauri && cargo doc --open
```

This creates browsable documentation at `src-tauri/target/doc/simple_tools_lib/index.html`.

## CI Integration

For continuous integration, add these commands to your CI workflow:

```yaml
# Run tests
- name: Run Rust tests
  run: cd src-tauri && cargo test

# Check formatting
- name: Check Rust formatting
  run: cd src-tauri && cargo fmt -- --check

# Run clippy lints
- name: Run Clippy
  run: cd src-tauri && cargo clippy -- -D warnings
```

## Dependencies

### Test Dependencies (`Cargo.toml`)

```toml
[dev-dependencies]
tempfile = "3"
```

The `tempfile` crate provides:
- `tempdir()` - Creates a temporary directory
- `NamedTempFile` - Creates a temporary file with a path
- Automatic cleanup when values go out of scope

