# FileList Component Tests

**Target Component:** `src/components/BatchRenamer/FileList.tsx`

## Goal

Ensure the file list correctly displays files, handles user interactions, and visualizes status.

## Test Cases to Implement

### Rendering

- [x] Should render an empty state when no files are provided.
- [x] Should render a list of `FileItem` components when files are provided.
- [x] Should display "Original Name" and "New Name" columns.

### File Item Display

- [x] Should display the correct original filename.
- [x] Should display the correct new filename.
- [x] Should show the full path (or a truncated version/tooltip) if needed.
- [x] Should visually distinguish changed filenames (e.g., diff highlighting if implemented).

### Status & Feedback

- [x] Should display "Collision" warning if `hasCollision` is true.
- [x] Should display success status icon/color when `status` is 'success'.
- [x] Should display error status icon/color when `status` is 'error'.

### Interactions

- [x] Should call `onRemoveFiles` when the remove button is clicked for a specific file.
- [x] Should support multi-selection (if checkboxes are implemented).
- [x] Should call `onRemoveFiles` with multiple paths when bulk remove is triggered.
