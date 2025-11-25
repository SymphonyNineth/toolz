# File Remover Testing Documentation

This document outlines the comprehensive testing strategy for the File Remover tool.

## Testing Overview

The File Remover requires extensive testing due to its destructive nature. Tests are divided into:

1. **Backend Unit Tests** - Pattern matching and file operations
2. **Frontend Unit Tests** - Component behavior and state management
3. **Integration Tests** - Frontend-backend communication
4. **End-to-End Tests** - Complete user workflows

## Backend Testing (Rust)

### Pattern Matching Tests

Location: `src-tauri/src/lib.rs` or separate test module

#### Simple Pattern Matching

```rust
#[cfg(test)]
mod pattern_tests {
    use super::*;

    #[test]
    fn simple_match_case_insensitive() {
        let result = match_simple("MyDocument.txt", "doc", false);
        assert_eq!(result, Some(vec![(2, 5)]));
    }

    #[test]
    fn simple_match_case_sensitive_no_match() {
        let result = match_simple("MyDocument.txt", "doc", true);
        assert_eq!(result, None);
    }

    #[test]
    fn simple_match_case_sensitive_match() {
        let result = match_simple("MyDocument.txt", "Doc", true);
        assert_eq!(result, Some(vec![(2, 5)]));
    }

    #[test]
    fn simple_match_multiple_occurrences() {
        let result = match_simple("test_test_test.txt", "test", false);
        assert_eq!(result, Some(vec![(0, 4), (5, 9), (10, 14)]));
    }

    #[test]
    fn simple_match_at_start() {
        let result = match_simple("README.md", "read", false);
        assert_eq!(result, Some(vec![(0, 4)]));
    }

    #[test]
    fn simple_match_at_end() {
        let result = match_simple("file.backup", "backup", false);
        assert_eq!(result, Some(vec![(5, 11)]));
    }

    #[test]
    fn simple_match_no_match() {
        let result = match_simple("document.pdf", "xyz", false);
        assert_eq!(result, None);
    }

    #[test]
    fn simple_match_empty_pattern() {
        // Empty pattern should match everything or return None based on implementation
        let result = match_simple("file.txt", "", false);
        // Implementation dependent
    }
}
```

#### Extension Pattern Matching

```rust
#[cfg(test)]
mod extension_tests {
    use super::*;

    #[test]
    fn extension_single_with_dot() {
        let result = match_extension("file.txt", ".txt", false);
        assert!(result.is_some());
        assert_eq!(result.unwrap(), vec![(4, 8)]);
    }

    #[test]
    fn extension_single_without_dot() {
        let result = match_extension("file.txt", "txt", false);
        assert!(result.is_some());
    }

    #[test]
    fn extension_multiple() {
        let result = match_extension("file.log", ".txt, .log, .tmp", false);
        assert!(result.is_some());
    }

    #[test]
    fn extension_case_insensitive() {
        let result = match_extension("FILE.TXT", ".txt", false);
        assert!(result.is_some());
    }

    #[test]
    fn extension_case_sensitive_no_match() {
        let result = match_extension("FILE.TXT", ".txt", true);
        assert_eq!(result, None);
    }

    #[test]
    fn extension_no_match() {
        let result = match_extension("file.doc", ".txt, .pdf", false);
        assert_eq!(result, None);
    }

    #[test]
    fn extension_double_extension() {
        let result = match_extension("file.tar.gz", ".gz", false);
        assert!(result.is_some());
    }

    #[test]
    fn extension_hidden_file() {
        let result = match_extension(".gitignore", ".gitignore", false);
        assert!(result.is_some());
    }

    #[test]
    fn extension_spaces_in_list() {
        let result = match_extension("file.log", "  .txt  ,  .log  ", false);
        assert!(result.is_some());
    }
}
```

#### Regex Pattern Matching

```rust
#[cfg(test)]
mod regex_tests {
    use super::*;

    #[test]
    fn regex_digit_pattern() {
        let result = match_regex("file123.txt", r"\d+", false);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), Some(vec![(4, 7)]));
    }

    #[test]
    fn regex_word_boundary() {
        let result = match_regex("my_file.txt", r"\bfile\b", false);
        assert!(result.is_ok());
        assert!(result.unwrap().is_some());
    }

    #[test]
    fn regex_case_insensitive() {
        let result = match_regex("MyFile.txt", "myfile", false);
        assert!(result.is_ok());
        assert!(result.unwrap().is_some());
    }

    #[test]
    fn regex_case_sensitive() {
        let result = match_regex("MyFile.txt", "myfile", true);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), None);
    }

    #[test]
    fn regex_invalid_pattern() {
        let result = match_regex("file.txt", r"[invalid", false);
        assert!(result.is_err());
    }

    #[test]
    fn regex_special_characters() {
        let result = match_regex("file (1).txt", r"\(\d+\)", false);
        assert!(result.is_ok());
        assert!(result.unwrap().is_some());
    }

    #[test]
    fn regex_multiple_matches() {
        let result = match_regex("abc123def456.txt", r"\d+", false);
        assert!(result.is_ok());
        let matches = result.unwrap().unwrap();
        assert_eq!(matches.len(), 2);
    }

    #[test]
    fn regex_extension_pattern() {
        let result = match_regex("file.backup.txt", r"\.txt$", false);
        assert!(result.is_ok());
        assert!(result.unwrap().is_some());
    }
}
```

### File Operation Tests

```rust
#[cfg(test)]
mod file_operation_tests {
    use super::*;
    use std::fs::{self, File};
    use tempfile::TempDir;

    fn setup_test_env() -> TempDir {
        let dir = TempDir::new().unwrap();
        
        // Create test file structure:
        // test_dir/
        //   ├── file1.txt (100 bytes)
        //   ├── file2.txt (200 bytes)
        //   ├── data.log (50 bytes)
        //   ├── temp.tmp (75 bytes)
        //   ├── subdir/
        //   │   ├── nested.txt (25 bytes)
        //   │   └── deep/
        //   │       └── deeper.txt (10 bytes)
        //   └── empty_dir/

        create_test_file(dir.path().join("file1.txt"), 100);
        create_test_file(dir.path().join("file2.txt"), 200);
        create_test_file(dir.path().join("data.log"), 50);
        create_test_file(dir.path().join("temp.tmp"), 75);
        
        let subdir = dir.path().join("subdir");
        fs::create_dir(&subdir).unwrap();
        create_test_file(subdir.join("nested.txt"), 25);
        
        let deep = subdir.join("deep");
        fs::create_dir(&deep).unwrap();
        create_test_file(deep.join("deeper.txt"), 10);
        
        fs::create_dir(dir.path().join("empty_dir")).unwrap();
        
        dir
    }

    fn create_test_file(path: std::path::PathBuf, size: usize) {
        use std::io::Write;
        let mut file = File::create(path).unwrap();
        file.write_all(&vec![0u8; size]).unwrap();
    }

    #[test]
    fn search_simple_no_subdirs() {
        let dir = setup_test_env();
        let results = search_files_by_pattern(
            dir.path().to_string_lossy().to_string(),
            "file".to_string(),
            PatternType::Simple,
            false,
            false,
        ).unwrap();
        
        assert_eq!(results.len(), 2);
        assert!(results.iter().all(|r| r.name.contains("file")));
    }

    #[test]
    fn search_simple_with_subdirs() {
        let dir = setup_test_env();
        let results = search_files_by_pattern(
            dir.path().to_string_lossy().to_string(),
            ".txt".to_string(),
            PatternType::Extension,
            true,
            false,
        ).unwrap();
        
        assert_eq!(results.len(), 4); // file1, file2, nested, deeper
    }

    #[test]
    fn search_returns_correct_match_ranges() {
        let dir = setup_test_env();
        let results = search_files_by_pattern(
            dir.path().to_string_lossy().to_string(),
            "file".to_string(),
            PatternType::Simple,
            false,
            false,
        ).unwrap();
        
        for result in results {
            assert!(!result.match_ranges.is_empty());
            for (start, end) in &result.match_ranges {
                assert!(start < end);
                assert!(*end <= result.name.len());
            }
        }
    }

    #[test]
    fn search_returns_correct_file_size() {
        let dir = setup_test_env();
        let results = search_files_by_pattern(
            dir.path().to_string_lossy().to_string(),
            "file1".to_string(),
            PatternType::Simple,
            false,
            false,
        ).unwrap();
        
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].size, 100);
    }

    #[test]
    fn delete_single_file() {
        let dir = setup_test_env();
        let file_path = dir.path().join("temp.tmp");
        
        assert!(file_path.exists());
        
        let result = batch_delete(
            vec![file_path.to_string_lossy().to_string()],
            false,
        ).unwrap();
        
        assert_eq!(result.successful.len(), 1);
        assert!(result.failed.is_empty());
        assert!(!file_path.exists());
    }

    #[test]
    fn delete_multiple_files() {
        let dir = setup_test_env();
        let files = vec![
            dir.path().join("file1.txt").to_string_lossy().to_string(),
            dir.path().join("file2.txt").to_string_lossy().to_string(),
        ];
        
        let result = batch_delete(files.clone(), false).unwrap();
        
        assert_eq!(result.successful.len(), 2);
        assert!(result.failed.is_empty());
        
        for file in files {
            assert!(!std::path::Path::new(&file).exists());
        }
    }

    #[test]
    fn delete_with_empty_dir_cleanup() {
        let dir = setup_test_env();
        let deep_dir = dir.path().join("subdir").join("deep");
        let file_path = deep_dir.join("deeper.txt");
        
        let result = batch_delete(
            vec![file_path.to_string_lossy().to_string()],
            true,
        ).unwrap();
        
        assert_eq!(result.successful.len(), 1);
        assert!(!file_path.exists());
        // Deep directory should be removed since it's now empty
        // (depends on implementation)
    }

    #[test]
    fn delete_nonexistent_file() {
        let result = batch_delete(
            vec!["/nonexistent/path/file.txt".to_string()],
            false,
        ).unwrap();
        
        assert!(result.successful.is_empty());
        assert_eq!(result.failed.len(), 1);
        assert!(result.failed[0].1.contains("No such file"));
    }

    #[test]
    fn delete_preserves_non_empty_dirs() {
        let dir = setup_test_env();
        let nested_file = dir.path().join("subdir").join("nested.txt");
        
        // Delete only nested.txt, not deeper.txt
        let result = batch_delete(
            vec![nested_file.to_string_lossy().to_string()],
            true,
        ).unwrap();
        
        // subdir should still exist because deep/deeper.txt is still there
        assert!(dir.path().join("subdir").exists());
    }

    #[test]
    fn search_empty_pattern_returns_error() {
        let dir = setup_test_env();
        let result = search_files_by_pattern(
            dir.path().to_string_lossy().to_string(),
            "".to_string(),
            PatternType::Simple,
            false,
            false,
        );
        
        assert!(result.is_err());
    }
}
```

## Frontend Testing (TypeScript/SolidJS)

### PatternControls Tests

Location: `src/components/FileRemover/PatternControls.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@solidjs/testing-library";
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

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("Pattern Type Selection", () => {
    it("renders all three pattern type buttons", () => {
      render(() => <PatternControls {...defaultProps} />);
      
      expect(screen.getByText("Simple")).toBeInTheDocument();
      expect(screen.getByText("Extension")).toBeInTheDocument();
      expect(screen.getByText("Regex")).toBeInTheDocument();
    });

    it("highlights active pattern type", () => {
      render(() => <PatternControls {...defaultProps} patternType="extension" />);
      
      const extensionBtn = screen.getByText("Extension");
      expect(extensionBtn).toHaveClass("btn-active");
    });

    it("calls setPatternType on button click", async () => {
      const setPatternType = vi.fn();
      render(() => (
        <PatternControls {...defaultProps} setPatternType={setPatternType} />
      ));
      
      await fireEvent.click(screen.getByText("Regex"));
      expect(setPatternType).toHaveBeenCalledWith("regex");
    });
  });

  describe("Pattern Input", () => {
    it("displays current pattern value", () => {
      render(() => <PatternControls {...defaultProps} pattern="test" />);
      
      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("test");
    });

    it("calls setPattern on input change", async () => {
      const setPattern = vi.fn();
      render(() => <PatternControls {...defaultProps} setPattern={setPattern} />);
      
      const input = screen.getByRole("textbox");
      await fireEvent.input(input, { target: { value: "new value" } });
      expect(setPattern).toHaveBeenCalledWith("new value");
    });

    it("shows correct placeholder for simple type", () => {
      render(() => <PatternControls {...defaultProps} patternType="simple" />);
      
      expect(screen.getByPlaceholderText(/enter text to match/i)).toBeInTheDocument();
    });

    it("shows correct placeholder for extension type", () => {
      render(() => <PatternControls {...defaultProps} patternType="extension" />);
      
      expect(screen.getByPlaceholderText(/\.tmp.*\.log.*\.bak/i)).toBeInTheDocument();
    });

    it("shows correct placeholder for regex type", () => {
      render(() => <PatternControls {...defaultProps} patternType="regex" />);
      
      expect(screen.getByPlaceholderText(/enter regex pattern/i)).toBeInTheDocument();
    });
  });

  describe("Error Display", () => {
    it("shows error message when patternError is set", () => {
      render(() => (
        <PatternControls {...defaultProps} patternError="Invalid regex syntax" />
      ));
      
      expect(screen.getByText("Invalid regex syntax")).toBeInTheDocument();
    });

    it("applies error styling to input", () => {
      render(() => (
        <PatternControls {...defaultProps} patternError="Error" />
      ));
      
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("input-error");
    });

    it("does not show error when patternError is undefined", () => {
      render(() => <PatternControls {...defaultProps} />);
      
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });

  describe("Checkboxes", () => {
    it("renders case sensitive checkbox", () => {
      render(() => <PatternControls {...defaultProps} />);
      
      expect(screen.getByLabelText(/case sensitive/i)).toBeInTheDocument();
    });

    it("renders include subdirectories checkbox", () => {
      render(() => <PatternControls {...defaultProps} />);
      
      expect(screen.getByLabelText(/include subdirectories/i)).toBeInTheDocument();
    });

    it("renders delete empty directories checkbox", () => {
      render(() => <PatternControls {...defaultProps} />);
      
      expect(screen.getByLabelText(/delete empty directories/i)).toBeInTheDocument();
    });

    it("toggles case sensitive", async () => {
      const setCaseSensitive = vi.fn();
      render(() => (
        <PatternControls {...defaultProps} setCaseSensitive={setCaseSensitive} />
      ));
      
      await fireEvent.click(screen.getByLabelText(/case sensitive/i));
      expect(setCaseSensitive).toHaveBeenCalledWith(true);
    });

    it("toggles include subdirs", async () => {
      const setIncludeSubdirs = vi.fn();
      render(() => (
        <PatternControls
          {...defaultProps}
          includeSubdirs={true}
          setIncludeSubdirs={setIncludeSubdirs}
        />
      ));
      
      await fireEvent.click(screen.getByLabelText(/include subdirectories/i));
      expect(setIncludeSubdirs).toHaveBeenCalledWith(false);
    });
  });
});
```

### FileRemoverList Tests

Location: `src/components/FileRemover/FileRemoverList.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@solidjs/testing-library";
import FileRemoverList from "./FileRemoverList";
import { FileMatchItem } from "./types";

describe("FileRemoverList", () => {
  const mockFiles: FileMatchItem[] = [
    {
      path: "/test/dir/file1.txt",
      name: "file1.txt",
      matchRanges: [[0, 4]],
      size: 1024,
      isDirectory: false,
      selected: true,
    },
    {
      path: "/test/dir/file2.log",
      name: "file2.log",
      matchRanges: [[0, 4]],
      size: 2048,
      isDirectory: false,
      selected: false,
    },
    {
      path: "/test/dir/subdir",
      name: "subdir",
      matchRanges: [],
      size: 0,
      isDirectory: true,
      selected: true,
    },
  ];

  const defaultProps = {
    files: mockFiles,
    onToggleSelect: vi.fn(),
    onSelectAll: vi.fn(),
    onDeselectAll: vi.fn(),
    onInvertSelection: vi.fn(),
    onRemoveFromList: vi.fn(),
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("File Count Display", () => {
    it("shows total file count", () => {
      render(() => <FileRemoverList {...defaultProps} />);
      
      expect(screen.getByText(/3 files found/)).toBeInTheDocument();
    });

    it("shows selected count", () => {
      render(() => <FileRemoverList {...defaultProps} />);
      
      expect(screen.getByText(/2 selected/)).toBeInTheDocument();
    });

    it("shows selected size", () => {
      render(() => <FileRemoverList {...defaultProps} />);
      
      // 1024 bytes = 1 KB
      expect(screen.getByText(/1 KB/)).toBeInTheDocument();
    });
  });

  describe("Selection Controls", () => {
    it("calls onSelectAll when button clicked", async () => {
      render(() => <FileRemoverList {...defaultProps} />);
      
      await fireEvent.click(screen.getByText("Select All"));
      expect(defaultProps.onSelectAll).toHaveBeenCalled();
    });

    it("calls onDeselectAll when button clicked", async () => {
      render(() => <FileRemoverList {...defaultProps} />);
      
      await fireEvent.click(screen.getByText("Deselect All"));
      expect(defaultProps.onDeselectAll).toHaveBeenCalled();
    });

    it("calls onInvertSelection when button clicked", async () => {
      render(() => <FileRemoverList {...defaultProps} />);
      
      await fireEvent.click(screen.getByText("Invert"));
      expect(defaultProps.onInvertSelection).toHaveBeenCalled();
    });

    it("shows remove from list button when files selected", () => {
      render(() => <FileRemoverList {...defaultProps} />);
      
      expect(screen.getByText(/remove selected from list/i)).toBeInTheDocument();
    });

    it("hides remove from list when no files selected", () => {
      const noSelection = mockFiles.map(f => ({ ...f, selected: false }));
      render(() => <FileRemoverList {...defaultProps} files={noSelection} />);
      
      expect(screen.queryByText(/remove selected from list/i)).not.toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("shows empty message when no files", () => {
      render(() => <FileRemoverList {...defaultProps} files={[]} />);
      
      expect(screen.getByText(/no files found/i)).toBeInTheDocument();
    });
  });

  describe("File Row Interaction", () => {
    it("calls onToggleSelect when checkbox clicked", async () => {
      render(() => <FileRemoverList {...defaultProps} />);
      
      const checkboxes = screen.getAllByRole("checkbox");
      await fireEvent.click(checkboxes[0]);
      
      expect(defaultProps.onToggleSelect).toHaveBeenCalledWith("/test/dir/file1.txt");
    });
  });
});
```

### DeleteConfirmModal Tests

Location: `src/components/FileRemover/DeleteConfirmModal.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@solidjs/testing-library";
import DeleteConfirmModal from "./DeleteConfirmModal";
import { FileMatchItem } from "./types";

describe("DeleteConfirmModal", () => {
  const mockFiles: FileMatchItem[] = [
    {
      path: "/test/file1.txt",
      name: "file1.txt",
      matchRanges: [],
      size: 1024,
      isDirectory: false,
      selected: true,
    },
    {
      path: "/test/file2.txt",
      name: "file2.txt",
      matchRanges: [],
      size: 2048,
      isDirectory: false,
      selected: true,
    },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    files: mockFiles,
    isDeleting: false,
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("Warning Display", () => {
    it("shows file count in warning", () => {
      render(() => <DeleteConfirmModal {...defaultProps} />);
      
      expect(screen.getByText(/2/)).toBeInTheDocument();
      expect(screen.getByText(/files/i)).toBeInTheDocument();
    });

    it("shows total size", () => {
      render(() => <DeleteConfirmModal {...defaultProps} />);
      
      // 3072 bytes ≈ 3 KB
      expect(screen.getByText(/3.*KB/i)).toBeInTheDocument();
    });

    it("shows cannot be undone warning", () => {
      render(() => <DeleteConfirmModal {...defaultProps} />);
      
      expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    });
  });

  describe("File Preview", () => {
    it("shows file paths", () => {
      render(() => <DeleteConfirmModal {...defaultProps} />);
      
      expect(screen.getByText("/test/file1.txt")).toBeInTheDocument();
      expect(screen.getByText("/test/file2.txt")).toBeInTheDocument();
    });

    it("truncates long file lists", () => {
      const manyFiles = Array.from({ length: 15 }, (_, i) => ({
        path: `/test/file${i}.txt`,
        name: `file${i}.txt`,
        matchRanges: [] as [number, number][],
        size: 100,
        isDirectory: false,
        selected: true,
      }));
      
      render(() => <DeleteConfirmModal {...defaultProps} files={manyFiles} />);
      
      expect(screen.getByText(/and 5 more files/i)).toBeInTheDocument();
    });
  });

  describe("Actions", () => {
    it("calls onClose when Cancel clicked", async () => {
      render(() => <DeleteConfirmModal {...defaultProps} />);
      
      await fireEvent.click(screen.getByText("Cancel"));
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("calls onConfirm when Delete clicked", async () => {
      render(() => <DeleteConfirmModal {...defaultProps} />);
      
      await fireEvent.click(screen.getByText("Delete Files"));
      expect(defaultProps.onConfirm).toHaveBeenCalled();
    });
  });

  describe("Loading State", () => {
    it("disables Cancel when deleting", () => {
      render(() => <DeleteConfirmModal {...defaultProps} isDeleting={true} />);
      
      expect(screen.getByText("Cancel")).toBeDisabled();
    });

    it("shows loading state on delete button", () => {
      render(() => <DeleteConfirmModal {...defaultProps} isDeleting={true} />);
      
      const deleteBtn = screen.getByRole("button", { name: /delete/i });
      expect(deleteBtn).toHaveClass("loading");
    });
  });

  describe("Closed State", () => {
    it("does not render when closed", () => {
      render(() => <DeleteConfirmModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText("Confirm Deletion")).not.toBeInTheDocument();
    });
  });
});
```

### Utility Tests

Location: `src/components/FileRemover/utils.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { formatFileSize, buildHighlightedSegments } from "./utils";

describe("formatFileSize", () => {
  it("formats bytes", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(512)).toBe("512 B");
  });

  it("formats kilobytes", () => {
    expect(formatFileSize(1024)).toBe("1 KB");
    expect(formatFileSize(1536)).toBe("1.5 KB");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(1048576)).toBe("1 MB");
    expect(formatFileSize(10485760)).toBe("10 MB");
  });

  it("formats gigabytes", () => {
    expect(formatFileSize(1073741824)).toBe("1 GB");
  });
});

describe("buildHighlightedSegments", () => {
  it("returns single segment for no matches", () => {
    const result = buildHighlightedSegments("hello", []);
    expect(result).toEqual([{ text: "hello", isMatch: false }]);
  });

  it("highlights single match", () => {
    const result = buildHighlightedSegments("hello world", [[0, 5]]);
    expect(result).toEqual([
      { text: "hello", isMatch: true },
      { text: " world", isMatch: false },
    ]);
  });

  it("highlights multiple matches", () => {
    const result = buildHighlightedSegments("test_test", [[0, 4], [5, 9]]);
    expect(result).toEqual([
      { text: "test", isMatch: true },
      { text: "_", isMatch: false },
      { text: "test", isMatch: true },
    ]);
  });

  it("handles match at end", () => {
    const result = buildHighlightedSegments("file.txt", [[4, 8]]);
    expect(result).toEqual([
      { text: "file", isMatch: false },
      { text: ".txt", isMatch: true },
    ]);
  });

  it("handles adjacent matches", () => {
    const result = buildHighlightedSegments("aabb", [[0, 2], [2, 4]]);
    expect(result).toEqual([
      { text: "aa", isMatch: true },
      { text: "bb", isMatch: true },
    ]);
  });

  it("sorts unsorted ranges", () => {
    const result = buildHighlightedSegments("abc", [[2, 3], [0, 1]]);
    expect(result).toEqual([
      { text: "a", isMatch: true },
      { text: "b", isMatch: false },
      { text: "c", isMatch: true },
    ]);
  });
});
```

## End-to-End Test Scenarios

### Complete Workflow Tests

```typescript
describe("File Remover E2E", () => {
  describe("Search Workflow", () => {
    it("selects folder, enters pattern, and finds files", async () => {
      // 1. Click "Select Folder" button
      // 2. Choose test directory
      // 3. Enter pattern "test"
      // 4. Click "Search"
      // 5. Verify file list populates
    });

    it("updates results when pattern changes", async () => {
      // 1. Search with pattern "file"
      // 2. Verify results
      // 3. Change pattern to "log"
      // 4. Search again
      // 5. Verify new results
    });

    it("shows error for invalid regex", async () => {
      // 1. Select Regex mode
      // 2. Enter invalid pattern "[invalid"
      // 3. Search
      // 4. Verify error message displayed
    });
  });

  describe("Selection Workflow", () => {
    it("can select and deselect individual files", async () => {
      // 1. Search for files
      // 2. Click checkbox on first file
      // 3. Verify selection state changes
      // 4. Click again to deselect
    });

    it("can select all and deselect all", async () => {
      // 1. Search for files
      // 2. Click "Deselect All"
      // 3. Verify all unchecked
      // 4. Click "Select All"
      // 5. Verify all checked
    });

    it("can remove files from list without deleting", async () => {
      // 1. Search for files
      // 2. Select specific files
      // 3. Click "Remove Selected from List"
      // 4. Verify files removed from UI
      // 5. Verify files still exist on disk
    });
  });

  describe("Delete Workflow", () => {
    it("shows confirmation before deleting", async () => {
      // 1. Search and select files
      // 2. Click "Delete"
      // 3. Verify confirmation modal appears
      // 4. Verify file count shown
      // 5. Click "Cancel"
      // 6. Verify files still exist
    });

    it("deletes selected files on confirm", async () => {
      // 1. Search and select files
      // 2. Click "Delete"
      // 3. Click "Delete Files" in modal
      // 4. Verify files removed from disk
      // 5. Verify files removed from list
    });

    it("handles partial failures", async () => {
      // 1. Select mix of deletable and protected files
      // 2. Attempt delete
      // 3. Verify success/failure reported
      // 4. Verify only failed files remain in list
    });
  });
});
```

## Test Commands

```bash
# Run all tests
bun run test

# Run backend tests only
cd src-tauri && cargo test

# Run frontend tests only
bun run test -- --filter "FileRemover"

# Run with coverage
bun run test -- --coverage

# Run specific test file
bun run test -- PatternControls.test.tsx
```

## Test Coverage Requirements

| Component | Minimum Coverage |
|-----------|-----------------|
| PatternControls | 90% |
| FileRemoverList | 85% |
| FileRemoverRow | 80% |
| DeleteConfirmModal | 90% |
| utils.ts | 95% |
| Backend pattern matching | 95% |
| Backend file operations | 90% |

