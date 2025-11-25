import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import "@testing-library/jest-dom";
import ActionButtons from "./ActionButtons";

describe("ActionButtons", () => {
  const defaultProps = {
    basePath: "",
    onSelectFolder: vi.fn(),
    onSearch: vi.fn(),
    onDelete: vi.fn(),
    onClearList: vi.fn(),
    isSearching: false,
    selectedCount: 0,
    totalCount: 0,
    canSearch: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders Select Folder button", () => {
      render(() => <ActionButtons {...defaultProps} />);

      expect(screen.getByText("Select Folder")).toBeInTheDocument();
    });

    it("renders Search button", () => {
      render(() => <ActionButtons {...defaultProps} />);

      expect(screen.getByText("Search")).toBeInTheDocument();
    });

    it("renders Delete button", () => {
      render(() => <ActionButtons {...defaultProps} />);

      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    it("does not render Clear List when no files", () => {
      render(() => <ActionButtons {...defaultProps} totalCount={0} />);

      expect(screen.queryByText("Clear List")).not.toBeInTheDocument();
    });

    it("renders Clear List when files exist", () => {
      render(() => <ActionButtons {...defaultProps} totalCount={5} />);

      expect(screen.getByText("Clear List")).toBeInTheDocument();
    });

    it("displays base path when set", () => {
      render(() => (
        <ActionButtons {...defaultProps} basePath="/home/user/documents" />
      ));

      expect(screen.getByText("/home/user/documents")).toBeInTheDocument();
    });

    it("does not display base path when empty", () => {
      render(() => <ActionButtons {...defaultProps} basePath="" />);

      expect(
        screen.queryByText("/home/user/documents")
      ).not.toBeInTheDocument();
    });
  });

  describe("Button states", () => {
    it("disables Search button when canSearch is false", () => {
      render(() => <ActionButtons {...defaultProps} canSearch={false} />);

      const searchBtn = screen.getByText("Search").closest("button");
      expect(searchBtn).toBeDisabled();
    });

    it("enables Search button when canSearch is true", () => {
      render(() => <ActionButtons {...defaultProps} canSearch={true} />);

      const searchBtn = screen.getByText("Search").closest("button");
      expect(searchBtn).not.toBeDisabled();
    });

    it("disables Delete button when selectedCount is 0", () => {
      render(() => <ActionButtons {...defaultProps} selectedCount={0} />);

      const deleteBtn = screen.getByText("Delete").closest("button");
      expect(deleteBtn).toBeDisabled();
    });

    it("enables Delete button when selectedCount > 0", () => {
      render(() => <ActionButtons {...defaultProps} selectedCount={5} />);

      const deleteBtn = screen.getByText(/Delete/).closest("button");
      expect(deleteBtn).not.toBeDisabled();
    });

    it("shows selected count in Delete button", () => {
      render(() => <ActionButtons {...defaultProps} selectedCount={10} />);

      expect(screen.getByText(/Delete.*\(10\)/)).toBeInTheDocument();
    });
  });

  describe("Loading state", () => {
    it("shows loading state on Search button when searching", () => {
      render(() => <ActionButtons {...defaultProps} isSearching={true} canSearch={true} />);

      const searchBtn = screen.getByText("Search").closest("button");
      expect(searchBtn).toHaveClass("loading");
    });
  });

  describe("Button interactions", () => {
    it("calls onSelectFolder when Select Folder clicked", async () => {
      const onSelectFolder = vi.fn();
      render(() => (
        <ActionButtons {...defaultProps} onSelectFolder={onSelectFolder} />
      ));

      await fireEvent.click(screen.getByText("Select Folder"));
      expect(onSelectFolder).toHaveBeenCalledTimes(1);
    });

    it("calls onSearch when Search clicked", async () => {
      const onSearch = vi.fn();
      render(() => (
        <ActionButtons {...defaultProps} onSearch={onSearch} canSearch={true} />
      ));

      await fireEvent.click(screen.getByText("Search"));
      expect(onSearch).toHaveBeenCalledTimes(1);
    });

    it("calls onDelete when Delete clicked", async () => {
      const onDelete = vi.fn();
      render(() => (
        <ActionButtons {...defaultProps} onDelete={onDelete} selectedCount={5} />
      ));

      await fireEvent.click(screen.getByText(/Delete/));
      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it("calls onClearList when Clear List clicked", async () => {
      const onClearList = vi.fn();
      render(() => (
        <ActionButtons
          {...defaultProps}
          onClearList={onClearList}
          totalCount={5}
        />
      ));

      await fireEvent.click(screen.getByText("Clear List"));
      expect(onClearList).toHaveBeenCalledTimes(1);
    });

    it("does not call onSearch when disabled", async () => {
      const onSearch = vi.fn();
      render(() => (
        <ActionButtons {...defaultProps} onSearch={onSearch} canSearch={false} />
      ));

      const searchBtn = screen.getByText("Search").closest("button");
      await fireEvent.click(searchBtn!);
      expect(onSearch).not.toHaveBeenCalled();
    });

    it("does not call onDelete when disabled", async () => {
      const onDelete = vi.fn();
      render(() => (
        <ActionButtons {...defaultProps} onDelete={onDelete} selectedCount={0} />
      ));

      const deleteBtn = screen.getByText("Delete").closest("button");
      await fireEvent.click(deleteBtn!);
      expect(onDelete).not.toHaveBeenCalled();
    });
  });

  describe("Edge cases", () => {
    it("handles very long base path", () => {
      const longPath = "/home/user/" + "very-long-directory-name/".repeat(10);
      render(() => <ActionButtons {...defaultProps} basePath={longPath} />);

      expect(screen.getByText(longPath)).toBeInTheDocument();
    });

    it("handles large selected count", () => {
      render(() => <ActionButtons {...defaultProps} selectedCount={999999} />);

      expect(screen.getByText(/Delete.*\(999999\)/)).toBeInTheDocument();
    });
  });
});

