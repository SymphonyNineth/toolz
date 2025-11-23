# Batch File Renamer Implementation Plan

This document outlines the plan to implement a simple batch file renamer in the Simple Tools project.

## Goal
Create a tool that allows users to select multiple files, define a "Find and Replace" rule, preview the new filenames, and rename them on the file system.

## Architecture

### Backend (Rust / Tauri)
We will use a custom Tauri command to handle the actual renaming process to ensure atomic operations and better error handling. We will also use the `tauri-plugin-dialog` for native file selection.

1.  **Dependencies**:
    *   Add `tauri-plugin-dialog` to `src-tauri/Cargo.toml`.
    *   Add `tauri-plugin-fs` (optional, but we'll use `std::fs` for now for simplicity in the custom command).

2.  **Commands**:
    *   `batch_rename(files: Vec<(String, String)>) -> Result<Vec<String>, String>`
        *   Accepts a list of tuples: `(current_path, new_path)`.
        *   Iterates through the list and performs `std::fs::rename`.
        *   Returns a list of successfully renamed paths or an error message.

### Frontend (SolidJS)
We will build a dedicated component for the renamer.

1.  **Dependencies**:
    *   Add `@tauri-apps/plugin-dialog` to `package.json`.

2.  **Components**:
    *   `src/components/BatchRenamer/index.tsx`: Main container.
    *   `src/components/BatchRenamer/RenamerControls.tsx`: Inputs for Find, Replace, and Case Sensitive toggle.
    *   `src/components/BatchRenamer/FileList.tsx`: The split-view list showing Original vs Preview filenames.

3.  **State Management**:
    *   We will use SolidJS `createStore` or `createSignal` to manage the state.
    *   **State Structure**:
        ```typescript
        interface FileItem {
          id: string; // unique id
          path: string; // full path
          name: string; // original filename
          newName: string; // preview filename
          status: 'idle' | 'success' | 'error';
        }

        // Signals
        const [files, setFiles] = createStore<FileItem[]>([]);
        const [findText, setFindText] = createSignal("");
        const [replaceText, setReplaceText] = createSignal("");
        const [caseSensitive, setCaseSensitive] = createSignal(false);
        ```

4.  **Logic**:
    *   **Selection**: Use `open()` from `@tauri-apps/plugin-dialog` to select files.
    *   **Preview**: A derived signal or effect that recalculates `newName` for all files whenever `findText`, `replaceText`, or `caseSensitive` changes.
    *   **Execution**:
        *   Filter files that need renaming (`name !== newName`).
        *   Construct the payload `Vec<(path, newPath)>`.
        *   Invoke `batch_rename`.
        *   Update UI with success/error status.

## Step-by-Step Implementation

### Phase 1: Backend Setup
1.  Add `tauri-plugin-dialog` to `src-tauri`.
2.  Register the plugin in `lib.rs`.
3.  Implement `batch_rename` command in `lib.rs`.

### Phase 2: Frontend Setup
1.  Install `@tauri-apps/plugin-dialog`.
2.  Create the basic UI structure in `App.tsx` (or route to it).
3.  Implement `FileSelection` logic.

### Phase 3: Core Logic & UI
1.  Implement `RenamerControls` (Find/Replace inputs).
2.  Implement `FileList` with live preview logic.
    *   Regex generation based on "Case Sensitive" checkbox.
    *   `String.prototype.replaceAll` or Regex replacement.
3.  Implement `Rename` button and backend integration.

### Phase 4: Polish
1.  Add status icons (check for success, x for error).
2.  Basic styling for the split view (CSS Grid or Flexbox).
3.  Handle edge cases (e.g., empty find string, name collisions - basic warning).

### Phase 5: Advanced Features
1.  Diff Highlighting (Red for deleted, Green for added).
2.  Advanced Regex Support.
3.  Numbering/Sequencing.
4.  Undo Functionality.

## Future Considerations
*   Extension changing.
