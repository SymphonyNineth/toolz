import { render, screen, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import RegexCheatSheetInline from "./RegexCheatSheetInline";
import "@testing-library/jest-dom";

describe("RegexCheatSheetInline", () => {
  const defaultProps = {
    isExpanded: false,
    onToggle: vi.fn(),
  };

  describe("Rendering", () => {
    it("should render the header when collapsed", () => {
      render(() => <RegexCheatSheetInline {...defaultProps} />);

      expect(screen.getByText("Regex Quick Reference")).toBeInTheDocument();
    });

    it("should not show content when collapsed", () => {
      render(() => <RegexCheatSheetInline {...defaultProps} isExpanded={false} />);

      expect(screen.queryByText("Common Patterns")).not.toBeInTheDocument();
      expect(screen.queryByText("Quick Examples")).not.toBeInTheDocument();
    });

    it("should show content when expanded", () => {
      render(() => <RegexCheatSheetInline {...defaultProps} isExpanded={true} />);

      expect(screen.getByText("Common Patterns")).toBeInTheDocument();
      expect(screen.getByText("Quick Examples")).toBeInTheDocument();
    });

    it("should display common patterns when expanded", () => {
      render(() => <RegexCheatSheetInline {...defaultProps} isExpanded={true} />);

      // Use getAllByText since patterns appear in both patterns list and examples
      expect(screen.getAllByText("\\d+").length).toBeGreaterThan(0);
      expect(screen.getAllByText("\\w+").length).toBeGreaterThan(0);
      expect(screen.getAllByText("\\s+").length).toBeGreaterThan(0);
    });

    it("should display quick examples when expanded", () => {
      render(() => <RegexCheatSheetInline {...defaultProps} isExpanded={true} />);

      expect(screen.getByText("Remove numbers")).toBeInTheDocument();
      expect(screen.getByText("Spaces → underscores")).toBeInTheDocument();
      expect(screen.getByText("Swap parts")).toBeInTheDocument();
    });

    it("should display tip about capture groups when expanded", () => {
      render(() => <RegexCheatSheetInline {...defaultProps} isExpanded={true} />);

      expect(screen.getByText(/Tip:/)).toBeInTheDocument();
      // $1 and $2 appear in multiple places (patterns, examples, tip)
      expect(screen.getAllByText(/\$1/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/\$2/).length).toBeGreaterThan(0);
    });
  });

  describe("Interactions", () => {
    it("should call onToggle when header is clicked", () => {
      const onToggle = vi.fn();
      render(() => <RegexCheatSheetInline {...defaultProps} onToggle={onToggle} />);

      const header = screen.getByText("Regex Quick Reference").closest("button");
      fireEvent.click(header!);

      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it("should show 'Show all' button when expanded with quick patterns", () => {
      render(() => <RegexCheatSheetInline {...defaultProps} isExpanded={true} />);

      expect(screen.getByText("Show all")).toBeInTheDocument();
    });

    it("should toggle to 'Show less' when clicking 'Show all'", async () => {
      render(() => <RegexCheatSheetInline {...defaultProps} isExpanded={true} />);

      const showAllBtn = screen.getByText("Show all");
      fireEvent.click(showAllBtn);

      expect(screen.getByText("Show less")).toBeInTheDocument();
    });

    it("should show more patterns after clicking 'Show all'", () => {
      render(() => <RegexCheatSheetInline {...defaultProps} isExpanded={true} />);

      // Initially should not show all patterns
      expect(screen.queryByText("(?:group)")).not.toBeInTheDocument();

      const showAllBtn = screen.getByText("Show all");
      fireEvent.click(showAllBtn);

      // After clicking, should show all patterns
      expect(screen.getByText("(?:group)")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have the header as a button for keyboard accessibility", () => {
      render(() => <RegexCheatSheetInline {...defaultProps} />);

      const button = screen.getByText("Regex Quick Reference").closest("button");
      expect(button).toBeInTheDocument();
    });
  });
});

