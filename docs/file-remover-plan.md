# File Remover Tool Implementation Plan

This document outlines the plan to implement a file removal tool in the Simple Tools project.

## Goal

Create a tool that allows users to select files matching a pattern, preview them with highlighted matches, and delete them from the file system with proper confirmation.

## Features

### Pattern Matching Modes

1. **Simple Name Matching**: Match files containing a specific text in their names
2. **Extension List**: Match files by their extensions (e.g., `.tmp, .log, .bak`)
3. **Regex Mode**: Advanced pattern matching using regular expressions

### Options

- **Include Subdirectories**: Recursively search in subdirectories
- **Delete Empty Directories**: Remove directories that become empty after file deletion
- **Case Sensitive**: Toggle case sensitivity for pattern matching

### File List Management

- Preview list of files to be deleted
- **Highlight matched parts** in file names (similar to regex highlighting in BatchRenamer)
- Select/deselect individual files from the list
- Remove files from the list (without deleting from disk)
- Clear entire list
- Bulk selection controls (select all, deselect all, invert selection)

### Deletion Process

- Confirmation dialog with warning before deletion
- Show total file count and size to be deleted
- Progress indication during deletion
- Results summary showing successful/failed deletions

## Architecture

### Backend (Rust / Tauri)

#### New Commands

1. **`search_files_by_pattern`**

   ```rust
   #[tauri::command]
   fn search_files_by_pattern(
       base_path: String,
       pattern: String,
       pattern_type: PatternType, // "simple" | "extension" | "regex"
       include_subdirs: bool,
       case_sensitive: bool,
   ) -> Result<Vec<FileMatchResult>, String>
   ```

   - Returns files matching the pattern with match information for highlighting

2. **`batch_delete`**

   ```rust
   #[tauri::command]
   fn batch_delete(
       files: Vec<String>,
       delete_empty_dirs: bool,
   ) -> Result<DeleteResult, String>
   ```

   - Deletes the specified files
   - Optionally removes empty parent directories
   - Returns detailed results (success/failure per file)

3. **`get_files_info`**
   ```rust
   #[tauri::command]
   fn get_files_info(paths: Vec<String>) -> Result<Vec<FileInfo>, String>
   ```
   - Returns metadata for files (size, type, modification date)
   - Used for displaying file information in the preview

#### Data Types

```rust
#[derive(Serialize, Deserialize)]
enum PatternType {
    Simple,
    Extension,
    Regex,
}

#[derive(Serialize, Deserialize)]
struct FileMatchResult {
    path: String,
    name: String,
    match_ranges: Vec<(usize, usize)>, // Start and end positions of matches
    size: u64,
    is_directory: bool,
}

#[derive(Serialize, Deserialize)]
struct DeleteResult {
    successful: Vec<String>,
    failed: Vec<(String, String)>, // (path, error message)
    deleted_dirs: Vec<String>,
}

#[derive(Serialize, Deserialize)]
struct FileInfo {
    path: String,
    name: String,
    size: u64,
    is_directory: bool,
    modified: u64, // Unix timestamp
}
```

### Frontend (SolidJS)

#### Components

1. **`src/components/FileRemover/index.tsx`**

   - Main container component
   - State management for files, patterns, and options
   - Orchestrates the deletion workflow

2. **`src/components/FileRemover/PatternControls.tsx`**

   - Folder selection button with path display (inline with controls)
   - Pattern input field with integrated Search button
   - Pattern type selector (simple/extension/regex)
   - Case sensitivity toggle
   - Subdirectory inclusion toggle
   - Delete empty directories toggle
   - Real-time pattern validation with error display
   - Regex cheat sheet (collapsible, shared with BatchRenamer via `ui/RegexCheatSheet.tsx`)

3. **`src/components/FileRemover/FileRemoverList.tsx`**

   - List of matched files with checkboxes
   - Highlighted match display (reuse `RegexHighlightText` component)
   - File metadata display (size, path)
   - Selection controls

4. **`src/components/FileRemover/ActionButtons.tsx`**

   - Summary bar showing file count and selection status
   - Clear list button
   - Delete button with count
   - Note: Folder selection and Search moved to PatternControls for better UX

5. **`src/components/FileRemover/DeleteConfirmModal.tsx`**

   - Confirmation dialog before deletion
   - Shows file count and total size
   - Warning message about permanent deletion
   - Confirm/Cancel buttons

6. **`src/components/FileRemover/Header.tsx`**
   - Tool title and description

#### Shared Components to Reuse

- `RegexHighlightText` - For displaying matched portions in file names
- `RegexCheatSheet` - Collapsible regex quick reference (shared between FileRemover and BatchRenamer)
- `Button` - UI buttons
- `Checkbox` - Selection checkboxes
- `Input` - Pattern input
- `Modal` - Confirmation dialog
- `Tooltip` - Help tooltips
- `useFileSelection` hook - For managing file selection state

#### State Structure

```typescript
interface FileItem {
  path: string;
  name: string;
  matchRanges: [number, number][]; // For highlighting
  size: number;
  isDirectory: boolean;
  selected: boolean;
}

interface RemoverState {
  files: FileItem[];
  pattern: string;
  patternType: "simple" | "extension" | "regex";
  caseSensitive: boolean;
  includeSubdirs: boolean;
  deleteEmptyDirs: boolean;
  patternError: string | undefined;
  isSearching: boolean;
  isDeleting: boolean;
}
```

## UI/UX Design

### Layout

- Folder selection at the top with path display
- Pattern type selector below folder selection
- Pattern input with integrated Search button (real-time validation)
- Options checkboxes in a grid layout
- Regex cheat sheet (collapsible) below options when in regex mode
- Summary bar with file count, selection status, and action buttons
- File list taking up remaining space

### Consistency with BatchRenamer

- Same card-style controls with `bg-base-200 rounded-box shadow-lg`
- Same button styles and variants
- Shared RegexCheatSheet component
- Same pattern for checkboxes and input fields

### Visual Feedback

- Red/danger theme for delete-related actions (distinct from BatchRenamer's primary theme)
- Highlighted matches in orange/warning color
- Strikethrough effect on files marked for deletion
- Loading spinner during search and delete operations
- Success/error toast notifications after deletion

### Safety Features

- Two-step confirmation for deletion
- Clear visual indication that files will be permanently deleted
- Show exact file paths to prevent accidental deletions
- "Remove from list" clearly distinct from "Delete from disk"

## Implementation Phases

### Phase 1: Backend Setup

1. Implement `PatternType` enum and matching logic
2. Implement `search_files_by_pattern` command
3. Implement `batch_delete` command
4. Add comprehensive tests for pattern matching
5. Add comprehensive tests for file deletion

### Phase 2: Frontend Setup

1. Create FileRemover component structure
2. Implement PatternControls component
3. Connect folder selection

### Phase 3: Core Logic & UI

1. Implement pattern matching and file search
2. Implement FileRemoverList with highlighting
3. Implement file selection logic
4. Implement delete confirmation modal

### Phase 4: Integration & Polish

1. Connect frontend to backend commands
2. Implement delete workflow
3. Add loading states and error handling
4. Add result notifications

### Phase 5: Testing

1. Unit tests for pattern matching utilities
2. Unit tests for all frontend components
3. Integration tests for deletion workflow
4. End-to-end tests

## Reusable Code from BatchRenamer

### Utils

- `getRegexMatches` from `renamingUtils.ts` - Adapt for pattern highlighting
- `getFileName`, `getDirectory` from `path.ts` - Path manipulation
- Diff highlighting logic (adapted for match highlighting)

### Components

- `RegexHighlightText` - Adapt for showing matched portions
- `FileList` patterns - Similar virtualized list with checkboxes
- `useFileSelection` hook - Selection state management

### Backend

- `list_files_recursively` - Already implemented, extend for pattern matching

## Error Handling

### Pattern Errors

- Invalid regex syntax
- Empty pattern
- Pattern too broad (matching too many files - warning)

### File System Errors

- Permission denied
- File in use
- File not found (already deleted)
- Directory not empty (when delete_empty_dirs is false)

### Network/IPC Errors

- Tauri command invocation failures
- Timeout handling for large file lists

## Security Considerations

1. **No system directories**: Prevent deletion in system-critical paths
2. **Confirmation required**: Always require explicit confirmation
3. **Batch limits**: Warn or limit extremely large batch deletions
4. **No recursive wildcard**: Prevent patterns like `*.*` in root directories
5. **Audit trail**: Log deletions for potential recovery reference

## Future Enhancements

1. **Recycle bin support**: Move to trash instead of permanent deletion
2. **Undo functionality**: Keep deleted files in temp location briefly
3. **Save patterns**: Remember frequently used patterns
4. **Dry run mode**: Preview what would be deleted without confirmation
5. **Size filters**: Filter by file size (min/max)
6. **Date filters**: Filter by modification date
7. **Export list**: Export matched files to CSV/text
