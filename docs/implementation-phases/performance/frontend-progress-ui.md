# Frontend Progress UI Implementation

This document covers adding progress bar components and integrating them with the backend's streaming commands to provide visual feedback during long operations.

## Overview

**Goal**: Show progress bars and status messages when processing large folders, preventing the perception of a frozen/hung application.

**Components to Create**:
- Reusable `ProgressBar` component
- Integration with File Remover's search functionality
- Integration with Batch Renamer's folder selection

---

## Phase 1: Create Reusable Progress Bar Component

### Step 1.1: Create ProgressBar Component File
- [ ] Create `src/components/ui/ProgressBar.tsx`
- [ ] Design component to accept props for:
  - `progress` - Current progress value (0-100 or current/total)
  - `total` - Total items (optional, for showing "X of Y" text)
  - `current` - Current item count (optional)
  - `label` - Description text (e.g., "Scanning files...")
  - `showPercentage` - Whether to show percentage text
  - `indeterminate` - For operations where total is unknown

### Step 1.2: Style with DaisyUI
- [ ] Use DaisyUI's `progress` component class as the base
- [ ] Add appropriate color variants (primary for active, success for complete)
- [ ] Include smooth transition animation for progress updates
- [ ] Support indeterminate/pulsing state for unknown totals

### Step 1.3: Add Accessibility
- [ ] Include proper ARIA attributes (`role="progressbar"`, `aria-valuenow`, etc.)
- [ ] Ensure screen reader announces progress changes appropriately

---

## Phase 2: Create Progress Types for TypeScript

### Step 2.1: Define Type Definitions
- [ ] Create or update `src/components/FileRemover/types.ts` with:
  - `SearchProgress` type matching backend enum variants
  - Update existing types if needed

### Step 2.2: Define Renamer Progress Types
- [ ] Create `src/components/BatchRenamer/types.ts` (if not exists)
- [ ] Add `ListProgress` type matching backend enum variants
- [ ] Add `RenameProgress` type for batch rename operations

---

## Phase 3: Integrate Progress into File Remover

### Step 3.1: Add Progress State
- [ ] Add signal for search progress state in `FileRemover/index.tsx`
- [ ] Add signal to track if search is in "indeterminate" vs "determinate" phase
- [ ] Add signal for current status message

### Step 3.2: Update Search Function to Use Streaming API
- [ ] Import `Channel` from `@tauri-apps/api/core`
- [ ] Create a Channel instance for receiving progress events
- [ ] Set up `onmessage` handler to update progress state
- [ ] Call `search_files_with_progress` instead of `search_files_by_pattern`
- [ ] Handle different progress event types (Started, Scanning, Matching, Completed)

### Step 3.3: Display Progress UI During Search
- [ ] Show ProgressBar component when `isSearching` is true
- [ ] Display appropriate label based on current phase:
  - "Scanning directories..." during initial walk
  - "Matching patterns... (X files)" during pattern matching
- [ ] Switch from indeterminate to determinate mode when total is known
- [ ] Hide progress bar and show results when complete

### Step 3.4: Add Cancel Support (Optional Enhancement)
- [ ] Consider adding ability to cancel long-running searches
- [ ] Would require backend support for cancellation tokens

---

## Phase 4: Integrate Progress into Batch Renamer

### Step 4.1: Add Progress State for Folder Selection
- [ ] Add signal for folder scanning progress in `BatchRenamer/index.tsx`
- [ ] Add signal for current folder being scanned

### Step 4.2: Update Folder Selection to Use Streaming API
- [ ] Create Channel for `list_files_with_progress` events
- [ ] Update `selectFolders` function to use streaming command
- [ ] Handle progress events to update UI state

### Step 4.3: Display Progress During Folder Scan
- [ ] Show ProgressBar when scanning folders after selection
- [ ] Display "Scanning [folder name]..." with file count
- [ ] Update progress as files are discovered

### Step 4.4: Add Progress for Rename Operation
- [ ] Add progress state for rename operation
- [ ] Use streaming `batch_rename_with_progress` command
- [ ] Show progress during rename (especially useful for many files)

---

## Phase 5: Improve Delete Progress in File Remover

### Step 5.1: Update Existing Delete Progress
- [ ] The File Remover already has `DeleteProgress` state
- [ ] Integrate with new streaming `batch_delete_with_progress` command
- [ ] Ensure progress modal shows real-time updates

### Step 5.2: Enhance Delete Confirm Modal
- [ ] Update `DeleteConfirmModal` to show more detailed progress
- [ ] Display current file being deleted (or just count)
- [ ] Show estimated time remaining (optional)

---

## Phase 6: Loading States and UX Polish

### Step 6.1: Disable Interactions During Operations
- [ ] Disable search button and pattern inputs while searching
- [ ] Disable file selection buttons while scanning folders
- [ ] Disable rename/delete buttons while operations are in progress

### Step 6.2: Add Status Messages
- [ ] Show contextual messages during different phases
- [ ] Examples:
  - "Found X files in Y directories"
  - "Scanning subdirectories..."
  - "Applying pattern to X files..."

### Step 6.3: Handle Edge Cases
- [ ] Show appropriate UI for empty results after long search
- [ ] Handle errors gracefully with clear error messages
- [ ] Allow retry after errors

### Step 6.4: Smooth Transitions
- [ ] Add fade transitions for progress bar appearance/disappearance
- [ ] Ensure progress bar updates smoothly (debounce if needed)
- [ ] Avoid jarring UI shifts when progress completes

---

## Phase 7: Testing

### Step 7.1: Component Tests for ProgressBar
- [ ] Create `src/components/ui/ProgressBar.test.tsx`
- [ ] Test rendering with various progress values
- [ ] Test indeterminate state rendering
- [ ] Test accessibility attributes

### Step 7.2: Integration Tests for File Remover
- [ ] Test that progress state updates correctly
- [ ] Test that UI shows progress during search
- [ ] Mock the Channel API for testing

### Step 7.3: Integration Tests for Batch Renamer
- [ ] Test progress during folder selection
- [ ] Test progress during rename operation

### Step 7.4: Manual Testing
- [ ] Test with small folders (should complete quickly, progress might flash)
- [ ] Test with medium folders (100-1000 files, should see progress)
- [ ] Test with large folders (10000+ files, should see smooth progress)
- [ ] Verify UI remains responsive during operations

---

## Phase 8: Documentation

### Step 8.1: Document ProgressBar Component
- [ ] Add JSDoc comments to ProgressBar component
- [ ] Document all props and their usage
- [ ] Add usage examples in comments

### Step 8.2: Update Feature Documentation
- [ ] Note the progress feedback feature in appropriate docs
- [ ] Document the streaming API integration pattern

---

## UI/UX Considerations

### Progress Bar Placement
- **File Remover**: Show progress bar in the PatternControls section or above the file list
- **Batch Renamer**: Show progress bar near the action buttons or above the file list
- Consider using a toast/notification style for non-blocking progress

### Progress Information to Display
- Current count / Total count (when known)
- Percentage (when total is known)
- Current operation description
- Elapsed time (optional, for very long operations)

### Indeterminate vs Determinate States
- **Indeterminate**: Initial directory walking (total unknown)
- **Determinate**: Pattern matching phase (total files known)
- **Determinate**: Batch operations (total items known upfront)

---

## Acceptance Criteria

- [ ] ProgressBar component is created and tested
- [ ] File Remover shows progress during search operations
- [ ] Batch Renamer shows progress during folder scanning
- [ ] Progress updates smoothly without UI jank
- [ ] UI remains responsive during long operations
- [ ] Progress bar styling matches application theme (DaisyUI)
- [ ] All new components have test coverage
- [ ] User can see what's happening during long operations

