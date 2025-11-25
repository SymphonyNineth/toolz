import { describe, it, expect } from "vitest";
import { createRoot, createSignal } from "solid-js";
import { useFileSelection } from "./useFileSelection";

interface TestFile {
  path: string;
  name: string;
}

describe("useFileSelection", () => {
  it("should initialize with empty selection", () => {
    createRoot((dispose) => {
      const [files] = createSignal<TestFile[]>([
        { path: "/path/file1.txt", name: "file1.txt" },
        { path: "/path/file2.txt", name: "file2.txt" },
      ]);

      const { selectedPaths } = useFileSelection(files);

      expect(selectedPaths().size).toBe(0);
      dispose();
    });
  });

  it("should toggle individual selection", () => {
    createRoot((dispose) => {
      const [files] = createSignal<TestFile[]>([
        { path: "/path/file1.txt", name: "file1.txt" },
        { path: "/path/file2.txt", name: "file2.txt" },
      ]);

      const { selectedPaths, toggleSelection } = useFileSelection(files);

      toggleSelection("/path/file1.txt");
      expect(selectedPaths().has("/path/file1.txt")).toBe(true);
      expect(selectedPaths().size).toBe(1);

      toggleSelection("/path/file1.txt");
      expect(selectedPaths().has("/path/file1.txt")).toBe(false);
      expect(selectedPaths().size).toBe(0);

      dispose();
    });
  });

  it("should select all files", () => {
    createRoot((dispose) => {
      const [files] = createSignal<TestFile[]>([
        { path: "/path/file1.txt", name: "file1.txt" },
        { path: "/path/file2.txt", name: "file2.txt" },
        { path: "/path/file3.txt", name: "file3.txt" },
      ]);

      const { selectedPaths, toggleSelectAll, allSelected } =
        useFileSelection(files);

      expect(allSelected()).toBe(false);

      toggleSelectAll();
      expect(selectedPaths().size).toBe(3);
      expect(allSelected()).toBe(true);

      dispose();
    });
  });

  it("should deselect all when all are selected", () => {
    createRoot((dispose) => {
      const [files] = createSignal<TestFile[]>([
        { path: "/path/file1.txt", name: "file1.txt" },
        { path: "/path/file2.txt", name: "file2.txt" },
      ]);

      const { selectedPaths, toggleSelectAll, allSelected } =
        useFileSelection(files);

      toggleSelectAll(); // Select all
      expect(allSelected()).toBe(true);

      toggleSelectAll(); // Deselect all
      expect(selectedPaths().size).toBe(0);
      expect(allSelected()).toBe(false);

      dispose();
    });
  });

  it("should report someSelected correctly", () => {
    createRoot((dispose) => {
      const [files] = createSignal<TestFile[]>([
        { path: "/path/file1.txt", name: "file1.txt" },
        { path: "/path/file2.txt", name: "file2.txt" },
        { path: "/path/file3.txt", name: "file3.txt" },
      ]);

      const { toggleSelection, someSelected, allSelected } =
        useFileSelection(files);

      expect(someSelected()).toBe(false);
      expect(allSelected()).toBe(false);

      toggleSelection("/path/file1.txt");
      expect(someSelected()).toBe(true);
      expect(allSelected()).toBe(false);

      toggleSelection("/path/file2.txt");
      expect(someSelected()).toBe(true);
      expect(allSelected()).toBe(false);

      toggleSelection("/path/file3.txt");
      expect(someSelected()).toBe(false);
      expect(allSelected()).toBe(true);

      dispose();
    });
  });

  it("should clear selection", () => {
    createRoot((dispose) => {
      const [files] = createSignal<TestFile[]>([
        { path: "/path/file1.txt", name: "file1.txt" },
        { path: "/path/file2.txt", name: "file2.txt" },
      ]);

      const { selectedPaths, toggleSelectAll, clearSelection } =
        useFileSelection(files);

      toggleSelectAll();
      expect(selectedPaths().size).toBe(2);

      clearSelection();
      expect(selectedPaths().size).toBe(0);

      dispose();
    });
  });

  it("should handle empty file list", () => {
    createRoot((dispose) => {
      const [files] = createSignal<TestFile[]>([]);

      const { selectedPaths, allSelected, someSelected } =
        useFileSelection(files);

      expect(selectedPaths().size).toBe(0);
      expect(allSelected()).toBe(false);
      expect(someSelected()).toBe(false);

      dispose();
    });
  });
});

