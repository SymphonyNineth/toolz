# Phase 6: Folder Selection Support

Enable users to select both individual files and entire folders for batch renaming. When a folder is selected, all files within it (recursively) will be added to the renaming list.

## Proposed Changes

### Backend - Rust Commands

#### [MODIFY] [lib.rs](file:///home/hayk/side-projects/simple-tools/src-tauri/src/lib.rs)

Add a new Tauri command `list_files_recursively` that takes a directory path and returns all files within it recursively:

```rust
#[tauri::command]
fn list_files_recursively(dir_path: String) -> Result<Vec<String>, String> {
    // Walk directory recursively and collect all file paths
}
```

This command will:
- Use `std::fs::read_dir` or `walkdir` crate to traverse directories
- Collect only files (not directories) 
- Return absolute paths
- Handle errors gracefully

---

### Frontend - File Selection

#### [MODIFY] [index.tsx](file:///home/hayk/side-projects/simple-tools/src/components/BatchRenamer/index.tsx)

Update the file selection logic to:

1. **Add folder selection button** - Create a separate "Select Folders" button alongside "Select Files"
2. **Expand folders to files** - When folders are selected, call the Rust backend to get all files recursively
3. **Merge selections** - Combine file and folder selections, removing duplicates
4. **Update UI** - Consider renaming buttons to make the distinction clear (e.g., "Add Files" and "Add Folders")

Changes:
- Add `selectFolders()` function that opens dialog with `directory: true`
- Add `expandFolders()` function that calls `list_files_recursively` for each folder
- Update `selectFiles()` to handle merging with existing selections
- Add both buttons to the UI

## Verification Plan

### Manual Testing
1. Test selecting individual files - should work as before
2. Test selecting a single folder - should add all files recursively
3. Test selecting multiple folders - should add all files from all folders
4. Test mixed selection - select files, then folders, verify all are added
5. Test nested folders - verify deep recursion works
6. Test empty folders - should handle gracefully
