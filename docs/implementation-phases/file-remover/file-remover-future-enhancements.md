# File Remover - Future Enhancements

This document outlines planned and potential future enhancements for the File Remover tool, organized by priority and complexity.

## Overview

The current File Remover provides core functionality for pattern-based file deletion. These enhancements will improve safety, usability, and capabilities while maintaining the tool's simplicity.

---

## 1. Recycle Bin Support

### Description

Move deleted files to the system recycle bin/trash instead of permanent deletion, allowing users to recover accidentally deleted files.

### Priority: **High**

### Implementation Details

**Backend Changes (`remove.rs`):**

```rust
use trash;

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct DeleteOptions {
    pub use_trash: bool,
    pub delete_empty_dirs: bool,
}

#[tauri::command]
pub fn batch_delete(
    files: Vec<String>,
    options: DeleteOptions,
) -> Result<DeleteResult, String> {
    let mut successful = Vec::new();
    let mut failed = Vec::new();

    for file_path in files {
        let result = if options.use_trash {
            trash::delete(&file_path)
        } else {
            let path = Path::new(&file_path);
            if path.is_dir() {
                fs::remove_dir_all(path)
            } else {
                fs::remove_file(path)
            }
        };

        match result {
            Ok(_) => successful.push(file_path),
            Err(e) => failed.push((file_path, e.to_string())),
        }
    }

    // ... rest of implementation
}
```

**Frontend Changes:**

```typescript
// New option in PatternControls
const [useTrash, setUseTrash] = createSignal(true); // Default to safe option

// Option toggle
<Checkbox
  label="Move to trash (recoverable)"
  checked={useTrash()}
  onChange={setUseTrash}
/>

// Warning when permanently deleting
<Show when={!useTrash()}>
  <div class="alert alert-warning">
    Files will be permanently deleted and cannot be recovered.
  </div>
</Show>
```

**Dependencies:**
```toml
# Cargo.toml
[dependencies]
trash = "3.0"
```

**UI Changes:**
- Add toggle: "Move to trash" vs "Permanently delete"
- Default to trash for safety
- Clear warning when permanent deletion selected
- Update delete button text: "Move to Trash" / "Delete Permanently"

### Effort: Medium

### Benefits:
- Recoverable deletions
- Matches user expectations from native file managers
- Significantly reduces risk of data loss

---

## 2. Undo Functionality

### Description

Keep recently deleted files in a temporary location for a configurable period, allowing quick recovery without relying on system trash.

### Priority: **High**

### Implementation Details

**Backend:**

```rust
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Serialize, Deserialize, Debug)]
pub struct UndoEntry {
    pub original_path: String,
    pub temp_path: String,
    pub deleted_at: u64,
    pub size: u64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UndoBuffer {
    pub entries: Vec<UndoEntry>,
    pub max_size_bytes: u64,
    pub max_age_seconds: u64,
}

#[tauri::command]
pub fn delete_with_undo(
    files: Vec<String>,
    undo_dir: String,
) -> Result<DeleteResult, String> {
    let temp_base = Path::new(&undo_dir);
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    for file_path in &files {
        let temp_path = temp_base.join(format!("{}_{}", timestamp, file_name));
        fs::rename(&file_path, &temp_path)?;
        // Store mapping for undo
    }

    Ok(result)
}

#[tauri::command]
pub fn undo_delete(entries: Vec<UndoEntry>) -> Result<UndoResult, String> {
    for entry in entries {
        fs::rename(&entry.temp_path, &entry.original_path)?;
    }
    Ok(UndoResult { restored: entries.len() })
}

#[tauri::command]
pub fn cleanup_undo_buffer(
    undo_dir: String,
    max_age_seconds: u64,
) -> Result<CleanupResult, String> {
    // Remove entries older than max_age
}
```

**Frontend:**

```typescript
// Undo state
const [undoBuffer, setUndoBuffer] = createSignal<UndoEntry[]>([]);

// After deletion
function handleDeleteComplete(result: DeleteResult) {
  // Store undo information
  setUndoBuffer(result.undoEntries);
  
  // Show undo notification
  showNotification({
    message: `Deleted ${result.successful.length} files`,
    action: {
      label: "Undo",
      onClick: handleUndo,
    },
    duration: 30000, // 30 seconds to undo
  });
}

// Undo action
async function handleUndo() {
  const result = await invoke("undo_delete", { entries: undoBuffer() });
  showNotification({ message: `Restored ${result.restored} files` });
  setUndoBuffer([]);
}
```

**Configuration:**
| Setting | Default | Description |
|---------|---------|-------------|
| `undoBufferMaxSize` | 1 GB | Maximum storage for undo |
| `undoRetentionPeriod` | 24 hours | How long to keep undoable files |
| `autoCleanup` | true | Automatically cleanup old entries |

### Effort: High

### Benefits:
- Quick recovery from mistakes
- No dependency on system trash
- Configurable retention period

---

## 3. Save Patterns

### Description

Allow users to save, name, and quickly recall frequently used deletion patterns.

### Priority: **Medium**

### Implementation Details

**Data Structure:**

```typescript
interface SavedPattern {
  id: string;
  name: string;
  pattern: string;
  patternType: PatternType;
  caseSensitive: boolean;
  includeSubdirs: boolean;
  deleteEmptyDirs: boolean;
  createdAt: number;
  lastUsedAt: number;
  useCount: number;
}

interface PatternLibrary {
  patterns: SavedPattern[];
  version: number;
}
```

**Storage:**

```typescript
const PATTERNS_STORAGE_KEY = "fileRemover.savedPatterns";

function savePattern(pattern: SavedPattern) {
  const library = loadPatternLibrary();
  library.patterns.push(pattern);
  localStorage.setItem(PATTERNS_STORAGE_KEY, JSON.stringify(library));
}

function loadPatternLibrary(): PatternLibrary {
  const stored = localStorage.getItem(PATTERNS_STORAGE_KEY);
  return stored ? JSON.parse(stored) : { patterns: [], version: 1 };
}
```

**UI Components:**

```tsx
// SavePatternModal.tsx
function SavePatternModal(props: SavePatternModalProps) {
  const [name, setName] = createSignal("");
  
  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose}>
      <h3 class="text-lg font-bold">Save Pattern</h3>
      <input
        class="input input-bordered w-full"
        placeholder="Pattern name (e.g., 'Clean temp files')"
        value={name()}
        onInput={(e) => setName(e.target.value)}
      />
      <div class="modal-action">
        <button class="btn" onClick={props.onClose}>Cancel</button>
        <button 
          class="btn btn-primary"
          onClick={() => props.onSave({ name: name(), ...currentPattern() })}
        >
          Save
        </button>
      </div>
    </Modal>
  );
}

// PatternDropdown.tsx
function PatternDropdown(props: PatternDropdownProps) {
  const patterns = createMemo(() => loadPatternLibrary().patterns);
  
  return (
    <div class="dropdown dropdown-bottom">
      <label tabIndex={0} class="btn btn-ghost btn-sm">
        <BookmarkIcon /> Saved Patterns
      </label>
      <ul class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
        <For each={patterns()}>
          {(pattern) => (
            <li>
              <button onClick={() => props.onSelect(pattern)}>
                {pattern.name}
                <span class="badge badge-sm">{pattern.patternType}</span>
              </button>
            </li>
          )}
        </For>
      </ul>
    </div>
  );
}
```

**Built-in Patterns:**

| Name | Pattern | Type | Description |
|------|---------|------|-------------|
| Temporary Files | `.tmp, .temp, ~` | Extension | Common temp files |
| Log Files | `.log` | Extension | Log files |
| Backup Files | `.bak, .backup, .old` | Extension | Backup files |
| macOS Junk | `.DS_Store, ._*` | Simple | macOS metadata |
| Windows Junk | `Thumbs.db, desktop.ini` | Simple | Windows metadata |
| Node Modules | `node_modules` | Simple | Node.js dependencies |
| Cache Files | `\.cache$` | Regex | Cache directories |

### Effort: Medium

### Benefits:
- Faster workflow for repetitive tasks
- Reduces errors from retyping patterns
- Shareable (export/import)

---

## 4. Dry Run Mode

### Description

Preview exactly what would be deleted without actually removing any files.

### Priority: **Medium**

### Implementation Details

**Current flow enhancement:**

The current implementation already provides a preview through the search results. This enhancement would add:

1. **Simulated deletion results:**

```typescript
interface DryRunResult {
  wouldDelete: FileMatchItem[];
  wouldFail: Array<{ file: FileMatchItem; reason: string }>;
  wouldDeleteDirs: string[];
  estimatedDuration: number;
}

async function performDryRun(files: FileMatchItem[]): Promise<DryRunResult> {
  const result: DryRunResult = {
    wouldDelete: [],
    wouldFail: [],
    wouldDeleteDirs: [],
    estimatedDuration: 0,
  };

  for (const file of files) {
    // Check permissions
    try {
      await invoke("check_delete_permission", { path: file.path });
      result.wouldDelete.push(file);
    } catch (e) {
      result.wouldFail.push({ file, reason: String(e) });
    }
  }

  // Estimate duration based on file count
  result.estimatedDuration = files.length * 10; // ~10ms per file

  return result;
}
```

2. **Backend permission check:**

```rust
#[tauri::command]
pub fn check_delete_permission(path: String) -> Result<(), String> {
    let path = Path::new(&path);
    
    // Check if file exists
    if !path.exists() {
        return Err("File does not exist".to_string());
    }
    
    // Check write permission on parent directory
    if let Some(parent) = path.parent() {
        let metadata = fs::metadata(parent)
            .map_err(|e| e.to_string())?;
        
        if metadata.permissions().readonly() {
            return Err("Parent directory is read-only".to_string());
        }
    }
    
    // Check if file is writable
    let metadata = fs::metadata(path).map_err(|e| e.to_string())?;
    if metadata.permissions().readonly() {
        return Err("File is read-only".to_string());
    }
    
    Ok(())
}
```

3. **UI Indicator:**

```tsx
// Dry run mode toggle
<Checkbox
  label="Dry run (preview only)"
  checked={dryRunMode()}
  onChange={setDryRunMode}
/>

// Results display
<Show when={dryRunResult()}>
  <div class="alert alert-info">
    <h4>Dry Run Results</h4>
    <p>{dryRunResult().wouldDelete.length} files would be deleted</p>
    <p>{dryRunResult().wouldFail.length} files would fail</p>
    <p>Estimated time: {formatDuration(dryRunResult().estimatedDuration)}</p>
  </div>
</Show>
```

### Effort: Low

### Benefits:
- Test patterns safely
- Identify permission issues before attempting deletion
- Build user confidence

---

## 5. Size Filters

### Description

Filter matched files by minimum and/or maximum file size.

### Priority: **Medium**

### Implementation Details

**Filter State:**

```typescript
interface SizeFilter {
  enabled: boolean;
  minSize: number | null; // bytes
  maxSize: number | null; // bytes
  minUnit: SizeUnit;
  maxUnit: SizeUnit;
}

type SizeUnit = "B" | "KB" | "MB" | "GB";

const SIZE_MULTIPLIERS: Record<SizeUnit, number> = {
  B: 1,
  KB: 1024,
  MB: 1024 * 1024,
  GB: 1024 * 1024 * 1024,
};
```

**Backend Filter:**

```rust
#[derive(Serialize, Deserialize, Debug)]
pub struct SizeFilter {
    pub min_size: Option<u64>,
    pub max_size: Option<u64>,
}

#[tauri::command]
pub fn search_files_by_pattern(
    base_path: String,
    pattern: String,
    pattern_type: PatternType,
    include_subdirs: bool,
    case_sensitive: bool,
    size_filter: Option<SizeFilter>,
) -> Result<Vec<FileMatchResult>, String> {
    // ... existing search logic ...

    // Apply size filter
    if let Some(filter) = &size_filter {
        if let Some(min) = filter.min_size {
            if metadata.len() < min {
                continue;
            }
        }
        if let Some(max) = filter.max_size {
            if metadata.len() > max {
                continue;
            }
        }
    }

    // ... rest of implementation
}
```

**UI Component:**

```tsx
// SizeFilterControls.tsx
function SizeFilterControls(props: SizeFilterProps) {
  return (
    <div class="flex gap-4 items-center">
      <Checkbox
        label="Filter by size"
        checked={props.filter.enabled}
        onChange={(enabled) => props.onChange({ ...props.filter, enabled })}
      />
      
      <Show when={props.filter.enabled}>
        <div class="flex gap-2 items-center">
          <span>Min:</span>
          <input
            type="number"
            class="input input-bordered input-sm w-20"
            value={props.filter.minSize ?? ""}
            onInput={(e) => props.onChange({ 
              ...props.filter, 
              minSize: e.target.value ? parseInt(e.target.value) : null 
            })}
          />
          <select 
            class="select select-bordered select-sm"
            value={props.filter.minUnit}
            onChange={(e) => props.onChange({ 
              ...props.filter, 
              minUnit: e.target.value as SizeUnit 
            })}
          >
            <option value="B">B</option>
            <option value="KB">KB</option>
            <option value="MB">MB</option>
            <option value="GB">GB</option>
          </select>
        </div>
        
        <div class="flex gap-2 items-center">
          <span>Max:</span>
          <input
            type="number"
            class="input input-bordered input-sm w-20"
            value={props.filter.maxSize ?? ""}
            onInput={(e) => props.onChange({ 
              ...props.filter, 
              maxSize: e.target.value ? parseInt(e.target.value) : null 
            })}
          />
          <select 
            class="select select-bordered select-sm"
            value={props.filter.maxUnit}
            onChange={(e) => props.onChange({ 
              ...props.filter, 
              maxUnit: e.target.value as SizeUnit 
            })}
          >
            <option value="B">B</option>
            <option value="KB">KB</option>
            <option value="MB">MB</option>
            <option value="GB">GB</option>
          </select>
        </div>
      </Show>
    </div>
  );
}
```

**Common Presets:**

| Name | Min Size | Max Size | Use Case |
|------|----------|----------|----------|
| Small Files | - | 1 KB | Find tiny/empty files |
| Large Files | 100 MB | - | Find space hogs |
| Medium Files | 1 MB | 100 MB | Typical documents |
| Empty Files | 0 B | 0 B | Zero-byte files |

### Effort: Medium

### Benefits:
- Target specific file sizes for cleanup
- Find large files consuming disk space
- Remove empty/stub files

---

## 6. Date Filters

### Description

Filter matched files by modification, creation, or access date.

### Priority: **Medium**

### Implementation Details

**Filter Types:**

```typescript
interface DateFilter {
  enabled: boolean;
  dateType: "modified" | "created" | "accessed";
  comparison: "before" | "after" | "between" | "older_than" | "newer_than";
  date1: Date | null;
  date2: Date | null; // For "between"
  relativeDays: number | null; // For "older_than" / "newer_than"
}
```

**Backend:**

```rust
#[derive(Serialize, Deserialize, Debug)]
pub struct DateFilter {
    pub date_type: DateType,
    pub min_date: Option<u64>, // Unix timestamp
    pub max_date: Option<u64>,
}

#[derive(Serialize, Deserialize, Debug)]
pub enum DateType {
    Modified,
    Created,
    Accessed,
}

// In search function:
if let Some(filter) = &date_filter {
    let file_time = match filter.date_type {
        DateType::Modified => metadata.modified()?,
        DateType::Created => metadata.created()?,
        DateType::Accessed => metadata.accessed()?,
    };
    
    let timestamp = file_time
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    
    if let Some(min) = filter.min_date {
        if timestamp < min { continue; }
    }
    if let Some(max) = filter.max_date {
        if timestamp > max { continue; }
    }
}
```

**UI Component:**

```tsx
function DateFilterControls(props: DateFilterProps) {
  return (
    <div class="flex gap-4 items-center flex-wrap">
      <Checkbox
        label="Filter by date"
        checked={props.filter.enabled}
        onChange={(enabled) => props.onChange({ ...props.filter, enabled })}
      />
      
      <Show when={props.filter.enabled}>
        <select 
          class="select select-bordered select-sm"
          value={props.filter.dateType}
          onChange={(e) => props.onChange({ 
            ...props.filter, 
            dateType: e.target.value as DateType 
          })}
        >
          <option value="modified">Modified</option>
          <option value="created">Created</option>
          <option value="accessed">Accessed</option>
        </select>
        
        <select 
          class="select select-bordered select-sm"
          value={props.filter.comparison}
          onChange={(e) => props.onChange({ 
            ...props.filter, 
            comparison: e.target.value as Comparison 
          })}
        >
          <option value="older_than">Older than</option>
          <option value="newer_than">Newer than</option>
          <option value="before">Before date</option>
          <option value="after">After date</option>
          <option value="between">Between dates</option>
        </select>
        
        <Show when={["older_than", "newer_than"].includes(props.filter.comparison)}>
          <input
            type="number"
            class="input input-bordered input-sm w-20"
            value={props.filter.relativeDays ?? ""}
            onInput={(e) => props.onChange({ 
              ...props.filter, 
              relativeDays: parseInt(e.target.value) 
            })}
          />
          <span>days</span>
        </Show>
        
        <Show when={["before", "after", "between"].includes(props.filter.comparison)}>
          <input
            type="date"
            class="input input-bordered input-sm"
            value={formatDate(props.filter.date1)}
            onInput={(e) => props.onChange({ 
              ...props.filter, 
              date1: new Date(e.target.value) 
            })}
          />
        </Show>
        
        <Show when={props.filter.comparison === "between"}>
          <span>to</span>
          <input
            type="date"
            class="input input-bordered input-sm"
            value={formatDate(props.filter.date2)}
            onInput={(e) => props.onChange({ 
              ...props.filter, 
              date2: new Date(e.target.value) 
            })}
          />
        </Show>
      </Show>
    </div>
  );
}
```

**Quick Presets:**

| Name | Filter | Use Case |
|------|--------|----------|
| Last 7 days | Modified > 7 days ago | Recent files |
| Last 30 days | Modified > 30 days ago | Recent files |
| Older than 1 year | Modified < 1 year ago | Stale files |
| Never accessed | Accessed < 1 year ago | Unused files |

### Effort: Medium

### Benefits:
- Clean up old files
- Find recently modified files
- Identify unused files

---

## 7. Export File List

### Description

Export the list of matched files to CSV, JSON, or plain text for external processing or documentation.

### Priority: **Low**

### Implementation Details

**Export Formats:**

```typescript
type ExportFormat = "csv" | "json" | "txt";

interface ExportOptions {
  format: ExportFormat;
  includeSize: boolean;
  includeDate: boolean;
  includePath: boolean;
  includeMatchInfo: boolean;
  selectedOnly: boolean;
}
```

**Export Functions:**

```typescript
function exportToCSV(files: FileMatchItem[], options: ExportOptions): string {
  const headers = ["Name"];
  if (options.includePath) headers.push("Path");
  if (options.includeSize) headers.push("Size (bytes)");
  if (options.includeDate) headers.push("Type");
  
  const rows = files.map(file => {
    const row = [file.name];
    if (options.includePath) row.push(file.path);
    if (options.includeSize) row.push(String(file.size));
    if (options.includeDate) row.push(file.isDirectory ? "Directory" : "File");
    return row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",");
  });
  
  return [headers.join(","), ...rows].join("\n");
}

function exportToJSON(files: FileMatchItem[], options: ExportOptions): string {
  const data = files.map(file => {
    const item: any = { name: file.name };
    if (options.includePath) item.path = file.path;
    if (options.includeSize) item.size = file.size;
    if (options.includeMatchInfo) item.matchRanges = file.matchRanges;
    return item;
  });
  
  return JSON.stringify(data, null, 2);
}

function exportToText(files: FileMatchItem[], options: ExportOptions): string {
  return files.map(file => {
    if (options.includePath) {
      return file.path;
    }
    return file.name;
  }).join("\n");
}
```

**UI:**

```tsx
function ExportButton(props: { files: FileMatchItem[] }) {
  const [showModal, setShowModal] = createSignal(false);
  
  async function handleExport(format: ExportFormat, options: ExportOptions) {
    const content = format === "csv" 
      ? exportToCSV(props.files, options)
      : format === "json"
      ? exportToJSON(props.files, options)
      : exportToText(props.files, options);
    
    const savePath = await save({
      filters: [{
        name: format.toUpperCase(),
        extensions: [format],
      }],
    });
    
    if (savePath) {
      await writeTextFile(savePath, content);
    }
  }
  
  return (
    <>
      <button class="btn btn-sm btn-ghost" onClick={() => setShowModal(true)}>
        <ExportIcon /> Export List
      </button>
      
      <ExportModal
        isOpen={showModal()}
        onClose={() => setShowModal(false)}
        onExport={handleExport}
        fileCount={props.files.length}
      />
    </>
  );
}
```

### Effort: Low

### Benefits:
- Document what was deleted
- Integration with other tools
- Audit trail backup

---

## 8. Additional Future Enhancements

### 8.1 Content Search

Search within file contents, not just names.

```rust
#[tauri::command]
pub fn search_file_contents(
    base_path: String,
    content_pattern: String,
    file_pattern: Option<String>,
    case_sensitive: bool,
) -> Result<Vec<ContentMatchResult>, String>
```

**Effort:** High | **Priority:** Low

### 8.2 Duplicate File Detection

Find and delete duplicate files based on content hash.

```rust
use sha2::{Sha256, Digest};

fn compute_file_hash(path: &Path) -> Result<String, String> {
    let mut hasher = Sha256::new();
    let mut file = File::open(path).map_err(|e| e.to_string())?;
    std::io::copy(&mut file, &mut hasher).map_err(|e| e.to_string())?;
    Ok(format!("{:x}", hasher.finalize()))
}
```

**Effort:** High | **Priority:** Low

### 8.3 Scheduled Cleanup

Set up automatic cleanup rules that run on a schedule.

**Effort:** High | **Priority:** Low

### 8.4 Cloud Storage Support

Support for deleting files from cloud storage (Google Drive, Dropbox, etc.).

**Effort:** Very High | **Priority:** Very Low

### 8.5 Network Path Support

Support UNC paths and network drives on Windows.

**Effort:** Medium | **Priority:** Low

### 8.6 Symbolic Link Handling

Explicit options for how to handle symbolic links:
- Delete link only
- Delete link and target
- Skip symbolic links

**Effort:** Low | **Priority:** Medium

### 8.7 File Type Icons

Display appropriate icons based on file type.

```tsx
function FileTypeIcon(props: { name: string; isDirectory: boolean }) {
  const extension = props.name.split('.').pop()?.toLowerCase();
  
  const iconMap: Record<string, Component> = {
    pdf: PdfIcon,
    doc: WordIcon,
    docx: WordIcon,
    xls: ExcelIcon,
    // ... more mappings
  };
  
  if (props.isDirectory) return <FolderIcon />;
  return iconMap[extension] ?? <FileIcon />;
}
```

**Effort:** Low | **Priority:** Low

### 8.8 Batch Operations Import

Import a list of files to delete from external source.

```typescript
async function importFileList(format: "csv" | "json" | "txt"): Promise<string[]> {
  const filePath = await open({
    filters: [{ name: "File List", extensions: [format] }],
  });
  
  if (!filePath) return [];
  
  const content = await readTextFile(filePath as string);
  
  switch (format) {
    case "json":
      return JSON.parse(content);
    case "csv":
      return parseCSV(content).map(row => row[0]);
    case "txt":
      return content.split("\n").filter(line => line.trim());
  }
}
```

**Effort:** Low | **Priority:** Low

---

## 9. Implementation Roadmap

### Phase 1: Safety Improvements (Next Release)
1. ✅ Core functionality complete
2. 🔲 Recycle bin support
3. 🔲 Improved path protection

### Phase 2: Usability Enhancements
4. 🔲 Save patterns
5. 🔲 Dry run mode
6. 🔲 Export file list

### Phase 3: Advanced Filtering
7. 🔲 Size filters
8. 🔲 Date filters
9. 🔲 Symbolic link handling

### Phase 4: Recovery Features
10. 🔲 Undo functionality
11. 🔲 Audit log persistence

### Phase 5: Advanced Features
12. 🔲 Content search
13. 🔲 Duplicate detection
14. 🔲 Scheduled cleanup

---

## 10. Contributing

When implementing new features:

1. **Update types** in `types.ts`
2. **Add tests** for new functionality
3. **Update documentation** in this file
4. **Follow existing patterns** for consistency
5. **Consider accessibility** in UI changes
6. **Test on all platforms** (Linux, Windows, macOS)

