# Phase 3: Core Logic & UI

## Goal
Build the user interface for renaming controls and implement the live preview and renaming logic.

## Tasks

- [ ] **Implement Renamer Controls**
    - Create `src/components/BatchRenamer/RenamerControls.tsx`.
    - Add inputs for:
        - Find Text
        - Replace Text
    - Add a checkbox for "Case Sensitive".
    - Bind these inputs to the parent state (signals).

- [ ] **Implement File List & Preview**
    - Create `src/components/BatchRenamer/FileList.tsx`.
    - Display a list of files with two columns:
        - **Original Name**: The current filename.
        - **New Name**: The calculated preview filename.
    - **Preview Logic**:
        - Create a derived signal (memo) that maps the file list.
        - Apply the Find/Replace logic to each filename.
        - Respect the "Case Sensitive" setting (construct Regex accordingly).
        - Highlight changes if possible (optional).

- [ ] **Implement Rename Execution**
    - Add a "Rename" button in the main component.
    - **Handler**:
        - Filter out files where `Original Name == New Name`.
        - Prepare the payload: `Vec<(path, newPath)>`.
        - Invoke the `batch_rename` Tauri command.
        - Handle the response:
            - Update the file list with new names upon success.
            - Show error messages if any fail.
