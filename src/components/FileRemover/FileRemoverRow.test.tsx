import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import "@testing-library/jest-dom";
import FileRemoverRow from "./FileRemoverRow";
import { FileMatchItem } from "./types";

describe("FileRemoverRow", () => {
  const createMockFile = (overrides: Partial<FileMatchItem> = {}): FileMatchItem => ({
    path: "/test/path/file.txt",
    name: "file.txt",
    matchRanges: [],
    size: 1024,
    isDirectory: false,
    selected: false,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders file name correctly", () => {
      const file = createMockFile({ name: "example.txt" });
      render(() => <FileRemoverRow file={file} onToggleSelect={vi.fn()} />);

      expect(screen.getByText("example.txt")).toBeInTheDocument();
    });

    it("renders file path correctly", () => {
      const file = createMockFile({ path: "/home/user/documents/file.txt" });
      render(() => <FileRemoverRow file={file} onToggleSelect={vi.fn()} />);

      expect(screen.getByText("/home/user/documents/file.txt")).toBeInTheDocument();
    });

    it("renders file size correctly", () => {
      const file = createMockFile({ size: 2048 }); // 2 KB
      render(() => <FileRemoverRow file={file} onToggleSelect={vi.fn()} />);

      expect(screen.getByText("2 KB")).toBeInTheDocument();
    });

    it("renders large file sizes correctly", () => {
      const file = createMockFile({ size: 1024 * 1024 * 5 }); // 5 MB
      render(() => <FileRemoverRow file={file} onToggleSelect={vi.fn()} />);

      expect(screen.getByText("5 MB")).toBeInTheDocument();
    });

    it("renders checkbox", () => {
      const file = createMockFile();
      const { container } = render(() => (
        <FileRemoverRow file={file} onToggleSelect={vi.fn()} />
      ));

      // Checkbox is aria-hidden for accessibility (row is the interactive element)
      const checkbox = container.querySelector('input[type="checkbox"]');
      expect(checkbox).toBeInTheDocument();
    });

    it("checkbox reflects selected state - unchecked", () => {
      const file = createMockFile({ selected: false });
      const { container } = render(() => (
        <FileRemoverRow file={file} onToggleSelect={vi.fn()} />
      ));

      const checkbox = container.querySelector(
        'input[type="checkbox"]'
      ) as HTMLInputElement;
      expect(checkbox?.checked).toBe(false);
    });

    it("checkbox reflects selected state - checked", () => {
      const file = createMockFile({ selected: true });
      const { container } = render(() => (
        <FileRemoverRow file={file} onToggleSelect={vi.fn()} />
      ));

      const checkbox = container.querySelector(
        'input[type="checkbox"]'
      ) as HTMLInputElement;
      expect(checkbox?.checked).toBe(true);
    });

    it("renders as listitem with correct aria attributes", () => {
      const file = createMockFile({ selected: true, name: "test.txt", size: 1024 });
      render(() => <FileRemoverRow file={file} onToggleSelect={vi.fn()} />);

      const row = screen.getByRole("listitem");
      expect(row).toHaveAttribute("aria-selected", "true");
      expect(row).toHaveAttribute("tabindex", "0");
    });
  });

  describe("File type icons", () => {
    it("renders file icon for regular files", () => {
      const file = createMockFile({ isDirectory: false });
      const { container } = render(() => (
        <FileRemoverRow file={file} onToggleSelect={vi.fn()} />
      ));

      // Check that an SVG icon exists (either file or folder icon)
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("renders folder icon for directories", () => {
      const file = createMockFile({ isDirectory: true });
      const { container } = render(() => (
        <FileRemoverRow file={file} onToggleSelect={vi.fn()} />
      ));

      // Check that an SVG icon exists
      expect(container.querySelector("svg")).toBeInTheDocument();
    });
  });

  describe("Match highlighting", () => {
    it("highlights matched portions of the filename", () => {
      const file = createMockFile({
        name: "testfile.txt",
        matchRanges: [[0, 4]], // "test" is highlighted
      });
      render(() => <FileRemoverRow file={file} onToggleSelect={vi.fn()} />);

      const highlightedSpan = document.querySelector(".bg-warning\\/30");
      expect(highlightedSpan).toBeInTheDocument();
      expect(highlightedSpan).toHaveTextContent("test");
    });

    it("renders non-highlighted portions correctly", () => {
      const file = createMockFile({
        name: "testfile.txt",
        matchRanges: [[0, 4]], // "test" is highlighted
      });
      render(() => <FileRemoverRow file={file} onToggleSelect={vi.fn()} />);

      // "file.txt" should not be highlighted
      expect(screen.getByText("file.txt")).toBeInTheDocument();
    });

    it("handles multiple match ranges", () => {
      const file = createMockFile({
        name: "test_file_test.txt",
        matchRanges: [
          [0, 4],
          [10, 14],
        ], // Both "test" portions
      });
      render(() => <FileRemoverRow file={file} onToggleSelect={vi.fn()} />);

      const highlightedSpans = document.querySelectorAll(".bg-warning\\/30");
      expect(highlightedSpans).toHaveLength(2);
    });

    it("renders without highlights when no match ranges", () => {
      const file = createMockFile({
        name: "noMatch.txt",
        matchRanges: [],
      });
      render(() => <FileRemoverRow file={file} onToggleSelect={vi.fn()} />);

      const highlightedSpans = document.querySelectorAll(".bg-warning\\/30");
      expect(highlightedSpans).toHaveLength(0);
      expect(screen.getByText("noMatch.txt")).toBeInTheDocument();
    });
  });

  describe("Selection styling", () => {
    it("applies selection styling when selected", () => {
      const file = createMockFile({ selected: true });
      const { container } = render(() => (
        <FileRemoverRow file={file} onToggleSelect={vi.fn()} />
      ));

      const rowElement = container.firstChild as HTMLElement;
      expect(rowElement.className).toContain("bg-error/5");
    });

    it("does not apply selection styling when not selected", () => {
      const file = createMockFile({ selected: false });
      const { container } = render(() => (
        <FileRemoverRow file={file} onToggleSelect={vi.fn()} />
      ));

      const rowElement = container.firstChild as HTMLElement;
      expect(rowElement.className).not.toContain("bg-error/5");
    });
  });

  describe("Interactions", () => {
    it("calls onToggleSelect when row is clicked", async () => {
      const onToggleSelect = vi.fn();
      const file = createMockFile({ path: "/test/example.txt" });
      render(() => (
        <FileRemoverRow file={file} onToggleSelect={onToggleSelect} />
      ));

      const row = screen.getByRole("listitem");
      await fireEvent.click(row);

      expect(onToggleSelect).toHaveBeenCalledWith("/test/example.txt");
      expect(onToggleSelect).toHaveBeenCalledTimes(1);
    });

    it("passes correct path to onToggleSelect", async () => {
      const onToggleSelect = vi.fn();
      const file = createMockFile({ path: "/unique/path/to/file.txt" });
      render(() => (
        <FileRemoverRow file={file} onToggleSelect={onToggleSelect} />
      ));

      await fireEvent.click(screen.getByRole("listitem"));

      expect(onToggleSelect).toHaveBeenCalledWith("/unique/path/to/file.txt");
    });

    it("calls onToggleSelect on Enter key press", async () => {
      const onToggleSelect = vi.fn();
      const file = createMockFile({ path: "/test/keypress.txt" });
      render(() => (
        <FileRemoverRow file={file} onToggleSelect={onToggleSelect} />
      ));

      const row = screen.getByRole("listitem");
      await fireEvent.keyDown(row, { key: "Enter" });

      expect(onToggleSelect).toHaveBeenCalledWith("/test/keypress.txt");
    });

    it("calls onToggleSelect on Space key press", async () => {
      const onToggleSelect = vi.fn();
      const file = createMockFile({ path: "/test/space.txt" });
      render(() => (
        <FileRemoverRow file={file} onToggleSelect={onToggleSelect} />
      ));

      const row = screen.getByRole("listitem");
      await fireEvent.keyDown(row, { key: " " });

      expect(onToggleSelect).toHaveBeenCalledWith("/test/space.txt");
    });

    it("does not call onToggleSelect on other key presses", async () => {
      const onToggleSelect = vi.fn();
      const file = createMockFile({ path: "/test/other.txt" });
      render(() => (
        <FileRemoverRow file={file} onToggleSelect={onToggleSelect} />
      ));

      const row = screen.getByRole("listitem");
      await fireEvent.keyDown(row, { key: "a" });
      await fireEvent.keyDown(row, { key: "Escape" });

      expect(onToggleSelect).not.toHaveBeenCalled();
    });
  });

  describe("Edge cases", () => {
    it("handles zero byte file", () => {
      const file = createMockFile({ size: 0 });
      render(() => <FileRemoverRow file={file} onToggleSelect={vi.fn()} />);

      expect(screen.getByText("0 B")).toBeInTheDocument();
    });

    it("handles file with special characters in name", () => {
      const file = createMockFile({ name: "file (1) [copy].txt" });
      render(() => <FileRemoverRow file={file} onToggleSelect={vi.fn()} />);

      expect(screen.getByText("file (1) [copy].txt")).toBeInTheDocument();
    });

    it("handles very long file names", () => {
      const longName = "a".repeat(200) + ".txt";
      const file = createMockFile({ name: longName });
      render(() => <FileRemoverRow file={file} onToggleSelect={vi.fn()} />);

      expect(screen.getByText(longName)).toBeInTheDocument();
    });

    it("handles very long paths", () => {
      const longPath = "/path/".repeat(50) + "file.txt";
      const file = createMockFile({ path: longPath });
      render(() => <FileRemoverRow file={file} onToggleSelect={vi.fn()} />);

      expect(screen.getByText(longPath)).toBeInTheDocument();
    });
  });
});

