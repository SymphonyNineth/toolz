import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import "@testing-library/jest-dom";
import FileRemoverList from "./FileRemoverList";
import { FileMatchItem } from "./types";

describe("FileRemoverList", () => {
  const createMockFiles = (): FileMatchItem[] => [
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

  const defaultProps = {
    files: createMockFiles(),
    onToggleSelect: vi.fn(),
    onSelectAll: vi.fn(),
    onDeselectAll: vi.fn(),
    onInvertSelection: vi.fn(),
    onRemoveFromList: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders file count correctly", () => {
      render(() => <FileRemoverList {...defaultProps} />);

      expect(screen.getByText("2 files found")).toBeInTheDocument();
    });

    it("shows selected count and size", () => {
      render(() => <FileRemoverList {...defaultProps} />);

      // 1 file selected (1024 bytes = 1 KB)
      expect(screen.getByText(/1 selected/)).toBeInTheDocument();
      // The size appears in the header
      expect(screen.getByText(/1 selected \(1 KB\)/)).toBeInTheDocument();
    });

    it("renders all control buttons", () => {
      render(() => <FileRemoverList {...defaultProps} />);

      expect(screen.getByText("Select All")).toBeInTheDocument();
      expect(screen.getByText("Deselect All")).toBeInTheDocument();
      expect(screen.getByText("Invert")).toBeInTheDocument();
    });

    it("renders Remove Selected button when files are selected", () => {
      render(() => <FileRemoverList {...defaultProps} />);

      expect(screen.getByText("Remove Selected from List")).toBeInTheDocument();
    });

    it("does not render Remove Selected button when no files selected", () => {
      const filesNoneSelected = createMockFiles().map((f) => ({
        ...f,
        selected: false,
      }));
      render(() => (
        <FileRemoverList {...defaultProps} files={filesNoneSelected} />
      ));

      expect(
        screen.queryByText("Remove Selected from List")
      ).not.toBeInTheDocument();
    });

    it("renders all files in the list", () => {
      render(() => <FileRemoverList {...defaultProps} />);

      // File names are broken up by highlighting, so check for the paths instead
      expect(screen.getByText("/test/file1.txt")).toBeInTheDocument();
      expect(screen.getByText("/test/file2.log")).toBeInTheDocument();
    });
  });

  describe("Empty state", () => {
    it("shows empty state when no files", () => {
      render(() => <FileRemoverList {...defaultProps} files={[]} />);

      expect(
        screen.getByText("No files found matching the pattern")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Select a folder and enter a pattern to search")
      ).toBeInTheDocument();
    });

    it("shows 0 files found in header when empty", () => {
      render(() => <FileRemoverList {...defaultProps} files={[]} />);

      expect(screen.getByText("0 files found")).toBeInTheDocument();
    });
  });

  describe("Selection interactions", () => {
    it("calls onToggleSelect when checkbox clicked", async () => {
      const onToggleSelect = vi.fn();
      render(() => (
        <FileRemoverList {...defaultProps} onToggleSelect={onToggleSelect} />
      ));

      const checkboxes = screen.getAllByRole("checkbox");
      await fireEvent.click(checkboxes[0]);
      expect(onToggleSelect).toHaveBeenCalledWith("/test/file1.txt");
    });

    it("calls onSelectAll when Select All clicked", async () => {
      const onSelectAll = vi.fn();
      render(() => (
        <FileRemoverList {...defaultProps} onSelectAll={onSelectAll} />
      ));

      await fireEvent.click(screen.getByText("Select All"));
      expect(onSelectAll).toHaveBeenCalledTimes(1);
    });

    it("calls onDeselectAll when Deselect All clicked", async () => {
      const onDeselectAll = vi.fn();
      render(() => (
        <FileRemoverList {...defaultProps} onDeselectAll={onDeselectAll} />
      ));

      await fireEvent.click(screen.getByText("Deselect All"));
      expect(onDeselectAll).toHaveBeenCalledTimes(1);
    });

    it("calls onInvertSelection when Invert clicked", async () => {
      const onInvertSelection = vi.fn();
      render(() => (
        <FileRemoverList {...defaultProps} onInvertSelection={onInvertSelection} />
      ));

      await fireEvent.click(screen.getByText("Invert"));
      expect(onInvertSelection).toHaveBeenCalledTimes(1);
    });

    it("calls onRemoveFromList with selected paths when Remove clicked", async () => {
      const onRemoveFromList = vi.fn();
      render(() => (
        <FileRemoverList {...defaultProps} onRemoveFromList={onRemoveFromList} />
      ));

      await fireEvent.click(screen.getByText("Remove Selected from List"));
      expect(onRemoveFromList).toHaveBeenCalledWith(["/test/file1.txt"]);
    });
  });

  describe("File count calculations", () => {
    it("calculates selected count correctly", () => {
      const files = [
        { ...createMockFiles()[0], selected: true },
        { ...createMockFiles()[1], selected: true },
      ];
      render(() => <FileRemoverList {...defaultProps} files={files} />);

      expect(screen.getByText(/2 selected/)).toBeInTheDocument();
    });

    it("calculates selected size correctly", () => {
      const files = [
        { ...createMockFiles()[0], selected: true, size: 1024 * 1024 }, // 1 MB
        { ...createMockFiles()[1], selected: true, size: 1024 * 1024 * 2 }, // 2 MB
      ];
      render(() => <FileRemoverList {...defaultProps} files={files} />);

      // Total: 3 MB
      expect(screen.getByText(/3 MB/)).toBeInTheDocument();
    });

    it("shows 0 selected when no files selected", () => {
      const filesNoneSelected = createMockFiles().map((f) => ({
        ...f,
        selected: false,
      }));
      render(() => (
        <FileRemoverList {...defaultProps} files={filesNoneSelected} />
      ));

      expect(screen.getByText(/0 selected/)).toBeInTheDocument();
    });
  });

  describe("Large file list", () => {
    it("handles many files", () => {
      const manyFiles: FileMatchItem[] = Array.from({ length: 100 }, (_, i) => ({
        path: `/test/file${i}.txt`,
        name: `file${i}.txt`,
        matchRanges: [],
        size: 1024,
        isDirectory: false,
        selected: i % 2 === 0,
      }));

      render(() => <FileRemoverList {...defaultProps} files={manyFiles} />);

      expect(screen.getByText("100 files found")).toBeInTheDocument();
      expect(screen.getByText(/50 selected/)).toBeInTheDocument();
    });
  });

  describe("Mixed file types", () => {
    it("handles both files and directories", () => {
      const mixedFiles: FileMatchItem[] = [
        {
          path: "/test/folder",
          name: "folder",
          matchRanges: [],
          size: 0,
          isDirectory: true,
          selected: false,
        },
        {
          path: "/test/file.txt",
          name: "file.txt",
          matchRanges: [],
          size: 1024,
          isDirectory: false,
          selected: false,
        },
      ];

      render(() => <FileRemoverList {...defaultProps} files={mixedFiles} />);

      expect(screen.getByText("folder")).toBeInTheDocument();
      expect(screen.getByText("file.txt")).toBeInTheDocument();
    });
  });
});

