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
- [ ] `search_files_by_pattern` command invoked correctly
- [ ] `batch_delete` command invoked correctly
- [ ] Error responses handled and displayed
- [ ] Loading states shown during async operations

### User Experience
- [ ] Clear feedback for all actions
- [ ] Confirmation before destructive operations
- [ ] Ability to undo/cancel before commit
- [ ] Responsive design for different window sizes

### Error Handling
- [ ] Network/IPC errors caught and displayed
- [ ] Invalid pattern errors shown inline
- [ ] File system errors (permissions, etc.) reported
- [ ] Graceful degradation on failures

### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader compatible (ARIA labels)
- [ ] Focus management correct
- [ ] Color contrast meets WCAG standards

## Acceptance Criteria

- [ ] Full workflow works end-to-end
- [ ] All error states handled gracefully
- [ ] Loading states visible during operations
- [ ] Delete results clearly communicated
- [ ] No console errors in normal usage
- [ ] Performance acceptable with 1000+ files
- [ ] UI is responsive and polished

