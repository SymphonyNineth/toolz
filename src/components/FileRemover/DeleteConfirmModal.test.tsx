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
    dangerWarning: undefined as string | undefined,
    progress: null,
    compactPreview: false,
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

    it("shows all files when compactPreview is false (default)", () => {
      const files = createMockFiles(12);
      render(() => <DeleteConfirmModal {...defaultProps} files={files} />);

      for (let i = 0; i < 12; i++) {
        expect(screen.getByText(`/test/file${i}.txt`)).toBeInTheDocument();
      }
      expect(screen.queryByText(/\.\.\. and \d+ more files/)).not.toBeInTheDocument();
    });

    it("limits preview to 10 files when compactPreview is true", () => {
      const files = createMockFiles(12);
      render(() => (
        <DeleteConfirmModal {...defaultProps} files={files} compactPreview={true} />
      ));

      for (let i = 0; i < 10; i++) {
        expect(screen.getByText(`/test/file${i}.txt`)).toBeInTheDocument();
      }
      expect(screen.queryByText("/test/file10.txt")).not.toBeInTheDocument();
      expect(screen.queryByText("/test/file11.txt")).not.toBeInTheDocument();
    });

    it("shows '... and X more files' only when compactPreview is true", () => {
      const files = createMockFiles(15);
      const { unmount } = render(() => (
        <DeleteConfirmModal {...defaultProps} files={files} compactPreview={false} />
      ));

      expect(screen.queryByText("... and 5 more files")).not.toBeInTheDocument();

      unmount();
      render(() => (
        <DeleteConfirmModal {...defaultProps} files={files} compactPreview={true} />
      ));

      expect(screen.getByText("... and 5 more files")).toBeInTheDocument();
    });

    it("does not show '... and X more files' when compactPreview is true and exactly 10 files", () => {
      const files = createMockFiles(10);
      render(() => (
        <DeleteConfirmModal {...defaultProps} files={files} compactPreview={true} />
      ));

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

      // Button text changes to "Deleting..." when in loading state
      const deleteBtn = screen.getByText("Deleting...").closest("button");
      expect(deleteBtn).toHaveClass("loading");
      expect(deleteBtn).toBeDisabled();
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

  describe("Danger warning", () => {
    it("shows danger warning when provided", () => {
      const dangerWarning = "Warning: You are deleting files from a system directory!";
      render(() => (
        <DeleteConfirmModal {...defaultProps} dangerWarning={dangerWarning} />
      ));

      expect(screen.getByText(dangerWarning)).toBeInTheDocument();
    });

    it("does not show danger alert when no warning", () => {
      const { container } = render(() => <DeleteConfirmModal {...defaultProps} />);

      // Should only have the standard warning alert (alert-warning), not the error alert (alert-error)
      const warningAlerts = container.querySelectorAll(".alert-warning");
      const errorAlerts = container.querySelectorAll(".alert-error");
      expect(warningAlerts).toHaveLength(1);
      expect(errorAlerts).toHaveLength(0);
    });

    it("shows both danger and standard warnings when danger warning is set", () => {
      const { container } = render(() => (
        <DeleteConfirmModal
          {...defaultProps}
          dangerWarning="This is dangerous!"
        />
      ));

      const warningAlerts = container.querySelectorAll(".alert-warning");
      const errorAlerts = container.querySelectorAll(".alert-error");
      expect(warningAlerts).toHaveLength(1);
      expect(errorAlerts).toHaveLength(1);
    });
  });

  describe("Progress indication", () => {
    it("shows progress bar when progress is provided", () => {
      render(() => (
        <DeleteConfirmModal
          {...defaultProps}
          isDeleting={true}
          progress={{ current: 25, total: 100 }}
        />
      ));

      expect(screen.getByText("Deleting files...")).toBeInTheDocument();
      expect(screen.getByText(/25 \/ 100/)).toBeInTheDocument();
      expect(screen.getByText(/25%/)).toBeInTheDocument();
    });

    it("hides file preview when progress is shown", () => {
      render(() => (
        <DeleteConfirmModal
          {...defaultProps}
          isDeleting={true}
          progress={{ current: 25, total: 100 }}
        />
      ));

      expect(screen.queryByText("Files to be deleted:")).not.toBeInTheDocument();
    });

    it("shows progress at 0%", () => {
      render(() => (
        <DeleteConfirmModal
          {...defaultProps}
          isDeleting={true}
          progress={{ current: 0, total: 100 }}
        />
      ));

      expect(screen.getByText(/0 \/ 100/)).toBeInTheDocument();
      expect(screen.getByText(/0%/)).toBeInTheDocument();
    });

    it("shows progress at 100%", () => {
      render(() => (
        <DeleteConfirmModal
          {...defaultProps}
          isDeleting={true}
          progress={{ current: 100, total: 100 }}
        />
      ));

      expect(screen.getByText(/100 \/ 100/)).toBeInTheDocument();
      expect(screen.getByText(/100%/)).toBeInTheDocument();
    });

    it("shows file preview when no progress", () => {
      render(() => <DeleteConfirmModal {...defaultProps} progress={null} />);

      expect(screen.getByText("Files to be deleted:")).toBeInTheDocument();
    });

    it("changes button text to Deleting when in progress", () => {
      render(() => (
        <DeleteConfirmModal
          {...defaultProps}
          isDeleting={true}
          progress={{ current: 50, total: 100 }}
        />
      ));

      expect(screen.getByText("Deleting...")).toBeInTheDocument();
      expect(screen.queryByText("Delete Files")).not.toBeInTheDocument();
    });
  });
});

