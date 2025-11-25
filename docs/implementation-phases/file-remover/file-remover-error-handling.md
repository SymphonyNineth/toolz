# File Remover - Error Handling Guide

This document provides comprehensive documentation for error handling in the File Remover tool, covering all error types, their causes, and how they are handled across the frontend and backend.

## Overview

The File Remover implements a multi-layered error handling strategy:

1. **Validation Layer** - Catches errors before operations begin
2. **Operation Layer** - Handles errors during file operations
3. **Communication Layer** - Manages IPC/network errors between frontend and backend
4. **Recovery Layer** - Provides graceful degradation and retry mechanisms

---

## 1. Pattern Errors

### 1.1 Empty Pattern

**Cause:** User attempts to search with an empty or whitespace-only pattern.

**Frontend Validation** (`utils.ts`):
```typescript
if (!pattern.trim()) {
  return "Pattern cannot be empty";
}
```

**Backend Validation** (`remove.rs`):
```rust
if pattern.trim().is_empty() {
    return Err("Pattern cannot be empty".to_string());
}
```

**User Feedback:**
- Error message displayed inline below the pattern input field
- Search button remains disabled until valid pattern is entered

---

### 1.2 Invalid Regex Syntax

**Cause:** User enters an invalid regular expression when using regex pattern type.

**Frontend Validation** (`utils.ts`):
```typescript
if (type === "regex") {
  try {
    new RegExp(pattern);
  } catch (e) {
    return `Invalid regex: ${(e as Error).message}`;
  }
}
```

**Backend Validation** (`remove.rs`):
```rust
fn match_regex(name: &str, pattern: &str, case_sensitive: bool) 
    -> Result<Option<Vec<(usize, usize)>>, String> 
{
    let regex_pattern = if case_sensitive {
        Regex::new(pattern)
    } else {
        Regex::new(&format!("(?i){}", pattern))
    }
    .map_err(|e| e.to_string())?;
    // ...
}
```

**Common Invalid Patterns:**
| Pattern | Error |
|---------|-------|
| `[` | Unclosed character class |
| `(` | Unclosed group |
| `*` | Nothing to repeat |
| `\` | Trailing backslash |
| `(?=` | Unsupported lookahead (in some regex engines) |

**User Feedback:**
- Detailed regex error message shown inline
- Pattern input highlighted with error state

---

### 1.3 Invalid Extension Format

**Cause:** User enters malformed file extension patterns.

**Frontend Validation** (`utils.ts`):
```typescript
if (type === "extension") {
  const extensions = pattern.split(",").map((s) => s.trim());
  
  // Check for empty extensions
  if (extensions.some((ext) => !ext)) {
    return "Invalid extension format: empty extension found";
  }
  
  // Check for invalid characters
  const invalidExt = extensions.find((ext) => {
    const cleaned = ext.startsWith(".") ? ext.slice(1) : ext;
    return cleaned.length === 0 || /[\/\\:*?"<>|]/.test(cleaned);
  });
  if (invalidExt) {
    return `Invalid extension: "${invalidExt}"`;
  }
}
```

**Invalid Extension Examples:**
| Input | Error Reason |
|-------|--------------|
| `.tmp,,log` | Empty extension in list |
| `.` | Extension with no name |
| `tmp/bak` | Contains path separator |
| `file*.txt` | Contains wildcard character |

**User Feedback:**
- Specific error message identifying the problematic extension
- Guidance on correct format (e.g., "Use comma-separated extensions like: .tmp, .log, .bak")

---

### 1.4 Pattern Too Broad (Warning)

**Cause:** Pattern matches an unusually large number of files.

**Detection** (`utils.ts`):
```typescript
// Warn if deleting many files
if (files.length > 100) {
  return `You are about to delete ${files.length} files. This is a large number of files.`;
}
```

**Thresholds:**
| File Count | Action |
|------------|--------|
| ≤100 | Normal operation |
| >100 | Warning displayed in confirmation modal |
| >1000 | Strong warning (consider batch limits) |

**User Feedback:**
- Warning displayed prominently in the delete confirmation modal
- User must explicitly acknowledge before proceeding

---

## 2. File System Errors

### 2.1 Permission Denied

**Cause:** Insufficient permissions to read or delete a file.

**Backend Handling** (`remove.rs`):
```rust
match result {
    Ok(_) => successful.push(file_path),
    Err(e) => failed.push((file_path, e.to_string())),
}
```

**Error Message Examples:**
- `"Permission denied (os error 13)"` (Linux/macOS)
- `"Access is denied. (os error 5)"` (Windows)

**User Feedback:**
- File appears in the "Failed" section of the delete result modal
- Specific error message shown alongside the file path
- Suggestion: "Try running with elevated permissions or checking file ownership"

---

### 2.2 File in Use

**Cause:** File is locked by another process.

**Error Message Examples:**
- `"The process cannot access the file because it is being used by another process. (os error 32)"` (Windows)
- `"Resource busy (os error 16)"` (Linux)

**User Feedback:**
- File appears in failed deletions list
- Suggestion: "Close any applications that may be using this file"

---

### 2.3 File Not Found (Already Deleted)

**Cause:** File was deleted or moved between search and delete operations.

**Scenario:**
1. User searches for files
2. File is deleted externally (by another program or user)
3. User attempts to delete the now-nonexistent file

**Error Message:**
- `"No such file or directory (os error 2)"` (Linux/macOS)
- `"The system cannot find the file specified. (os error 2)"` (Windows)

**User Feedback:**
- File appears in failed deletions (or silently succeeds if already gone)
- Not considered a critical error since the goal (file removal) is achieved

---

### 2.4 Directory Not Empty

**Cause:** Attempting to clean up a directory that still contains files.

**Backend Handling** (`remove.rs`):
```rust
if let Ok(mut entries) = fs::read_dir(path) {
    if entries.next().is_none() {
        // Directory is empty, safe to remove
        if fs::remove_dir(path).is_ok() {
            deleted_dirs.push(dir);
        }
    }
    // Non-empty directories are silently skipped
}
```

**Behavior:**
- Only empty directories are removed when `delete_empty_dirs` is enabled
- Non-empty directories are silently preserved
- No error is raised; this is expected behavior

---

### 2.5 Path Too Long

**Cause:** File path exceeds operating system limits.

**Limits:**
| OS | Path Limit |
|----|------------|
| Windows | 260 characters (legacy) / 32,767 (with long path enabled) |
| Linux | 4,096 characters |
| macOS | 1,024 characters |

**User Feedback:**
- Error message: "File name too long"
- Suggestion: "Rename or move the file to a shorter path"

---

### 2.6 Invalid Characters in Path

**Cause:** File path contains characters not allowed by the filesystem.

**Reserved Characters:**
| OS | Reserved Characters |
|----|---------------------|
| Windows | `< > : " / \ | ? *` |
| Linux/macOS | `/` (null character `\0`) |

**User Feedback:**
- Error displayed during search operation
- File skipped with appropriate error message

---

### 2.7 Disk Full

**Cause:** Not applicable to deletion, but may affect logging or temporary operations.

**Handling:**
- File deletion should still succeed
- Any logging or audit trail writing may fail

---

## 3. Network/IPC Errors

### 3.1 Tauri Command Invocation Failures

**Cause:** Communication failure between frontend (JavaScript) and backend (Rust).

**Frontend Handling** (`index.tsx`):
```typescript
try {
  const results = await searchFilesWithRetry();
  // Process results
} catch (error) {
  setPatternError(String(error));
  setFiles([]);
}
```

**Common Causes:**
| Cause | Solution |
|-------|----------|
| Backend panic | Restart application |
| Serialization error | Check data format |
| Command not found | Verify command registration |

---

### 3.2 Timeout Handling for Large File Lists

**Cause:** Operations on very large directories taking too long.

**Frontend Implementation** (`index.tsx`):
```typescript
async function searchFilesWithRetry(maxRetries = 2): Promise<any[]> {
  let lastError: Error | null = null;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await invoke<any[]>("search_files_by_pattern", {
        basePath: basePath(),
        pattern: pattern(),
        patternType: patternType(),
        includeSubdirs: includeSubdirs(),
        caseSensitive: caseSensitive(),
      });
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries) {
        await new Promise((r) => setTimeout(r, 500)); // Wait before retry
      }
    }
  }

  throw lastError;
}
```

**Retry Strategy:**
| Attempt | Wait Time | Action |
|---------|-----------|--------|
| 1 | 0ms | Initial attempt |
| 2 | 500ms | First retry |
| 3 | 500ms | Final retry |
| - | - | Show error to user |

---

### 3.3 WebView Context Lost

**Cause:** WebView process crashed or was terminated.

**Handling:**
- Application should detect disconnection
- User prompted to restart application
- State should be recoverable from localStorage where possible

---

## 4. Error Display and User Feedback

### 4.1 Inline Pattern Errors

Displayed directly below the pattern input field:

```tsx
<Show when={patternError()}>
  <div class="text-error text-sm mt-1">
    {patternError()}
  </div>
</Show>
```

### 4.2 Delete Result Modal

Shows comprehensive deletion results:

```tsx
<DeleteResultModal
  result={deleteResult()}
  onClose={() => setDeleteResult(null)}
/>
```

**Modal Sections:**
1. **Success Summary** - Count of successfully deleted files
2. **Deleted Directories** - List of cleaned up empty directories
3. **Failed Files** - List of files that couldn't be deleted with error messages

### 4.3 Warning Dialogs

Dangerous operation warnings displayed in confirmation modal:

```tsx
<Show when={dangerWarning()}>
  <div class="alert alert-warning mb-4">
    <span>{dangerWarning()}</span>
  </div>
</Show>
```

---

## 5. Error Recovery Strategies

### 5.1 Automatic Retry

- Network/IPC errors automatically retried up to 3 times
- Exponential backoff between retries (500ms delay)

### 5.2 Partial Success

- Batch operations continue even if individual files fail
- All results (success and failure) reported to user
- Successfully deleted files removed from the list

### 5.3 State Preservation

- User preferences saved to localStorage
- Pattern and options preserved across sessions
- Recovery from unexpected termination

---

## 6. Error Codes Reference

### Rust std::io::Error Codes (Common)

| Code | Name | Description |
|------|------|-------------|
| 1 | EPERM | Operation not permitted |
| 2 | ENOENT | No such file or directory |
| 5 | EIO | I/O error |
| 13 | EACCES | Permission denied |
| 16 | EBUSY | Device or resource busy |
| 17 | EEXIST | File exists |
| 21 | EISDIR | Is a directory |
| 28 | ENOSPC | No space left on device |
| 30 | EROFS | Read-only file system |
| 36 | ENAMETOOLONG | File name too long |
| 39 | ENOTEMPTY | Directory not empty |

### Windows-Specific Codes

| Code | Description |
|------|-------------|
| 2 | File not found |
| 3 | Path not found |
| 5 | Access denied |
| 32 | File in use |
| 145 | Directory not empty |

---

## 7. Logging and Debugging

### Development Mode

Enable verbose logging:
```rust
// In development, consider adding detailed logging
#[cfg(debug_assertions)]
println!("Attempting to delete: {}", file_path);
```

### Production Mode

- Errors logged to application logs
- Stack traces captured for unexpected errors
- User-friendly messages displayed (technical details available on request)

---

## 8. Best Practices for Error Handling

### For Users

1. **Check permissions** before running batch operations
2. **Close applications** that may be using target files
3. **Start with small batches** when deleting many files
4. **Review the file list** carefully before confirming deletion

### For Developers

1. **Always validate input** on both frontend and backend
2. **Use specific error messages** that help users understand the problem
3. **Implement retry logic** for transient errors
4. **Log errors** for debugging while showing user-friendly messages
5. **Handle partial failures** gracefully in batch operations
6. **Test edge cases** like empty directories, special characters, and long paths

