import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import "@testing-library/jest-dom";
import DeleteConfirmModal from "./DeleteConfirmModal";
import { FileMatchItem } from "./types";

describe("DeleteConfirmModal", () => {
  const createMockFiles = (count: number = 1): FileMatchItem[] =>
    Array.from({ length: count }, (_, i) => ({
      path: `/test/file${i}.txt`,
      name: `file${i}.txt`,
      matchRanges: [],
      size: 1024,
      isDirectory: false,
      selected: true,
    }));

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    files: createMockFiles(1),
    isDeleting: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders modal when isOpen is true", () => {
      render(() => <DeleteConfirmModal {...defaultProps} />);

      expect(screen.getByText("Confirm Deletion")).toBeInTheDocument();
    });

    it("does not render modal when isOpen is false", () => {
      render(() => <DeleteConfirmModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText("Confirm Deletion")).not.toBeInTheDocument();
    });

    it("shows warning message about permanent deletion", () => {
      render(() => <DeleteConfirmModal {...defaultProps} />);

      expect(screen.getByText("This action cannot be undone")).toBeInTheDocument();
    });

    it("shows file count in warning", () => {
      render(() => <DeleteConfirmModal {...defaultProps} />);

      // Look for the strong element containing the count
      expect(screen.getByText("1", { selector: "strong" })).toBeInTheDocument();
      expect(screen.getByText(/files.*from your disk/)).toBeInTheDocument();
    });

    it("shows total size in warning", () => {
      render(() => <DeleteConfirmModal {...defaultProps} />);

      expect(screen.getByText(/1 KB/)).toBeInTheDocument();
    });

    it("shows Cancel button", () => {
      render(() => <DeleteConfirmModal {...defaultProps} />);

      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("shows Delete Files button", () => {
      render(() => <DeleteConfirmModal {...defaultProps} />);

      expect(screen.getByText("Delete Files")).toBeInTheDocument();
    });
  });

  describe("File preview", () => {
    it("displays file paths in preview", () => {
      render(() => <DeleteConfirmModal {...defaultProps} />);

      expect(screen.getByText("/test/file0.txt")).toBeInTheDocument();
    });

    it("shows up to 10 files in preview", () => {
      const files = createMockFiles(10);
      render(() => <DeleteConfirmModal {...defaultProps} files={files} />);

      for (let i = 0; i < 10; i++) {
        expect(screen.getByText(`/test/file${i}.txt`)).toBeInTheDocument();
      }
    });

    it("shows '... and X more files' when more than 10 files", () => {
      const files = createMockFiles(15);
      render(() => <DeleteConfirmModal {...defaultProps} files={files} />);

      expect(screen.getByText("... and 5 more files")).toBeInTheDocument();
    });

    it("does not show '... and X more files' when exactly 10 files", () => {
      const files = createMockFiles(10);
      render(() => <DeleteConfirmModal {...defaultProps} files={files} />);

      expect(screen.queryByText(/\.\.\. and \d+ more files/)).not.toBeInTheDocument();
    });

    it("shows files to be deleted label", () => {
      render(() => <DeleteConfirmModal {...defaultProps} />);

      expect(screen.getByText("Files to be deleted:")).toBeInTheDocument();
    });
  });

  describe("Button interactions", () => {
    it("calls onClose when Cancel clicked", async () => {
      const onClose = vi.fn();
      render(() => <DeleteConfirmModal {...defaultProps} onClose={onClose} />);

      await fireEvent.click(screen.getByText("Cancel"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onConfirm when Delete Files clicked", async () => {
      const onConfirm = vi.fn();
      render(() => <DeleteConfirmModal {...defaultProps} onConfirm={onConfirm} />);

      await fireEvent.click(screen.getByText("Delete Files"));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe("Loading state", () => {
    it("disables Cancel button when deleting", () => {
      render(() => <DeleteConfirmModal {...defaultProps} isDeleting={true} />);

      const cancelBtn = screen.getByText("Cancel").closest("button");
      expect(cancelBtn).toBeDisabled();
    });

    it("shows loading state on Delete button when deleting", () => {
      render(() => <DeleteConfirmModal {...defaultProps} isDeleting={true} />);

      const deleteBtn = screen.getByText("Delete Files").closest("button");
      expect(deleteBtn).toHaveClass("loading");
    });
  });

  describe("Size calculations", () => {
    it("calculates total size correctly", () => {
      const files = [
        { ...createMockFiles(1)[0], size: 1024 * 1024 }, // 1 MB
        { ...createMockFiles(1)[0], path: "/test/file2.txt", size: 1024 * 1024 * 2 }, // 2 MB
      ];
      render(() => <DeleteConfirmModal {...defaultProps} files={files} />);

      expect(screen.getByText(/3 MB/)).toBeInTheDocument();
    });

    it("handles zero-size files", () => {
      const files = [{ ...createMockFiles(1)[0], size: 0 }];
      render(() => <DeleteConfirmModal {...defaultProps} files={files} />);

      expect(screen.getByText(/0 B/)).toBeInTheDocument();
    });
  });

  describe("Multiple files display", () => {
    it("shows correct count for multiple files", () => {
      const files = createMockFiles(5);
      render(() => <DeleteConfirmModal {...defaultProps} files={files} />);

      // Look for the strong element containing the count
      expect(screen.getByText("5", { selector: "strong" })).toBeInTheDocument();
    });

    it("shows correct total size for multiple files", () => {
      const files = createMockFiles(5); // Each 1024 bytes = 5 KB total
      render(() => <DeleteConfirmModal {...defaultProps} files={files} />);

      expect(screen.getByText(/5 KB/)).toBeInTheDocument();
    });
  });

  describe("Edge cases", () => {
    it("handles empty files array", () => {
      render(() => <DeleteConfirmModal {...defaultProps} files={[]} />);

      // Look for the strong element containing the count
      expect(screen.getByText("0", { selector: "strong" })).toBeInTheDocument();
      // The message contains the size
      expect(screen.getByText(/0 B.*from your disk/)).toBeInTheDocument();
    });

    it("handles very large file sizes", () => {
      const files = [{ ...createMockFiles(1)[0], size: 1024 * 1024 * 1024 * 10 }]; // 10 GB
      render(() => <DeleteConfirmModal {...defaultProps} files={files} />);

      expect(screen.getByText(/10 GB/)).toBeInTheDocument();
    });

    it("handles files with very long paths", () => {
      const longPath = "/very/long/path/".repeat(10) + "file.txt";
      const files = [{ ...createMockFiles(1)[0], path: longPath }];
      render(() => <DeleteConfirmModal {...defaultProps} files={files} />);

      expect(screen.getByText(longPath)).toBeInTheDocument();
    });
  });
});

