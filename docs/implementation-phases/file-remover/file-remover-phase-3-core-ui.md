# File Remover - Phase 3: Core Logic & UI

This phase covers implementing the file list, selection logic, and action buttons.

## Goals
- Implement the file list with match highlighting
- Add file selection functionality
- Create action buttons component
- Implement delete confirmation modal

## Tasks

### 1. Implement FileRemoverRow Component

`src/components/FileRemover/FileRemoverRow.tsx`:

```tsx
import { Component, Show, For } from "solid-js";
import Checkbox from "../ui/Checkbox";
import { FolderIcon, FilesIcon } from "../ui/icons";
import { FileMatchItem } from "./types";
import { formatFileSize } from "./utils";

interface FileRemoverRowProps {
  file: FileMatchItem;
  onToggleSelect: (path: string) => void;
}

/**
 * Renders a single file row with match highlighting
 */
const FileRemoverRow: Component<FileRemoverRowProps> = (props) => {
  // Build highlighted name segments
  const highlightedName = () => {
    const name = props.file.name;
    const ranges = props.file.matchRanges;
    
    if (!ranges || ranges.length === 0) {
      return [{ text: name, isMatch: false }];
    }
    
    const segments: { text: string; isMatch: boolean }[] = [];
    let lastEnd = 0;
    
    for (const [start, end] of ranges) {
      if (start > lastEnd) {
        segments.push({ text: name.slice(lastEnd, start), isMatch: false });
      }
      segments.push({ text: name.slice(start, end), isMatch: true });
      lastEnd = end;
    }
    
    if (lastEnd < name.length) {
      segments.push({ text: name.slice(lastEnd), isMatch: false });
    }
    
    return segments;
  };

  return (
    <div
      class={`flex items-center gap-3 px-4 py-2 hover:bg-base-200 transition-colors ${
        props.file.selected ? "bg-error/5" : ""
      }`}
    >
      <Checkbox
        checked={props.file.selected}
        onChange={() => props.onToggleSelect(props.file.path)}
      />
      
      <div class="flex-shrink-0 text-base-content/50">
        <Show when={props.file.isDirectory} fallback={<FilesIcon size="sm" />}>
          <FolderIcon size="sm" />
        </Show>
      </div>
      
      <div class="flex-1 min-w-0">
        <div class="font-mono text-sm truncate">
          <For each={highlightedName()}>
            {(segment) => (
              <span
                class={segment.isMatch ? "bg-warning/30 text-warning-content rounded px-0.5" : ""}
              >
                {segment.text}
              </span>
            )}
          </For>
        </div>
        <div class="text-xs text-base-content/50 truncate">
          {props.file.path}
        </div>
      </div>
      
      <div class="flex-shrink-0 text-xs text-base-content/50">
        {formatFileSize(props.file.size)}
      </div>
    </div>
  );
};

export default FileRemoverRow;
```

### 2. Implement FileRemoverList Component

`src/components/FileRemover/FileRemoverList.tsx`:

```tsx
import { Component, For, Show, createMemo } from "solid-js";
import { FileMatchItem } from "./types";
import FileRemoverRow from "./FileRemoverRow";
import { formatFileSize } from "./utils";

interface FileRemoverListProps {
  files: FileMatchItem[];
  onToggleSelect: (path: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onInvertSelection: () => void;
  onRemoveFromList: (paths: string[]) => void;
}

const FileRemoverList: Component<FileRemoverListProps> = (props) => {
  const selectedCount = createMemo(() => props.files.filter((f) => f.selected).length);
  const selectedSize = createMemo(() =>
    props.files.filter((f) => f.selected).reduce((sum, f) => sum + f.size, 0)
  );

  return (
    <div class="card bg-base-100 shadow-lg">
      <div class="card-body p-0">
        {/* Header */}
        <div class="flex items-center justify-between px-4 py-3 border-b border-base-300">
          <div class="flex items-center gap-4">
            <span class="font-medium">
              {props.files.length} files found
            </span>
            <span class="text-sm text-base-content/60">
              {selectedCount()} selected ({formatFileSize(selectedSize())})
            </span>
          </div>
          
          <div class="flex gap-2">
            <button
              class="btn btn-xs btn-ghost"
              onClick={props.onSelectAll}
            >
              Select All
            </button>
            <button
              class="btn btn-xs btn-ghost"
              onClick={props.onDeselectAll}
            >
              Deselect All
            </button>
            <button
              class="btn btn-xs btn-ghost"
              onClick={props.onInvertSelection}
            >
              Invert
            </button>
            <Show when={selectedCount() > 0}>
              <button
                class="btn btn-xs btn-ghost text-warning"
                onClick={() => {
                  const selectedPaths = props.files
                    .filter((f) => f.selected)
                    .map((f) => f.path);
                  props.onRemoveFromList(selectedPaths);
                }}
              >
                Remove Selected from List
              </button>
            </Show>
          </div>
        </div>

        {/* File List */}
        <Show
          when={props.files.length > 0}
          fallback={
            <div class="flex flex-col items-center justify-center py-16 text-base-content/50">
              <svg
                class="w-16 h-16 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p>No files found matching the pattern</p>
              <p class="text-sm mt-1">Select a folder and enter a pattern to search</p>
            </div>
          }
        >
          <div class="max-h-[500px] overflow-y-auto divide-y divide-base-200">
            <For each={props.files}>
              {(file) => (
                <FileRemoverRow
                  file={file}
                  onToggleSelect={props.onToggleSelect}
                />
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default FileRemoverList;
```

### 3. Implement ActionButtons Component

`src/components/FileRemover/ActionButtons.tsx`:

```tsx
import { Component, Show } from "solid-js";
import Button from "../ui/Button";
import { FolderOpenIcon, SearchIcon, TrashIcon } from "../ui/icons";

interface ActionButtonsProps {
  basePath: string;
  onSelectFolder: () => void;
  onSearch: () => void;
  onDelete: () => void;
  onClearList: () => void;
  isSearching: boolean;
  selectedCount: number;
  totalCount: number;
  canSearch: boolean;
}

const ActionButtons: Component<ActionButtonsProps> = (props) => {
  return (
    <div class="flex flex-wrap items-center gap-4 my-6">
      {/* Folder Selection */}
      <div class="flex items-center gap-2">
        <Button
          variant="secondary"
          onClick={props.onSelectFolder}
        >
          <FolderOpenIcon size="sm" class="mr-2" />
          Select Folder
        </Button>
        <Show when={props.basePath}>
          <span class="text-sm text-base-content/60 max-w-xs truncate">
            {props.basePath}
          </span>
        </Show>
      </div>

      {/* Search */}
      <Button
        variant="primary"
        onClick={props.onSearch}
        disabled={!props.canSearch}
        loading={props.isSearching}
      >
        <SearchIcon size="sm" class="mr-2" />
        Search
      </Button>

      {/* Spacer */}
      <div class="flex-1" />

      {/* Clear List */}
      <Show when={props.totalCount > 0}>
        <Button
          variant="ghost"
          onClick={props.onClearList}
        >
          Clear List
        </Button>
      </Show>

      {/* Delete */}
      <Button
        variant="error"
        onClick={props.onDelete}
        disabled={props.selectedCount === 0}
      >
        <TrashIcon size="sm" class="mr-2" />
        Delete {props.selectedCount > 0 ? `(${props.selectedCount})` : ""}
      </Button>
    </div>
  );
};

export default ActionButtons;
```

### 4. Implement DeleteConfirmModal Component

`src/components/FileRemover/DeleteConfirmModal.tsx`:

```tsx
import { Component, For, Show } from "solid-js";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { WarningIcon, TrashIcon } from "../ui/icons";
import { FileMatchItem, DeleteProgress } from "./types";
import { formatFileSize } from "./utils";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  files: FileMatchItem[];
  isDeleting: boolean;
  dangerWarning?: string;
  progress: DeleteProgress | null;
  compactPreview?: boolean;
}

const DeleteConfirmModal: Component<DeleteConfirmModalProps> = (props) => {
  const totalSize = () => props.files.reduce((sum, f) => sum + f.size, 0);
  const shouldCompactPreview = () => props.compactPreview ?? false;
  const visibleFiles = () =>
    shouldCompactPreview() ? props.files.slice(0, 10) : props.files;

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose}>
      <div class="p-6 max-w-lg">
        {/* Warning Header */}
        <div class="flex items-center gap-3 mb-4">
          <div class="p-3 rounded-full bg-error/10">
            <WarningIcon size="lg" class="text-error" />
          </div>
          <div>
            <h3 class="text-lg font-bold text-base-content">
              Confirm Deletion
            </h3>
            <p class="text-sm text-base-content/60">
              This action cannot be undone
            </p>
          </div>
        </div>

        {/* Standard Warning Message */}
        <div class="alert alert-warning mb-4">
          <WarningIcon size="sm" />
          <span>
            You are about to permanently delete <strong>{props.files.length}</strong> files
            ({formatFileSize(totalSize())}) from your disk.
          </span>
        </div>

        {/* File Preview */}
        <div class="bg-base-200 rounded-lg p-3 mb-4 max-h-48 overflow-y-auto">
          <p class="text-xs text-base-content/60 mb-2">Files to be deleted:</p>
          <div class="space-y-1">
            <For each={visibleFiles()}>
              {(file) => (
                <div class="text-sm font-mono truncate text-base-content/80">
                  {file.path}
                </div>
              )}
            </For>
            <Show when={shouldCompactPreview() && props.files.length > 10}>
              <div class="text-sm text-base-content/50 italic">
                ... and {props.files.length - 10} more files
              </div>
            </Show>
          </div>
        </div>

        {/* Actions */}
        <div class="flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={props.onClose}
            disabled={props.isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="error"
            onClick={props.onConfirm}
            loading={props.isDeleting}
          >
            <TrashIcon size="sm" class="mr-2" />
            Delete Files
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteConfirmModal;
```

> **Preview sizing:** By default the modal now renders the complete file list inside the scrollable container so reviewers can spot mistakes before confirming. Set `compactPreview` to `true` when you need the original summarized view (first 10 entries plus the `... and N more files` note), e.g. for extremely large selections or constrained layouts.

### 5. Create Utility Functions

`src/components/FileRemover/utils.ts`:

```typescript
/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  
  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

/**
 * Build highlighted segments from match ranges
 */
export function buildHighlightedSegments(
  text: string,
  ranges: [number, number][]
): { text: string; isMatch: boolean }[] {
  if (!ranges || ranges.length === 0) {
    return [{ text, isMatch: false }];
  }

  const segments: { text: string; isMatch: boolean }[] = [];
  let lastEnd = 0;

  // Sort ranges by start position
  const sortedRanges = [...ranges].sort((a, b) => a[0] - b[0]);

  for (const [start, end] of sortedRanges) {
    if (start > lastEnd) {
      segments.push({ text: text.slice(lastEnd, start), isMatch: false });
    }
    segments.push({ text: text.slice(start, end), isMatch: true });
    lastEnd = end;
  }

  if (lastEnd < text.length) {
    segments.push({ text: text.slice(lastEnd), isMatch: false });
  }

  return segments;
}
```

### 6. Update Main Component with Full Integration

Update `src/components/FileRemover/index.tsx` to integrate all components:

```tsx
import { createSignal, createMemo, Show } from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import Header from "./Header";
import PatternControls, { PatternType } from "./PatternControls";
import ActionButtons from "./ActionButtons";
import FileRemoverList from "./FileRemoverList";
import DeleteConfirmModal from "./DeleteConfirmModal";
import { FileMatchItem, DeleteResult } from "./types";

export default function FileRemover() {
  // Pattern state
  const [pattern, setPattern] = createSignal("");
  const [patternType, setPatternType] = createSignal<PatternType>("simple");
  const [caseSensitive, setCaseSensitive] = createSignal(false);
  const [includeSubdirs, setIncludeSubdirs] = createSignal(true);
  const [deleteEmptyDirs, setDeleteEmptyDirs] = createSignal(false);
  const [patternError, setPatternError] = createSignal<string | undefined>();

  // File state
  const [files, setFiles] = createSignal<FileMatchItem[]>([]);
  const [basePath, setBasePath] = createSignal<string>("");
  const [isSearching, setIsSearching] = createSignal(false);
  const [isDeleting, setIsDeleting] = createSignal(false);

  // Modal state
  const [showDeleteModal, setShowDeleteModal] = createSignal(false);

  // Computed
  const selectedFiles = createMemo(() => files().filter((f) => f.selected));
  const selectedCount = createMemo(() => selectedFiles().length);
  const canSearch = createMemo(() => !!basePath() && !!pattern().trim());

  // Actions
  async function selectFolder() {
    const selected = await open({
      multiple: false,
      directory: true,
    });

    if (selected && typeof selected === "string") {
      setBasePath(selected);
    }
  }

  async function searchFiles() {
    if (!canSearch()) return;

    setIsSearching(true);
    setPatternError(undefined);

    try {
      const results = await invoke<any[]>("search_files_by_pattern", {
        basePath: basePath(),
        pattern: pattern(),
        patternType: patternType(),
        includeSubdirs: includeSubdirs(),
        caseSensitive: caseSensitive(),
      });

      setFiles(
        results.map((r) => ({
          path: r.path,
          name: r.name,
          matchRanges: r.match_ranges,
          size: r.size,
          isDirectory: r.is_directory,
          selected: true,
        }))
      );
    } catch (error) {
      setPatternError(String(error));
      setFiles([]);
    } finally {
      setIsSearching(false);
    }
  }

  function toggleSelect(path: string) {
    setFiles((prev) =>
      prev.map((f) =>
        f.path === path ? { ...f, selected: !f.selected } : f
      )
    );
  }

  function selectAll() {
    setFiles((prev) => prev.map((f) => ({ ...f, selected: true })));
  }

  function deselectAll() {
    setFiles((prev) => prev.map((f) => ({ ...f, selected: false })));
  }

  function invertSelection() {
    setFiles((prev) => prev.map((f) => ({ ...f, selected: !f.selected })));
  }

  function removeFromList(paths: string[]) {
    const pathSet = new Set(paths);
    setFiles((prev) => prev.filter((f) => !pathSet.has(f.path)));
  }

  function clearList() {
    setFiles([]);
  }

  async function handleDelete() {
    const filesToDelete = selectedFiles().map((f) => f.path);
    if (filesToDelete.length === 0) return;

    setIsDeleting(true);

    try {
      const result = await invoke<DeleteResult>("batch_delete", {
        files: filesToDelete,
        deleteEmptyDirs: deleteEmptyDirs(),
      });

      // Remove successfully deleted files from the list
      const successSet = new Set(result.successful);
      setFiles((prev) => prev.filter((f) => !successSet.has(f.path)));

      // Show results
      if (result.failed.length > 0) {
        const failedMsg = result.failed
          .slice(0, 3)
          .map(([path, err]) => `${path}: ${err}`)
          .join("\n");
        alert(
          `Deleted ${result.successful.length} files.\n` +
          `Failed to delete ${result.failed.length} files:\n${failedMsg}`
        );
      }

      setShowDeleteModal(false);
    } catch (error) {
      alert(`Delete failed: ${error}`);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div class="min-h-screen bg-base-300 p-8">
      <div class="max-w-7xl mx-auto">
        <Header />

        <div class="grid grid-cols-1 gap-6 mt-4">
          <PatternControls
            pattern={pattern()}
            setPattern={setPattern}
            patternType={patternType()}
            setPatternType={setPatternType}
            caseSensitive={caseSensitive()}
            setCaseSensitive={setCaseSensitive}
            includeSubdirs={includeSubdirs()}
            setIncludeSubdirs={setIncludeSubdirs}
            deleteEmptyDirs={deleteEmptyDirs()}
            setDeleteEmptyDirs={setDeleteEmptyDirs}
            patternError={patternError()}
          />

          <ActionButtons
            basePath={basePath()}
            onSelectFolder={selectFolder}
            onSearch={searchFiles}
            onDelete={() => setShowDeleteModal(true)}
            onClearList={clearList}
            isSearching={isSearching()}
            selectedCount={selectedCount()}
            totalCount={files().length}
            canSearch={canSearch()}
          />

          <FileRemoverList
            files={files()}
            onToggleSelect={toggleSelect}
            onSelectAll={selectAll}
            onDeselectAll={deselectAll}
            onInvertSelection={invertSelection}
            onRemoveFromList={removeFromList}
          />
        </div>

        <DeleteConfirmModal
          isOpen={showDeleteModal()}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          files={selectedFiles()}
          isDeleting={isDeleting()}
        />
      </div>
    </div>
  );
}
```

## Testing Requirements

### FileRemoverList Tests

```tsx
describe("FileRemoverList", () => {
  const mockFiles: FileMatchItem[] = [
    {
      path: "/test/file1.txt",
      name: "file1.txt",
      matchRanges: [[0, 4]],
      size: 1024,
      isDirectory: false,
      selected: true,
    },
    {
      path: "/test/file2.log",
      name: "file2.log",
      matchRanges: [[0, 4]],
      size: 2048,
      isDirectory: false,
      selected: false,
    },
  ];

  it("renders file count correctly", () => {
    render(() => (
      <FileRemoverList
        files={mockFiles}
        onToggleSelect={vi.fn()}
        onSelectAll={vi.fn()}
        onDeselectAll={vi.fn()}
        onInvertSelection={vi.fn()}
        onRemoveFromList={vi.fn()}
      />
    ));
    
    expect(screen.getByText(/2 files found/)).toBeInTheDocument();
  });

  it("shows selected count and size", () => {
    render(() => (
      <FileRemoverList
        files={mockFiles}
        onToggleSelect={vi.fn()}
        onSelectAll={vi.fn()}
        onDeselectAll={vi.fn()}
        onInvertSelection={vi.fn()}
        onRemoveFromList={vi.fn()}
      />
    ));
    
    expect(screen.getByText(/1 selected/)).toBeInTheDocument();
  });

  it("calls onToggleSelect when checkbox clicked", async () => {
    const onToggleSelect = vi.fn();
    render(() => (
      <FileRemoverList
        files={mockFiles}
        onToggleSelect={onToggleSelect}
        onSelectAll={vi.fn()}
        onDeselectAll={vi.fn()}
        onInvertSelection={vi.fn()}
        onRemoveFromList={vi.fn()}
      />
    ));
    
    const checkboxes = screen.getAllByRole("checkbox");
    await fireEvent.click(checkboxes[0]);
    expect(onToggleSelect).toHaveBeenCalledWith("/test/file1.txt");
  });
});
```

### DeleteConfirmModal Tests

```tsx
describe("DeleteConfirmModal", () => {
  const mockFiles: FileMatchItem[] = [
    {
      path: "/test/file.txt",
      name: "file.txt",
      matchRanges: [],
      size: 1024,
      isDirectory: false,
      selected: true,
    },
  ];

  it("shows file count in warning", () => {
    render(() => (
      <DeleteConfirmModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        files={mockFiles}
        isDeleting={false}
      />
    ));
    
    expect(screen.getByText(/1 files/)).toBeInTheDocument();
  });

  it("calls onConfirm when delete button clicked", async () => {
    const onConfirm = vi.fn();
    render(() => (
      <DeleteConfirmModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        files={mockFiles}
        isDeleting={false}
      />
    ));
    
    await fireEvent.click(screen.getByText("Delete Files"));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("disables buttons when deleting", () => {
    render(() => (
      <DeleteConfirmModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        files={mockFiles}
        isDeleting={true}
      />
    ));
    
    expect(screen.getByText("Cancel")).toBeDisabled();
  });
});
```

## Acceptance Criteria

- [ ] File list displays all matched files
- [ ] Match highlighting works correctly
- [ ] File selection toggles work (individual, all, none, invert)
- [ ] Remove from list removes files without deleting
- [ ] Clear list empties the file list
- [ ] Delete button shows selected count
- [ ] Delete confirmation modal displays warning and file list
- [ ] Delete confirmation requires explicit action
- [ ] All UI components are responsive and accessible
- [ ] All tests pass

