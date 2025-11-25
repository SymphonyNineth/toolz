import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import "@testing-library/jest-dom";
import RegexCheatSheet from "./RegexCheatSheet";

describe("RegexCheatSheet", () => {
  const defaultProps = {
    isExpanded: false,
    onToggle: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the header button", () => {
      render(() => <RegexCheatSheet {...defaultProps} />);

      expect(screen.getByText("Regex Quick Reference")).toBeInTheDocument();
    });

    it("renders emoji icon", () => {
      render(() => <RegexCheatSheet {...defaultProps} />);

      expect(screen.getByText("📖")).toBeInTheDocument();
    });

    it("does not render content when collapsed", () => {
      render(() => <RegexCheatSheet {...defaultProps} isExpanded={false} />);

      expect(screen.queryByText("Common Patterns")).not.toBeInTheDocument();
    });

    it("renders content when expanded", () => {
      render(() => <RegexCheatSheet {...defaultProps} isExpanded={true} />);

      expect(screen.getByText("Common Patterns")).toBeInTheDocument();
      expect(screen.getByText("Quick Examples")).toBeInTheDocument();
    });
  });

  describe("Toggle behavior", () => {
    it("calls onToggle when header clicked", async () => {
      const onToggle = vi.fn();
      render(() => <RegexCheatSheet {...defaultProps} onToggle={onToggle} />);

      await fireEvent.click(screen.getByText("Regex Quick Reference"));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe("Pattern display", () => {
    it("shows quick patterns by default", () => {
      render(() => <RegexCheatSheet {...defaultProps} isExpanded={true} />);

      // Pattern appears multiple times (in patterns list and examples), use getAllByText
      expect(screen.getAllByText("\\d+").length).toBeGreaterThan(0);
      expect(screen.getByText("One or more digits")).toBeInTheDocument();
    });

    it("shows 'Show all' button by default", () => {
      render(() => <RegexCheatSheet {...defaultProps} isExpanded={true} />);

      expect(screen.getByText("Show all")).toBeInTheDocument();
    });

    it("toggles to all patterns when Show all clicked", async () => {
      render(() => <RegexCheatSheet {...defaultProps} isExpanded={true} />);

      await fireEvent.click(screen.getByText("Show all"));
      
      expect(screen.getByText("Show less")).toBeInTheDocument();
      // Check for a pattern that's only in allPatterns
      expect(screen.getByText("Any single character")).toBeInTheDocument();
    });
  });

  describe("Examples", () => {
    it("shows default examples when none provided", () => {
      render(() => <RegexCheatSheet {...defaultProps} isExpanded={true} />);

      expect(screen.getByText("Match numbers")).toBeInTheDocument();
    });

    it("shows custom examples when provided", () => {
      const customExamples = [
        {
          title: "Custom Example",
          find: "test",
          example: "test → matched",
        },
      ];

      render(() => (
        <RegexCheatSheet
          {...defaultProps}
          isExpanded={true}
          examples={customExamples}
        />
      ));

      expect(screen.getByText("Custom Example")).toBeInTheDocument();
    });

    it("shows replacement when showReplacement is true", () => {
      const examples = [
        {
          title: "Replacement Example",
          find: "old",
          replace: "new",
          example: "old → new",
        },
      ];

      render(() => (
        <RegexCheatSheet
          {...defaultProps}
          isExpanded={true}
          examples={examples}
          showReplacement={true}
        />
      ));

      expect(screen.getByText("Replace:")).toBeInTheDocument();
    });

    it("hides replacement when showReplacement is false", () => {
      const examples = [
        {
          title: "No Replacement Example",
          find: "pattern",
          replace: "replacement",
          example: "example",
        },
      ];

      render(() => (
        <RegexCheatSheet
          {...defaultProps}
          isExpanded={true}
          examples={examples}
          showReplacement={false}
        />
      ));

      expect(screen.queryByText("Replace:")).not.toBeInTheDocument();
    });
  });

  describe("Tips", () => {
    it("shows default tip text", () => {
      render(() => <RegexCheatSheet {...defaultProps} isExpanded={true} />);

      expect(screen.getByText(/Tip:/)).toBeInTheDocument();
      expect(
        screen.getByText(/Use capture groups \(parentheses\) to match parts of the pattern/)
      ).toBeInTheDocument();
    });

    it("shows custom tip text when provided", () => {
      render(() => (
        <RegexCheatSheet
          {...defaultProps}
          isExpanded={true}
          tipText="Custom tip message"
        />
      ));

      expect(screen.getByText("Custom tip message")).toBeInTheDocument();
    });
  });
});

