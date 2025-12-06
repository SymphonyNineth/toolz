import { render, screen, fireEvent, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockInvoke } from "../../setupTests";
import BatchRenamer from "./index";
import * as dialog from "@tauri-apps/plugin-dialog";

// Mock the dialog plugin
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
  save: vi.fn(),
  message: vi.fn(),
}));

describe("BatchRenamer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly", () => {
    render(() => <BatchRenamer />);
    expect(screen.getByText("File Renamer")).toBeInTheDocument();
    expect(screen.getByText("Select Files")).toBeInTheDocument();
  });

  it("handles file selection and renaming", async () => {
    // Mock file selection
    const mockOpen = vi.mocked(dialog.open);
    mockOpen.mockResolvedValue(["/path/to/file1.txt", "/path/to/file2.txt"]);

    // Mock invoke calls - compute_previews and batch_rename
    mockInvoke.mockImplementation((cmd: string, args?: Record<string, unknown>) => {
      if (cmd === "compute_previews") {
        // Return preview results matching the stored file paths
        return Promise.resolve([
          {
            type: "diff",
            path: "/path/to/file1.txt",
            name: "file1.txt",
            newName: "test1.txt",
            originalSegments: [{ segmentType: "unchanged", text: "file1.txt" }],
            modifiedSegments: [{ segmentType: "unchanged", text: "test1.txt" }],
            hasCollision: false,
          },
          {
            type: "diff",
            path: "/path/to/file2.txt",
            name: "file2.txt",
            newName: "test2.txt",
            originalSegments: [{ segmentType: "unchanged", text: "file2.txt" }],
            modifiedSegments: [{ segmentType: "unchanged", text: "test2.txt" }],
            hasCollision: false,
          },
        ]);
      }
      if (cmd === "batch_rename") {
        return Promise.resolve(["/path/to/test1.txt", "/path/to/test2.txt"]);
      }
      return Promise.resolve([]);
    });

    render(() => <BatchRenamer />);

    // Click Select Files
    const selectButton = screen.getByText("Select Files");
    fireEvent.click(selectButton);

    // Wait for files to be displayed
    await waitFor(() => {
      expect(screen.getAllByText("file1.txt")[0]).toBeInTheDocument();
      expect(screen.getAllByText("file2.txt")[0]).toBeInTheDocument();
    });

    // Enter find text
    const findInput = screen.getByLabelText("Find");
    fireEvent.input(findInput, { target: { value: "file" } });

    // Enter replace text
    const replaceInput = screen.getByLabelText("Replace with");
    fireEvent.input(replaceInput, { target: { value: "test" } });

    // Click Rename Files
    const renameButton = screen.getByText("Rename Files");
    expect(renameButton).not.toBeDisabled();
    fireEvent.click(renameButton);

    // Verify invoke was called
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("batch_rename", {
        files: [
          ["/path/to/file1.txt", "/path/to/test1.txt"],
          ["/path/to/file2.txt", "/path/to/test2.txt"],
        ],
      });
    });
  });
});
