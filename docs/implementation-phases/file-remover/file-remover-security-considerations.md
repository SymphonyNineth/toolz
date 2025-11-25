# File Remover - Security Considerations

This document outlines the security measures implemented in the File Remover tool to protect users from accidental data loss and malicious operations.

## Overview

The File Remover handles a high-risk operation (permanent file deletion), requiring multiple layers of security:

1. **Path Protection** - Prevent deletion in critical system locations
2. **Confirmation Barriers** - Require explicit user consent
3. **Operation Limits** - Warn or restrict dangerous bulk operations
4. **Pattern Restrictions** - Prevent overly broad matching patterns
5. **Audit & Accountability** - Track operations for review

---

## 1. System Directory Protection

### 1.1 Protected Paths

The application prevents or warns when attempting to delete files in system-critical directories.

**Linux/Unix Protected Paths:**

| Path | Purpose | Protection Level |
|------|---------|-----------------|
| `/usr` | System binaries and libraries | Warning |
| `/bin` | Essential command binaries | Warning |
| `/sbin` | System binaries | Warning |
| `/etc` | System configuration | Warning |
| `/var` | Variable data (logs, spool) | Warning |
| `/opt` | Optional application software | Warning |
| `/lib` | Essential shared libraries | Warning |
| `/home` (root level) | User home directories root | Warning |
| `/root` | Root user's home directory | Warning |

**Windows Protected Paths:**

| Path | Purpose | Protection Level |
|------|---------|-----------------|
| `C:\Windows` | Operating system files | Warning |
| `C:\Program Files` | 64-bit applications | Warning |
| `C:\Program Files (x86)` | 32-bit applications | Warning |
| `C:\Users\*\AppData` | Application data | Warning |

**Implementation** (`utils.ts`):

```typescript
export function checkDangerousOperation(
  files: FileMatchItem[],
  basePath: string
): string | undefined {
  // Linux/Unix system paths
  const systemPaths = ["/usr", "/bin", "/etc", "/var", "/opt", "/lib", "/sbin"];
  const normalizedBase = basePath.toLowerCase();
  
  for (const sysPath of systemPaths) {
    if (normalizedBase === sysPath || normalizedBase.startsWith(sysPath + "/")) {
      return `Warning: You are attempting to delete files from a system directory (${sysPath}).`;
    }
  }

  // Root user directories
  if (normalizedBase === "/home" || normalizedBase === "/root") {
    return "Warning: You are attempting to delete files from a root user directory.";
  }

  // Windows system paths
  const windowsSystemPaths = [
    "c:\\windows", 
    "c:\\program files", 
    "c:\\program files (x86)"
  ];
  for (const winPath of windowsSystemPaths) {
    if (normalizedBase.toLowerCase().startsWith(winPath)) {
      return `Warning: You are attempting to delete files from a Windows system directory.`;
    }
  }

  return undefined;
}
```

### 1.2 Protection Levels

| Level | Behavior |
|-------|----------|
| **Block** | Operation prevented entirely (future enhancement) |
| **Warning** | User sees prominent warning, must explicitly confirm |
| **Normal** | Standard confirmation dialog |

### 1.3 Recommended Additional Protected Paths

Consider adding protection for:

| Path | Platform | Reason |
|------|----------|--------|
| `/boot` | Linux | Boot loader files |
| `/dev` | Linux | Device files |
| `/proc` | Linux | Process information |
| `/sys` | Linux | Kernel information |
| `~/.ssh` | Linux/macOS | SSH keys |
| `~/.gnupg` | Linux/macOS | GPG keys |
| `C:\Users\*\Documents` | Windows | User documents |
| `/Applications` | macOS | System applications |
| `/System` | macOS | System files |

---

## 2. Confirmation Requirements

### 2.1 Two-Step Confirmation Process

**Step 1: Delete Button Click**
- Opens confirmation modal
- Shows list of files to be deleted
- Displays total count and size

**Step 2: Confirm Button in Modal**
- Requires explicit "Confirm Delete" action
- Red/danger styling to indicate severity
- Disabled during processing to prevent double-submission

**Implementation:**

```tsx
function handleDeleteClick() {
  // Check for dangerous operations first
  const warning = checkDangerousOperation(selectedFiles(), basePath());
  setDangerWarning(warning);
  setShowDeleteModal(true); // Open confirmation modal
}

// In DeleteConfirmModal:
<button
  class="btn btn-error"
  onClick={props.onConfirm}
  disabled={props.isDeleting}
>
  {props.isDeleting ? "Deleting..." : "Confirm Delete"}
</button>
```

### 2.2 Information Displayed Before Confirmation

| Information | Purpose |
|-------------|---------|
| File count | Understand scale of operation |
| Total size | Understand data impact |
| File paths | Verify correct files selected |
| Warnings | Highlight dangerous operations |
| Pattern used | Confirm matching criteria |

### 2.3 Warning Display

Warnings are prominently displayed in the confirmation modal:

```tsx
<Show when={props.dangerWarning}>
  <div class="alert alert-warning mb-4">
    <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
    <span>{props.dangerWarning}</span>
  </div>
</Show>
```

---

## 3. Batch Operation Limits

### 3.1 File Count Warnings

| Count | Action |
|-------|--------|
| ≤100 | Normal operation |
| 101-999 | Warning: "Large number of files" |
| ≥1000 | Strong warning (recommend smaller batches) |

**Implementation:**

```typescript
if (files.length > 100) {
  return `You are about to delete ${files.length} files. This is a large number of files.`;
}
```

### 3.2 Size-Based Warnings

**Thresholds:**

| Size | Action |
|------|--------|
| <1 GB | Normal operation |
| ≥1 GB | Warning displayed |
| ≥10 GB | Strong warning (future) |

**Implementation:**

```typescript
const totalSize = files.reduce((sum, f) => sum + f.size, 0);
if (totalSize > 1024 * 1024 * 1024) { // 1 GB
  return `Warning: You are about to delete ${formatFileSize(totalSize)} of data.`;
}
```

### 3.3 Batch Processing for Large Operations

For operations exceeding 50 files, batch processing is used:

```typescript
async function handleDeleteWithProgress(filesToDelete: FileMatchItem[]): Promise<DeleteResult> {
  const batchSize = 50;
  const results: DeleteResult = { successful: [], failed: [], deletedDirs: [] };

  for (let i = 0; i < filesToDelete.length; i += batchSize) {
    const batch = filesToDelete.slice(i, i + batchSize).map((f) => f.path);
    // Process batch...
    setDeleteProgress({ current: Math.min(i + batchSize, total), total });
  }

  return results;
}
```

**Benefits:**
- Progress feedback to user
- Ability to cancel mid-operation (future)
- Prevents UI freezing
- Reduces memory usage

---

## 4. Pattern Restrictions

### 4.1 Prevented Dangerous Patterns

| Pattern Type | Dangerous Example | Reason | Mitigation |
|--------------|-------------------|--------|------------|
| Regex | `.*` | Matches everything | Warn on very broad patterns |
| Regex | `.+` | Matches all non-empty names | Warn on very broad patterns |
| Extension | `*` | Not a valid extension | Validation error |
| Simple | ` ` (single space) | Matches most files | Pattern validation |

### 4.2 Pattern Validation

All patterns are validated before execution:

**Empty Pattern Check:**
```typescript
if (!pattern.trim()) {
  return "Pattern cannot be empty";
}
```

**Regex Syntax Validation:**
```typescript
if (type === "regex") {
  try {
    new RegExp(pattern);
  } catch (e) {
    return `Invalid regex: ${(e as Error).message}`;
  }
}
```

**Extension Format Validation:**
```typescript
if (type === "extension") {
  const extensions = pattern.split(",").map((s) => s.trim());
  if (extensions.some((ext) => !ext)) {
    return "Invalid extension format: empty extension found";
  }
  const invalidExt = extensions.find((ext) => {
    const cleaned = ext.startsWith(".") ? ext.slice(1) : ext;
    return cleaned.length === 0 || /[\/\\:*?"<>|]/.test(cleaned);
  });
  if (invalidExt) {
    return `Invalid extension: "${invalidExt}"`;
  }
}
```

### 4.3 Recommended Pattern Restrictions (Future)

| Restriction | Rationale |
|-------------|-----------|
| Minimum pattern length | Prevent overly broad matches |
| Regex complexity limits | Prevent ReDoS attacks |
| Match count preview | Show count before search completes |
| Percentage threshold | Warn if >50% of directory matches |

---

## 5. Audit Trail

### 5.1 Current Implementation

**Operation Results:**
- Successful deletions tracked in `DeleteResult.successful`
- Failed deletions tracked in `DeleteResult.failed`
- Deleted directories tracked in `DeleteResult.deletedDirs`

**Display in Result Modal:**
```tsx
<DeleteResultModal
  result={deleteResult()}
  onClose={() => setDeleteResult(null)}
/>
```

### 5.2 Recommended Audit Enhancements

**Local Audit Log:**

```typescript
interface AuditEntry {
  timestamp: string;
  operation: "delete";
  basePath: string;
  pattern: string;
  patternType: PatternType;
  filesDeleted: string[];
  filesFailed: Array<[string, string]>;
  dirsDeleted: string[];
  totalSize: number;
}

function logDeletion(entry: AuditEntry) {
  const logs = JSON.parse(localStorage.getItem("deletionAuditLog") || "[]");
  logs.push(entry);
  // Keep last 100 entries
  if (logs.length > 100) logs.shift();
  localStorage.setItem("deletionAuditLog", JSON.stringify(logs));
}
```

**Audit Log Contents:**
| Field | Purpose |
|-------|---------|
| Timestamp | When operation occurred |
| Base path | Where files were deleted from |
| Pattern | What pattern was used |
| File list | Exact files affected |
| Errors | What failed and why |
| User | Who performed the action (if multi-user) |

### 5.3 Recovery Reference

The audit log enables:
- Post-mortem analysis of accidental deletions
- Identification of files for recovery from backup
- Pattern for security review

---

## 6. Access Control

### 6.1 Operating System Permissions

The application operates with the permissions of the user running it:

| User Type | Capabilities |
|-----------|--------------|
| Standard user | Can delete own files |
| Administrator | Can delete system files (with warning) |
| Root/SYSTEM | Full access (exercise extreme caution) |

### 6.2 Tauri Security Model

**Capability-Based Permissions:**

Tauri's permission system limits what the application can access:

```json
// tauri.conf.json
{
  "security": {
    "capabilities": [
      {
        "identifier": "file-system",
        "permissions": [
          "fs:allow-read",
          "fs:allow-write",
          "fs:allow-remove"
        ]
      }
    ]
  }
}
```

**CSP (Content Security Policy):**
- Prevents XSS attacks
- Limits script sources
- Restricts resource loading

---

## 7. Input Sanitization

### 7.1 Path Sanitization

**Backend path handling:**
```rust
let path = Path::new(&file_path);
// Path is validated before use
if path.is_dir() {
    fs::remove_dir_all(path)
} else {
    fs::remove_file(path)
}
```

### 7.2 Protection Against Path Traversal

**Considerations:**
- User selects base path via native dialog (trusted source)
- Search only returns files within selected directory
- Paths are absolute, preventing `../` attacks

**Validation:**
```rust
// Ensure file is within base path
let canonical_base = fs::canonicalize(&base_path)?;
let canonical_file = fs::canonicalize(&file_path)?;
if !canonical_file.starts_with(&canonical_base) {
    return Err("File path is outside the search directory".to_string());
}
```

### 7.3 Symlink Handling

| Behavior | Description |
|----------|-------------|
| Follow symlinks | Could delete files outside target directory |
| Don't follow | Only deletes the symlink itself |

**Current behavior:** Symlinks are resolved for metadata but deletion behavior depends on the OS.

**Recommended:** Add explicit symlink handling option.

---

## 8. Data Protection

### 8.1 Permanent Deletion Warning

Users are clearly warned that deletion is permanent:

```tsx
<div class="text-warning font-semibold mb-4">
  ⚠️ This action cannot be undone. Files will be permanently deleted.
</div>
```

### 8.2 No Sensitive Data Leakage

**Prevented:**
- File contents are not read or transmitted
- Only metadata (path, name, size) is used
- No external network requests

**Logging:**
- Paths logged for audit purposes only
- No file contents ever logged
- Logs stored locally only

---

## 9. Recommended Security Enhancements

### 9.1 Short-Term Improvements

| Enhancement | Priority | Effort |
|-------------|----------|--------|
| Symlink warning | High | Low |
| Additional protected paths | High | Low |
| Pattern match preview count | Medium | Medium |
| Percentage threshold warning | Medium | Medium |

### 9.2 Medium-Term Improvements

| Enhancement | Priority | Effort |
|-------------|----------|--------|
| Persistent audit log | High | Medium |
| Undo buffer (temp storage) | High | High |
| Recycle bin integration | Medium | Medium |
| Operation timeout limits | Medium | Low |

### 9.3 Long-Term Improvements

| Enhancement | Priority | Effort |
|-------------|----------|--------|
| Role-based access control | Low | High |
| Remote audit log | Low | High |
| File content hashing | Low | Medium |
| Backup integration | Medium | High |

---

## 10. Security Checklist

### Before Release

- [ ] All protected paths implemented
- [ ] Two-step confirmation working
- [ ] Batch limits enforced
- [ ] Pattern validation complete
- [ ] Error messages don't leak sensitive info
- [ ] Audit log captures all operations

### Ongoing

- [ ] Review audit logs for suspicious patterns
- [ ] Update protected paths list as needed
- [ ] Monitor for new attack vectors
- [ ] Test with various permission levels
- [ ] Verify Tauri security updates applied

---

## 11. Threat Model

### 11.1 Potential Threats

| Threat | Likelihood | Impact | Mitigation |
|--------|------------|--------|------------|
| Accidental bulk deletion | High | High | Confirmation dialogs, warnings |
| System file deletion | Medium | Critical | Protected paths, warnings |
| Malicious pattern injection | Low | High | Input validation |
| Path traversal | Low | High | Path canonicalization |
| Privilege escalation | Low | Critical | OS-level permissions |

### 11.2 Security Boundaries

1. **User Trust Boundary** - User must explicitly select directory and confirm deletion
2. **OS Permission Boundary** - Cannot delete files user doesn't have permission for
3. **Application Sandbox** - Tauri's security model limits capabilities

---

## 12. Incident Response

### If Accidental Deletion Occurs

1. **Stop** - Don't perform any more write operations
2. **Document** - Note what was deleted (check result modal)
3. **Recover** - Use backup or file recovery tools
4. **Review** - Analyze what led to the mistake
5. **Improve** - Update warnings or restrictions as needed

### If Security Vulnerability Found

1. **Report** - Submit through proper channels
2. **Patch** - Develop and test fix
3. **Deploy** - Release update promptly
4. **Notify** - Inform users if data at risk

