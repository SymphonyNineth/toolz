# Memory Management & File Limits

## Overview

This document describes the memory management improvements implemented to prevent stack overflow errors and memory exhaustion when working with large directories. It also covers the explicit cancel buttons for async operations.

## Problems Addressed

### 1. Stack Overflow with Large Directories

**Symptom:** "Maximum call stack size exceeded" error when selecting folders with many files.

**Root Causes:**
- The `computeDiff` function used a 2D array of size O(m*n) which could exhaust memory for long filenames
- Processing thousands of files with reactive computations created excessive stack depth
- Array spread operators with huge arrays could overflow

**Solution:**
- Implemented a hybrid diff algorithm that uses simple prefix/suffix matching for strings longer than 500 characters
- Added file count limits to prevent loading excessive data
- Improved array handling to avoid deep spread operations

### 2. Memory Leaks After Cancellation

**Symptom:** RAM usage stays high (5-10GB) after cancelling operations, instead of returning to baseline.

**Root Causes:**
- Frontend signals (`selectedPaths`, `files`) were never cleared on cancellation
- `onCleanup` only cancelled backend operations but didn't clear state
- Data remained in memory after operations completed or were cancelled

**Solution:**
- Added `clearAllState()` / `clearFileState()` functions that clear all file-related state
- Called state clearing on cancellation and component unmount
- Used `batch()` for efficient state updates

## Implementation Details

### File Count Limits

| Constant | Value | Purpose |
|----------|-------|---------|
| `MAX_RECOMMENDED_FILES` | 10,000 | Warning shown to user |
| `ABSOLUTE_MAX_FILES` | 50,000 | Hard limit, cannot exceed |
| `MAX_RECOMMENDED_MATCHES` | 10,000 | Warning for search results |
| `ABSOLUTE_MAX_MATCHES` | 50,000 | Hard limit for search results |

### Diff Algorithm Optimization

| String Length | Algorithm Used | Memory Usage |
|---------------|---------------|--------------|
| ≤ 500 chars | LCS-based diff | O(m*n) |
| > 500 chars | Simple prefix/suffix | O(1) |

The simple diff algorithm:
1. Finds common prefix
2. Finds common suffix (non-overlapping with prefix)
3. Treats the middle portion as removed/added

This produces correct highlighting for typical file renaming operations while avoiding memory issues.

### State Clearing

State is cleared in the following scenarios:

1. **On Cancellation:** When user cancels an operation
2. **On Component Unmount:** When navigating away from the page
3. **On Error:** When a memory-related error is caught

```typescript
// BatchRenamer
const clearAllState = () => {
  batch(() => {
    setSelectedPaths([]);
    setStatusMap({});
    setListProgress({ phase: "idle", filesFound: 0 });
    setRenameProgress({ phase: "idle", current: 0, total: 0 });
  });
};

// FileRemover
const clearFileState = () => {
  batch(() => {
    setFiles([]);
    setSearchProgress({ phase: "idle", filesFound: 0 });
    setDeleteProgress(null);
  });
};
```

### User Warnings

Users are warned before loading large numbers of files:

1. **Warning at 10,000 files:** Confirmation dialog explaining potential performance issues
2. **Hard limit at 50,000 files:** Alert explaining that some files were not added
3. **Search result limits:** Similar warnings for search operations

## Explicit Cancel Buttons

Users can manually cancel long-running operations using dedicated cancel buttons in the UI.

### BatchRenamer Cancel Buttons

| Button | When Visible | Action |
|--------|-------------|--------|
| Cancel Scan | During folder scanning | Cancels the file listing operation |
| Cancel Rename | During batch rename | Cancels the rename operation |

### FileRemover Cancel Button

| Button | When Visible | Action |
|--------|-------------|--------|
| Cancel | During search | Cancels the file search operation |

### Implementation

Cancel buttons replace the action button during operation:

```typescript
// BatchRenamer - Cancel handlers
const handleCancelScan = () => {
  if (activeListOperationId) {
    invoke("cancel_operation", { operationId: activeListOperationId });
    activeListOperationId = null;
  }
};

const handleCancelRename = () => {
  if (activeRenameOperationId) {
    invoke("cancel_operation", { operationId: activeRenameOperationId });
    activeRenameOperationId = null;
  }
};

// FileRemover - Cancel handler
const handleCancelSearch = () => {
  if (activeSearchOperationId) {
    invoke("cancel_operation", { operationId: activeSearchOperationId });
    activeSearchOperationId = null;
  }
};
```

### UI Behavior

- Cancel buttons appear with `btn-warning` variant (yellow/amber color)
- Cancel buttons replace the original action button during operation
- Other action buttons are disabled during operations
- Upon cancellation, state is cleared to release memory

## Files Modified

- `src/utils/diff.ts` - Optimized diff algorithm
- `src/utils/diff.test.ts` - Added tests for long strings
- `src/components/BatchRenamer/index.tsx` - Memory management, file limits, and cancel handlers
- `src/components/BatchRenamer/ActionButtons.tsx` - Cancel button UI
- `src/components/BatchRenamer/ActionButtons.test.tsx` - Tests for cancel buttons
- `src/components/FileRemover/index.tsx` - Memory management, file limits, and cancel handler
- `src/components/FileRemover/PatternControls.tsx` - Cancel button UI
- `src/components/FileRemover/PatternControls.test.tsx` - Tests for cancel button
- `src/components/ui/icons/index.tsx` - Added StopIcon

## Testing

Run all tests to verify the changes:

```bash
bun run test -- --run
```

Run specific test files:

```bash
# Diff algorithm tests
bun run test -- --run src/utils/diff.test.ts

# BatchRenamer ActionButtons tests
bun run test -- --run src/components/BatchRenamer/ActionButtons.test.tsx

# FileRemover PatternControls tests
bun run test -- --run src/components/FileRemover/PatternControls.test.tsx
```

## Future Improvements

1. **Virtual Scrolling:** For even better performance with large lists, implement virtualized rendering
2. **Pagination:** Load files in pages for extremely large directories
3. **Worker Threads:** Move heavy computations to web workers
4. **Backend Streaming:** Stream file lists from backend in chunks instead of all at once

