# File Remover - Phase 2: Frontend Setup

This phase covers the basic frontend structure and component scaffolding.

## Goals
- Create the component file structure
- Implement the PatternControls component
- Set up folder selection integration

## Tasks

### 1. Create Component File Structure

```
src/components/FileRemover/
├── index.tsx               # Main container
├── Header.tsx              # Tool header
├── PatternControls.tsx     # Pattern input and options
├── PatternControls.test.tsx
├── FileRemoverList.tsx     # File list with selection
├── FileRemoverList.test.tsx
├── FileRemoverRow.tsx      # Individual file row
├── ActionButtons.tsx       # Action buttons
├── ActionButtons.test.tsx
├── DeleteConfirmModal.tsx  # Confirmation dialog
├── DeleteConfirmModal.test.tsx
├── matchingUtils.ts        # Pattern matching utilities
└── matchingUtils.test.ts
```

### 2. Implement Header Component

`src/components/FileRemover/Header.tsx`:

```tsx
import { Component } from "solid-js";
import { TrashIcon } from "../ui/icons";

const Header: Component = () => {
  return (
    <div class="flex items-center gap-3 mb-8">
      <div class="p-2 rounded-lg bg-error/10">
        <TrashIcon size="lg" class="text-error" />
      </div>
      <div>
        <h2 class="text-2xl font-bold text-base-content">File Remover</h2>
        <p class="text-base-content/60">Delete files matching a pattern</p>
      </div>
    </div>
  );
};

export default Header;
```

### 3. Implement PatternControls Component

`src/components/FileRemover/PatternControls.tsx`:

```tsx
import { Component, Show } from "solid-js";
import Input from "../ui/Input";
import Checkbox from "../ui/Checkbox";
import Tooltip from "../ui/Tooltip";
import { ErrorIcon } from "../ui/icons";

export type PatternType = "simple" | "extension" | "regex";

interface PatternControlsProps {
  pattern: string;
  setPattern: (value: string) => void;
  patternType: PatternType;
  setPatternType: (value: PatternType) => void;
  caseSensitive: boolean;
  setCaseSensitive: (value: boolean) => void;
  includeSubdirs: boolean;
  setIncludeSubdirs: (value: boolean) => void;
  deleteEmptyDirs: boolean;
  setDeleteEmptyDirs: (value: boolean) => void;
  patternError?: string;
}

const PatternControls: Component<PatternControlsProps> = (props) => {
  const patternPlaceholder = () => {
    switch (props.patternType) {
      case "simple":
        return "Enter text to match in file names...";
      case "extension":
        return ".tmp, .log, .bak";
      case "regex":
        return "Enter regex pattern...";
    }
  };

  const patternHelp = () => {
    switch (props.patternType) {
      case "simple":
        return "Match files containing this text in their name";
      case "extension":
        return "Comma-separated list of extensions (with or without dots)";
      case "regex":
        return "Regular expression pattern for advanced matching";
    }
  };

  return (
    <div class="card bg-base-100 shadow-lg">
      <div class="card-body">
        <h3 class="card-title text-lg mb-4">Pattern Settings</h3>

        {/* Pattern Type Selector */}
        <div class="mb-4">
          <label class="label">
            <span class="label-text font-medium">Pattern Type</span>
          </label>
          <div class="join">
            <button
              class={`btn join-item ${props.patternType === "simple" ? "btn-active" : ""}`}
              onClick={() => props.setPatternType("simple")}
            >
              Simple
            </button>
            <button
              class={`btn join-item ${props.patternType === "extension" ? "btn-active" : ""}`}
              onClick={() => props.setPatternType("extension")}
            >
              Extension
            </button>
            <button
              class={`btn join-item ${props.patternType === "regex" ? "btn-active" : ""}`}
              onClick={() => props.setPatternType("regex")}
            >
              Regex
            </button>
          </div>
        </div>

        {/* Pattern Input */}
        <div class="mb-4">
          <label class="label">
            <span class="label-text font-medium">Pattern</span>
            <Tooltip content={patternHelp()}>
              <span class="label-text-alt cursor-help">ⓘ</span>
            </Tooltip>
          </label>
          <Input
            type="text"
            value={props.pattern}
            onInput={(e) => props.setPattern(e.currentTarget.value)}
            placeholder={patternPlaceholder()}
            class={`w-full ${props.patternError ? "input-error" : ""}`}
          />
          <Show when={props.patternError}>
            <div class="flex items-center gap-1 mt-1 text-error text-sm">
              <ErrorIcon size="xs" />
              <span>{props.patternError}</span>
            </div>
          </Show>
        </div>

        {/* Options */}
        <div class="grid grid-cols-2 gap-4">
          <Checkbox
            checked={props.caseSensitive}
            onChange={props.setCaseSensitive}
            label="Case Sensitive"
          />
          <Checkbox
            checked={props.includeSubdirs}
            onChange={props.setIncludeSubdirs}
            label="Include Subdirectories"
          />
          <Checkbox
            checked={props.deleteEmptyDirs}
            onChange={props.setDeleteEmptyDirs}
            label="Delete Empty Directories"
          />
        </div>
      </div>
    </div>
  );
};

export default PatternControls;
```

### 4. Create Main Container Scaffold

`src/components/FileRemover/index.tsx`:

```tsx
import { createSignal, createMemo } from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import Header from "./Header";
import PatternControls, { PatternType } from "./PatternControls";
// import ActionButtons from "./ActionButtons";
// import FileRemoverList from "./FileRemoverList";
// import DeleteConfirmModal from "./DeleteConfirmModal";

export interface FileMatchItem {
  path: string;
  name: string;
  matchRanges: [number, number][];
  size: number;
  isDirectory: boolean;
  selected: boolean;
}

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
  const totalSize = createMemo(() =>
    selectedFiles().reduce((sum, f) => sum + f.size, 0)
  );

  // Actions
  async function selectFolder() {
    const selected = await open({
      multiple: false,
      directory: true,
    });

    if (selected && typeof selected === "string") {
      setBasePath(selected);
      if (pattern()) {
        await searchFiles();
      }
    }
  }

  async function searchFiles() {
    if (!basePath() || !pattern()) return;

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
          selected: true, // Select all by default
        }))
      );
    } catch (error) {
      setPatternError(String(error));
      setFiles([]);
    } finally {
      setIsSearching(false);
    }
  }

  // ... more actions to be implemented

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

          {/* TODO: ActionButtons */}
          {/* TODO: FileRemoverList */}
          {/* TODO: DeleteConfirmModal */}
        </div>
      </div>
    </div>
  );
}
```

### 5. Define TypeScript Types

`src/components/FileRemover/types.ts`:

```typescript
export type PatternType = "simple" | "extension" | "regex";

export interface FileMatchItem {
  path: string;
  name: string;
  matchRanges: [number, number][];
  size: number;
  isDirectory: boolean;
  selected: boolean;
}

export interface SearchFilesParams {
  basePath: string;
  pattern: string;
  patternType: PatternType;
  includeSubdirs: boolean;
  caseSensitive: boolean;
}

export interface DeleteFilesParams {
  files: string[];
  deleteEmptyDirs: boolean;
}

export interface DeleteResult {
  successful: string[];
  failed: [string, string][];
  deletedDirs: string[];
}
```

## Testing Requirements

### PatternControls Tests

`src/components/FileRemover/PatternControls.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import PatternControls from "./PatternControls";

describe("PatternControls", () => {
  const defaultProps = {
    pattern: "",
    setPattern: vi.fn(),
    patternType: "simple" as const,
    setPatternType: vi.fn(),
    caseSensitive: false,
    setCaseSensitive: vi.fn(),
    includeSubdirs: true,
    setIncludeSubdirs: vi.fn(),
    deleteEmptyDirs: false,
    setDeleteEmptyDirs: vi.fn(),
  };

  it("renders pattern type buttons", () => {
    render(() => <PatternControls {...defaultProps} />);
    
    expect(screen.getByText("Simple")).toBeInTheDocument();
    expect(screen.getByText("Extension")).toBeInTheDocument();
    expect(screen.getByText("Regex")).toBeInTheDocument();
  });

  it("calls setPatternType when type button clicked", async () => {
    const setPatternType = vi.fn();
    render(() => (
      <PatternControls {...defaultProps} setPatternType={setPatternType} />
    ));
    
    await fireEvent.click(screen.getByText("Extension"));
    expect(setPatternType).toHaveBeenCalledWith("extension");
  });

  it("shows error message when patternError is set", () => {
    render(() => (
      <PatternControls {...defaultProps} patternError="Invalid regex" />
    ));
    
    expect(screen.getByText("Invalid regex")).toBeInTheDocument();
  });

  it("shows correct placeholder for each pattern type", () => {
    const { rerender } = render(() => (
      <PatternControls {...defaultProps} patternType="simple" />
    ));
    
    expect(screen.getByPlaceholderText(/enter text to match/i)).toBeInTheDocument();
    
    rerender(() => (
      <PatternControls {...defaultProps} patternType="extension" />
    ));
    expect(screen.getByPlaceholderText(/\.tmp, \.log/)).toBeInTheDocument();
  });

  it("toggles checkboxes correctly", async () => {
    const setCaseSensitive = vi.fn();
    render(() => (
      <PatternControls {...defaultProps} setCaseSensitive={setCaseSensitive} />
    ));
    
    const checkbox = screen.getByLabelText("Case Sensitive");
    await fireEvent.click(checkbox);
    expect(setCaseSensitive).toHaveBeenCalledWith(true);
  });
});
```

## Acceptance Criteria

- [ ] Component file structure is created
- [ ] Header component displays correctly
- [ ] PatternControls renders all three pattern type options
- [ ] Pattern input updates correctly
- [ ] All checkboxes toggle properly
- [ ] Error messages display when patternError is set
- [ ] Placeholder text changes based on pattern type
- [ ] All tests pass

