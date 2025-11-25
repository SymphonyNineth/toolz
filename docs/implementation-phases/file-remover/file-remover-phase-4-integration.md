# File Remover - Phase 4: Integration & Polish

This phase covers connecting all components, error handling, and final polish.

## Goals
- Complete frontend-backend integration
- Add comprehensive error handling
- Add loading states and feedback
- Polish UX and accessibility

## Tasks

### 1. Add Loading States

Update components to show loading indicators:

```tsx
// In ActionButtons - show spinner when searching
<Button
  variant="primary"
  onClick={props.onSearch}
  disabled={!props.canSearch || props.isSearching}
  loading={props.isSearching}
>
  <Show when={!props.isSearching}>
    <SearchIcon size="sm" class="mr-2" />
  </Show>
  {props.isSearching ? "Searching..." : "Search"}
</Button>
```

### 2. Add Result Notifications

Create a toast/notification system or use alerts for feedback:

```tsx
// After successful deletion
function showDeleteResult(result: DeleteResult) {
  const successCount = result.successful.length;
  const failCount = result.failed.length;
  const dirCount = result.deleted_dirs.length;

  let message = `Successfully deleted ${successCount} file(s).`;
  
  if (dirCount > 0) {
    message += ` Removed ${dirCount} empty directory(ies).`;
  }
  
  if (failCount > 0) {
    message += `\n\nFailed to delete ${failCount} file(s):`;
    result.failed.slice(0, 3).forEach(([path, error]) => {
      message += `\n• ${path}: ${error}`;
    });
    if (failCount > 3) {
      message += `\n... and ${failCount - 3} more`;
    }
  }

  alert(message); // Replace with toast notification in production
}
```

### 3. Error Handling Improvements

Add comprehensive error handling:

```tsx
// Pattern validation
function validatePattern(pattern: string, type: PatternType): string | undefined {
  if (!pattern.trim()) {
    return "Pattern cannot be empty";
  }

  if (type === "regex") {
    try {
      new RegExp(pattern);
    } catch (e) {
      return `Invalid regex: ${(e as Error).message}`;
    }
  }

  if (type === "extension") {
    const extensions = pattern.split(",").map((s) => s.trim());
    if (extensions.some((ext) => !ext)) {
      return "Invalid extension format";
    }
  }

  return undefined;
}

// Search with retry
async function searchFilesWithRetry(maxRetries = 2) {
  let lastError: Error | null = null;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await searchFiles();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }
  
  throw lastError;
}
```

### 4. Safety Checks

Add safety validations before deletion:

```tsx
// Check for dangerous patterns
function checkDangerousOperation(files: FileMatchItem[], basePath: string): string | undefined {
  // Warn if deleting too many files
  if (files.length > 100) {
    return `You are about to delete ${files.length} files. Are you sure?`;
  }

  // Warn if deleting from system directories
  const systemPaths = ["/usr", "/bin", "/etc", "/var", "/opt", "/home"];
  if (systemPaths.some((p) => basePath.startsWith(p) && basePath === p)) {
    return "Warning: You are attempting to delete files from a system directory.";
  }

  // Warn if all files in directory will be deleted
  // (would need to check against total files in directory)

  return undefined;
}
```

### 5. Keyboard Navigation & Accessibility

Add keyboard shortcuts and ARIA attributes:

```tsx
// In FileRemoverRow
<div
  role="listitem"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      props.onToggleSelect(props.file.path);
    }
  }}
  class="..."
>
  ...
</div>

// In FileRemoverList
<div
  role="list"
  aria-label="Files to be deleted"
  class="max-h-[500px] overflow-y-auto"
>
  ...
</div>
```

### 6. Persistent State (Optional Enhancement)

Save user preferences:

```tsx
// Save pattern type preference
function savePreferences() {
  localStorage.setItem("fileRemover.patternType", patternType());
  localStorage.setItem("fileRemover.includeSubdirs", String(includeSubdirs()));
  localStorage.setItem("fileRemover.deleteEmptyDirs", String(deleteEmptyDirs()));
}

// Load on mount
onMount(() => {
  const savedType = localStorage.getItem("fileRemover.patternType");
  if (savedType) setPatternType(savedType as PatternType);
  
  const savedSubdirs = localStorage.getItem("fileRemover.includeSubdirs");
  if (savedSubdirs) setIncludeSubdirs(savedSubdirs === "true");
  
  const savedEmptyDirs = localStorage.getItem("fileRemover.deleteEmptyDirs");
  if (savedEmptyDirs) setDeleteEmptyDirs(savedEmptyDirs === "true");
});
```

### 7. Progress Indication for Large Deletions

For bulk deletions, show progress:

```tsx
const [deleteProgress, setDeleteProgress] = createSignal<{
  current: number;
  total: number;
} | null>(null);

// In delete handler
async function handleDeleteWithProgress() {
  const filesToDelete = selectedFiles();
  const total = filesToDelete.length;
  
  setDeleteProgress({ current: 0, total });
  
  // If many files, delete in batches to show progress
  const batchSize = 50;
  const results: DeleteResult = { successful: [], failed: [], deleted_dirs: [] };
  
  for (let i = 0; i < filesToDelete.length; i += batchSize) {
    const batch = filesToDelete.slice(i, i + batchSize).map((f) => f.path);
    
    const batchResult = await invoke<DeleteResult>("batch_delete", {
      files: batch,
      deleteEmptyDirs: false, // Only clean up at the end
    });
    
    results.successful.push(...batchResult.successful);
    results.failed.push(...batchResult.failed);
    
    setDeleteProgress({ current: Math.min(i + batchSize, total), total });
  }
  
  // Final cleanup of empty dirs
  if (deleteEmptyDirs()) {
    // Trigger empty dir cleanup
  }
  
  setDeleteProgress(null);
  return results;
}
```

### 8. Style Polish

Final UI refinements:

```css
/* In App.css */

/* File row hover effect */
.file-remover-row {
  transition: background-color 0.15s ease;
}

.file-remover-row:hover {
  background-color: var(--fallback-b2, oklch(var(--b2) / 1));
}

/* Selected file indicator */
.file-remover-row.selected {
  background-color: oklch(var(--er) / 0.08);
  border-left: 3px solid var(--fallback-er, oklch(var(--er) / 1));
}

/* Match highlight animation */
@keyframes highlight-pulse {
  0%, 100% {
    background-color: oklch(var(--wa) / 0.3);
  }
  50% {
    background-color: oklch(var(--wa) / 0.5);
  }
}

.match-highlight-new {
  animation: highlight-pulse 0.5s ease;
}
```

## Final Integration Checklist

### Frontend-Backend Connection
- [x] `search_files_by_pattern` command invoked correctly
- [x] `batch_delete` command invoked correctly
- [x] Error responses handled and displayed
- [x] Loading states shown during async operations

### User Experience
- [x] Clear feedback for all actions
- [x] Confirmation before destructive operations
- [x] Ability to undo/cancel before commit
- [x] Responsive design for different window sizes

### Error Handling
- [x] Network/IPC errors caught and displayed
- [x] Invalid pattern errors shown inline
- [x] File system errors (permissions, etc.) reported
- [x] Graceful degradation on failures

### Accessibility
- [x] Keyboard navigation works
- [x] Screen reader compatible (ARIA labels)
- [x] Focus management correct
- [x] Color contrast meets WCAG standards

## Acceptance Criteria

- [x] Full workflow works end-to-end
- [x] All error states handled gracefully
- [x] Loading states visible during operations
- [x] Delete results clearly communicated
- [x] No console errors in normal usage
- [x] Performance acceptable with 1000+ files
- [x] UI is responsive and polished

## Implementation Notes (Phase 4 Complete)

### Features Implemented

1. **Pattern Validation** (`utils.ts`)
   - Validates patterns before search
   - Catches invalid regex patterns
   - Validates extension format

2. **Safety Checks** (`utils.ts`)
   - Warns when deleting >100 files
   - Warns for system directories (/usr, /bin, /etc, etc.)
   - Warns when deleting >1GB of data

3. **Persistent State** (`index.tsx`)
   - Saves preferences to localStorage
   - Restores pattern type, subdirs, empty dirs settings on mount

4. **Progress Indication** (`index.tsx`, `DeleteConfirmModal.tsx`)
   - Shows progress bar for large deletions (>50 files)
   - Batch processing with progress updates

5. **Delete Result Modal** (`DeleteResultModal.tsx`)
   - Shows success/failure counts
   - Lists deleted directories
   - Shows failed files with error messages

6. **Keyboard Navigation** (`FileRemoverRow.tsx`)
   - Rows are focusable with Tab
   - Space/Enter toggles selection
   - ARIA attributes for screen readers

7. **Style Polish** (`App.css`)
   - Smooth transitions for row hover/selection
   - Match highlight animations
   - Focus ring styles

