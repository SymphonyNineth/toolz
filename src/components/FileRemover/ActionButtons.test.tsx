import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import "@testing-library/jest-dom";
import ActionButtons from "./ActionButtons";

describe("ActionButtons", () => {
  const defaultProps = {
    onDelete: vi.fn(),
    onClearList: vi.fn(),
    selectedCount: 0,
    totalCount: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("always renders the action bar even when no files", () => {
      render(() => <ActionButtons {...defaultProps} totalCount={0} />);

      expect(screen.getByText("Clear List")).toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();
      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByText("files found")).toBeInTheDocument();
      expect(screen.getByText("0 selected for deletion")).toBeInTheDocument();
    });

    it("renders action bar when files exist", () => {
      render(() => <ActionButtons {...defaultProps} totalCount={5} />);

      expect(screen.getByText("Clear List")).toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    it("shows file count when files exist", () => {
      render(() => <ActionButtons {...defaultProps} totalCount={10} />);

      expect(screen.getByText("10")).toBeInTheDocument();
      expect(screen.getByText("files found")).toBeInTheDocument();
    });

    it("shows selected count when files are selected", () => {
      render(() => (
        <ActionButtons {...defaultProps} totalCount={10} selectedCount={5} />
      ));

      expect(screen.getByText("5 selected for deletion")).toBeInTheDocument();
    });
  });

  describe("Button states", () => {
    it("disables Delete button when selectedCount is 0", () => {
      render(() => (
        <ActionButtons {...defaultProps} totalCount={5} selectedCount={0} />
      ));

      const deleteBtn = screen.getByText("Delete").closest("button");
      expect(deleteBtn).toBeDisabled();
    });

    it("enables Delete button when selectedCount > 0", () => {
      render(() => (
        <ActionButtons {...defaultProps} totalCount={10} selectedCount={5} />
      ));

      const deleteBtn = screen.getByText(/Delete/).closest("button");
      expect(deleteBtn).not.toBeDisabled();
    });

    it("disables Clear List button when totalCount is 0", () => {
      render(() => (
        <ActionButtons {...defaultProps} totalCount={0} selectedCount={0} />
      ));

      const clearBtn = screen.getByText("Clear List").closest("button");
      expect(clearBtn).toBeDisabled();
    });

    it("enables Clear List button when totalCount > 0", () => {
      render(() => (
        <ActionButtons {...defaultProps} totalCount={5} selectedCount={0} />
      ));

      const clearBtn = screen.getByText("Clear List").closest("button");
      expect(clearBtn).not.toBeDisabled();
    });

    it("shows selected count in Delete button", () => {
      render(() => (
        <ActionButtons {...defaultProps} totalCount={10} selectedCount={10} />
      ));

      expect(screen.getByText(/Delete.*\(10\)/)).toBeInTheDocument();
    });
  });

  describe("Button interactions", () => {
    it("calls onDelete when Delete clicked", async () => {
      const onDelete = vi.fn();
      render(() => (
        <ActionButtons
          {...defaultProps}
          onDelete={onDelete}
          totalCount={5}
          selectedCount={5}
        />
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

    it("does not call onDelete when disabled", async () => {
      const onDelete = vi.fn();
      render(() => (
        <ActionButtons
          {...defaultProps}
          onDelete={onDelete}
          totalCount={5}
          selectedCount={0}
        />
      ));

      const deleteBtn = screen.getByText("Delete").closest("button");
      await fireEvent.click(deleteBtn!);
      expect(onDelete).not.toHaveBeenCalled();
    });
  });

  describe("Edge cases", () => {
    it("handles large selected count", () => {
      render(() => (
        <ActionButtons
          {...defaultProps}
          totalCount={999999}
          selectedCount={999999}
        />
      ));

      expect(screen.getByText(/Delete.*\(999999\)/)).toBeInTheDocument();
    });

    it("shows zero selected when none are selected", () => {
      render(() => (
        <ActionButtons {...defaultProps} totalCount={100} selectedCount={0} />
      ));

      expect(screen.getByText("0 selected for deletion")).toBeInTheDocument();
    });
  });
});
