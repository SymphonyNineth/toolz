# FileList Component Tests

**Target Component:** `src/components/BatchRenamer/FileList.tsx`

## Goal
Ensure the file list correctly displays files, handles user interactions, and visualizes status.

## Test Cases to Implement

### Rendering
- [ ] Should render an empty state when no files are provided.
- [ ] Should render a list of `FileItem` components when files are provided.
- [ ] Should display "Original Name" and "New Name" columns.

### File Item Display
- [ ] Should display the correct original filename.
- [ ] Should display the correct new filename.
- [ ] Should show the full path (or a truncated version/tooltip) if needed.
- [ ] Should visually distinguish changed filenames (e.g., diff highlighting if implemented).

### Status & Feedback
- [ ] Should display "Collision" warning if `hasCollision` is true.
- [ ] Should display success status icon/color when `status` is 'success'.
- [ ] Should display error status icon/color when `status` is 'error'.

### Interactions
- [ ] Should call `onRemoveFiles` when the remove button is clicked for a specific file.
- [ ] Should support multi-selection (if checkboxes are implemented).
- [ ] Should call `onRemoveFiles` with multiple paths when bulk remove is triggered.
