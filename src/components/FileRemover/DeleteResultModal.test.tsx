import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import "@testing-library/jest-dom";
import DeleteResultModal from "./DeleteResultModal";
import { DeleteResult } from "./types";

describe("DeleteResultModal", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it("does not render when result is null", () => {
    render(() => <DeleteResultModal result={null} onClose={mockOnClose} />);

    expect(screen.queryByText("Deletion Complete")).not.toBeInTheDocument();
  });

  it("renders success state when all deletions succeed", () => {
    const result: DeleteResult = {
      successful: ["/path/file1.txt", "/path/file2.txt"],
      failed: [],
      deletedDirs: [],
    };

    render(() => <DeleteResultModal result={result} onClose={mockOnClose} />);

    expect(screen.getByText("Deletion Complete")).toBeInTheDocument();
    expect(
      screen.getByText("All files were successfully deleted")
    ).toBeInTheDocument();
    expect(screen.getByText("Files Deleted")).toBeInTheDocument();
  });

  it("renders with failures state when some deletions fail", () => {
    const result: DeleteResult = {
      successful: ["/path/file1.txt"],
      failed: [["/path/file2.txt", "Permission denied"]],
      deletedDirs: [],
    };

    render(() => <DeleteResultModal result={result} onClose={mockOnClose} />);

    expect(screen.getByText("Deletion Completed with Errors")).toBeInTheDocument();
    expect(
      screen.getByText("Some files could not be deleted")
    ).toBeInTheDocument();
    expect(screen.getByText("Files Deleted")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("displays failed file paths and errors", () => {
    const result: DeleteResult = {
      successful: [],
      failed: [["/path/to/file.txt", "Permission denied"]],
      deletedDirs: [],
    };

    render(() => <DeleteResultModal result={result} onClose={mockOnClose} />);

    expect(screen.getByText("/path/to/file.txt")).toBeInTheDocument();
    expect(screen.getByText("Permission denied")).toBeInTheDocument();
  });

  it("displays deleted directories when present", () => {
    const result: DeleteResult = {
      successful: ["/path/file.txt"],
      failed: [],
      deletedDirs: ["/path/empty-dir"],
    };

    render(() => <DeleteResultModal result={result} onClose={mockOnClose} />);

    expect(screen.getByText("Empty directories removed:")).toBeInTheDocument();
    expect(screen.getByText("/path/empty-dir")).toBeInTheDocument();
  });

  it("shows truncated list when more than 5 failed files", () => {
    const result: DeleteResult = {
      successful: [],
      failed: Array.from({ length: 7 }, (_, i) => [
        `/path/file${i}.txt`,
        "Error",
      ]) as [string, string][],
      deletedDirs: [],
    };

    render(() => <DeleteResultModal result={result} onClose={mockOnClose} />);

    expect(screen.getByText("... and 2 more errors")).toBeInTheDocument();
  });

  it("shows truncated list when more than 5 deleted directories", () => {
    const result: DeleteResult = {
      successful: ["/path/file.txt"],
      failed: [],
      deletedDirs: Array.from({ length: 7 }, (_, i) => `/path/dir${i}`),
    };

    render(() => <DeleteResultModal result={result} onClose={mockOnClose} />);

    expect(screen.getByText("... and 2 more")).toBeInTheDocument();
  });

  it("calls onClose when Close button is clicked", async () => {
    const result: DeleteResult = {
      successful: ["/path/file.txt"],
      failed: [],
      deletedDirs: [],
    };

    render(() => <DeleteResultModal result={result} onClose={mockOnClose} />);

    const closeButton = screen.getByRole("button", { name: /close/i });
    await fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});

