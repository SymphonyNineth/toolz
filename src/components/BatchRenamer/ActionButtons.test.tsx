import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import "@testing-library/jest-dom";
import ActionButtons from "./ActionButtons";

describe("ActionButtons", () => {
  const defaultProps = {
    onSelectFiles: vi.fn(),
    onSelectFolders: vi.fn(),
    onRename: vi.fn(),
    onCancelScan: vi.fn(),
    onCancelRename: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders all action buttons when idle", () => {
      render(() => <ActionButtons {...defaultProps} />);

      expect(screen.getByText("Select Files")).toBeInTheDocument();
      expect(screen.getByText("Select Folders")).toBeInTheDocument();
      expect(screen.getByText("Rename Files")).toBeInTheDocument();
    });

    it("shows file count summary when files are selected", () => {
      render(() => (
        <ActionButtons {...defaultProps} totalFilesCount={10} filesToRenameCount={5} />
      ));

      expect(screen.getByText("10")).toBeInTheDocument();
      expect(screen.getByText("files selected")).toBeInTheDocument();
      expect(screen.getByText("5 will be renamed")).toBeInTheDocument();
    });

    it("does not show summary when no files selected", () => {
      render(() => <ActionButtons {...defaultProps} totalFilesCount={0} />);

      expect(screen.queryByText("files selected")).not.toBeInTheDocument();
    });
  });

  describe("Button states", () => {
    it("disables buttons when scanning", () => {
      render(() => <ActionButtons {...defaultProps} isScanning={true} />);

      const selectFilesBtn = screen.getByText("Select Files").closest("button");
      expect(selectFilesBtn).toBeDisabled();
    });

    it("disables buttons when renaming", () => {
      render(() => <ActionButtons {...defaultProps} isRenaming={true} />);

      const selectFilesBtn = screen.getByText("Select Files").closest("button");
      expect(selectFilesBtn).toBeDisabled();
    });

    it("disables rename button when renameDisabledReason is provided", () => {
      render(() => (
        <ActionButtons {...defaultProps} renameDisabledReason="No changes to apply" />
      ));

      const renameBtn = screen.getByText("Rename Files").closest("button");
      expect(renameBtn).toBeDisabled();
    });

    it("shows badge with file count when files will be renamed", () => {
      render(() => (
        <ActionButtons {...defaultProps} filesToRenameCount={5} />
      ));

      expect(screen.getByText("5")).toBeInTheDocument();
    });
  });

  describe("Cancel buttons during scanning", () => {
    it("shows Cancel Scan button when scanning", () => {
      render(() => <ActionButtons {...defaultProps} isScanning={true} />);

      expect(screen.getByText("Cancel Scan")).toBeInTheDocument();
      expect(screen.queryByText("Select Folders")).not.toBeInTheDocument();
    });

    it("calls onCancelScan when Cancel Scan is clicked", async () => {
      const onCancelScan = vi.fn();
      render(() => (
        <ActionButtons {...defaultProps} isScanning={true} onCancelScan={onCancelScan} />
      ));

      const cancelBtn = screen.getByText("Cancel Scan").closest("button");
      await fireEvent.click(cancelBtn!);

      expect(onCancelScan).toHaveBeenCalledTimes(1);
    });

    it("hides Select Folders button when scanning", () => {
      render(() => <ActionButtons {...defaultProps} isScanning={true} />);

      expect(screen.queryByText("Select Folders")).not.toBeInTheDocument();
    });
  });

  describe("Cancel buttons during renaming", () => {
    it("shows Cancel Rename button when renaming", () => {
      render(() => <ActionButtons {...defaultProps} isRenaming={true} />);

      expect(screen.getByText("Cancel Rename")).toBeInTheDocument();
      expect(screen.queryByText("Rename Files")).not.toBeInTheDocument();
    });

    it("calls onCancelRename when Cancel Rename is clicked", async () => {
      const onCancelRename = vi.fn();
      render(() => (
        <ActionButtons {...defaultProps} isRenaming={true} onCancelRename={onCancelRename} />
      ));

      const cancelBtn = screen.getByText("Cancel Rename").closest("button");
      await fireEvent.click(cancelBtn!);

      expect(onCancelRename).toHaveBeenCalledTimes(1);
    });

    it("hides Rename Files button when renaming", () => {
      render(() => <ActionButtons {...defaultProps} isRenaming={true} />);

      expect(screen.queryByText("Rename Files")).not.toBeInTheDocument();
    });
  });

  describe("Button interactions when idle", () => {
    it("calls onSelectFiles when Select Files is clicked", async () => {
      const onSelectFiles = vi.fn();
      render(() => <ActionButtons {...defaultProps} onSelectFiles={onSelectFiles} />);

      const btn = screen.getByText("Select Files").closest("button");
      await fireEvent.click(btn!);

      expect(onSelectFiles).toHaveBeenCalledTimes(1);
    });

    it("calls onSelectFolders when Select Folders is clicked", async () => {
      const onSelectFolders = vi.fn();
      render(() => <ActionButtons {...defaultProps} onSelectFolders={onSelectFolders} />);

      const btn = screen.getByText("Select Folders").closest("button");
      await fireEvent.click(btn!);

      expect(onSelectFolders).toHaveBeenCalledTimes(1);
    });

    it("calls onRename when Rename Files is clicked", async () => {
      const onRename = vi.fn();
      render(() => (
        <ActionButtons {...defaultProps} onRename={onRename} filesToRenameCount={5} />
      ));

      const btn = screen.getByText("Rename Files").closest("button");
      await fireEvent.click(btn!);

      expect(onRename).toHaveBeenCalledTimes(1);
    });
  });

  describe("Visual feedback", () => {
    it("shows warning variant for cancel buttons during scan", () => {
      render(() => <ActionButtons {...defaultProps} isScanning={true} />);

      const cancelBtn = screen.getByText("Cancel Scan").closest("button");
      expect(cancelBtn).toHaveClass("btn-warning");
    });

    it("shows warning variant for cancel buttons during rename", () => {
      render(() => <ActionButtons {...defaultProps} isRenaming={true} />);

      const cancelBtn = screen.getByText("Cancel Rename").closest("button");
      expect(cancelBtn).toHaveClass("btn-warning");
    });

    it("shows success variant for rename button when files are ready", () => {
      render(() => (
        <ActionButtons {...defaultProps} filesToRenameCount={5} />
      ));

      const renameBtn = screen.getByText("Rename Files").closest("button");
      expect(renameBtn).toHaveClass("btn-success");
    });
  });
});

