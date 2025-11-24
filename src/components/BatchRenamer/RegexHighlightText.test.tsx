import { render, screen } from "@solidjs/testing-library";
import RegexHighlightText from "./RegexHighlightText";
import { RegexMatch } from "./renamingUtils";
import { describe, it, expect } from "vitest";

describe("RegexHighlightText", () => {
  describe("Basic Rendering", () => {
    it("renders text without matches correctly", () => {
      render(() => <RegexHighlightText text="Hello World" matches={[]} />);
      expect(screen.getByText("Hello World")).toBeInTheDocument();
    });

    it("renders text with matches and highlights groups", () => {
      const text = "file123.txt";
      // Match: (file)(\d+)
      // Group 0: file123 (0-7)
      // Group 1: file (0-4)
      // Group 2: 123 (4-7)
      const matches: RegexMatch[] = [
        { start: 0, end: 7, groupIndex: 0, content: "file123" },
        { start: 0, end: 4, groupIndex: 1, content: "file" },
        { start: 4, end: 7, groupIndex: 2, content: "123" },
      ];

      render(() => <RegexHighlightText text={text} matches={matches} />);

      // Check if segments are rendered
      expect(screen.getByText("file")).toBeInTheDocument();
      expect(screen.getByText("123")).toBeInTheDocument();
      expect(screen.getByText(".txt")).toBeInTheDocument();

      // Check for highlighting classes (indirectly via title or class presence)
      // The component adds title={`Group ${groupIndex}`}
      const fileSpan = screen.getByText("file");
      expect(fileSpan).toHaveAttribute("title", "Group 1");

      const numberSpan = screen.getByText("123");
      expect(numberSpan).toHaveAttribute("title", "Group 2");
    });

    it("handles nested groups correctly", () => {
      const text = "abc";
      // Match: (a(b)c)
      // Group 0: abc
      // Group 1: abc
      // Group 2: b
      const matches: RegexMatch[] = [
        { start: 0, end: 3, groupIndex: 0, content: "abc" },
        { start: 0, end: 3, groupIndex: 1, content: "abc" },
        { start: 1, end: 2, groupIndex: 2, content: "b" },
      ];

      render(() => <RegexHighlightText text={text} matches={matches} />);

      // Expected segments: "a" (Group 1), "b" (Group 2), "c" (Group 1)
      const aSpan = screen.getByText("a");
      expect(aSpan).toHaveAttribute("title", "Group 1");

      const bSpan = screen.getByText("b");
      expect(bSpan).toHaveAttribute("title", "Group 2");

      const cSpan = screen.getByText("c");
      expect(cSpan).toHaveAttribute("title", "Group 1");
    });
  });

  describe("Edge Cases", () => {
    it("handles empty text", () => {
      const { container } = render(() => (
        <RegexHighlightText text="" matches={[]} />
      ));
      // Should render empty span without errors
      expect(container.querySelector("span")).toBeInTheDocument();
      expect(container.textContent).toBe("");
    });

    it("handles match at the end of text", () => {
      const text = "hello123";
      const matches: RegexMatch[] = [
        { start: 5, end: 8, groupIndex: 0, content: "123" },
        { start: 5, end: 8, groupIndex: 1, content: "123" },
      ];

      render(() => <RegexHighlightText text={text} matches={matches} />);

      expect(screen.getByText("hello")).toBeInTheDocument();
      expect(screen.getByText("123")).toBeInTheDocument();
      expect(screen.getByText("123")).toHaveAttribute("title", "Group 1");
    });

    it("handles match at the beginning of text", () => {
      const text = "123hello";
      const matches: RegexMatch[] = [
        { start: 0, end: 3, groupIndex: 0, content: "123" },
        { start: 0, end: 3, groupIndex: 1, content: "123" },
      ];

      render(() => <RegexHighlightText text={text} matches={matches} />);

      expect(screen.getByText("123")).toBeInTheDocument();
      expect(screen.getByText("hello")).toBeInTheDocument();
      expect(screen.getByText("123")).toHaveAttribute("title", "Group 1");
    });

    it("handles multiple separate matches (global regex)", () => {
      const text = "a1 b2 c3";
      // Multiple matches from global regex
      const matches: RegexMatch[] = [
        { start: 0, end: 2, groupIndex: 0, content: "a1" },
        { start: 0, end: 1, groupIndex: 1, content: "a" },
        { start: 1, end: 2, groupIndex: 2, content: "1" },
        { start: 3, end: 5, groupIndex: 0, content: "b2" },
        { start: 3, end: 4, groupIndex: 1, content: "b" },
        { start: 4, end: 5, groupIndex: 2, content: "2" },
        { start: 6, end: 8, groupIndex: 0, content: "c3" },
        { start: 6, end: 7, groupIndex: 1, content: "c" },
        { start: 7, end: 8, groupIndex: 2, content: "3" },
      ];

      render(() => <RegexHighlightText text={text} matches={matches} />);

      // Check that letters and numbers are highlighted
      expect(screen.getByText("a")).toHaveAttribute("title", "Group 1");
      expect(screen.getByText("1")).toHaveAttribute("title", "Group 2");
      expect(screen.getByText("b")).toHaveAttribute("title", "Group 1");
      expect(screen.getByText("2")).toHaveAttribute("title", "Group 2");
      expect(screen.getByText("c")).toHaveAttribute("title", "Group 1");
      expect(screen.getByText("3")).toHaveAttribute("title", "Group 2");
    });

    it("handles group index greater than color count (wrapping)", () => {
      const text = "test";
      // Use a high group index to test color wrapping
      const matches: RegexMatch[] = [
        { start: 0, end: 4, groupIndex: 15, content: "test" },
      ];

      const { container } = render(() => (
        <RegexHighlightText text={text} matches={matches} />
      ));

      // Should still render without errors
      expect(screen.getByText("test")).toBeInTheDocument();
      // Should have title with group index
      expect(screen.getByText("test")).toHaveAttribute("title", "Group 15");
      // Should have some color class (wrapped)
      const highlightedSpan = container.querySelector("[title='Group 15']");
      expect(highlightedSpan?.className).toContain("bg-");
    });

    it("handles single character matches", () => {
      const text = "abc";
      const matches: RegexMatch[] = [
        { start: 1, end: 2, groupIndex: 0, content: "b" },
        { start: 1, end: 2, groupIndex: 1, content: "b" },
      ];

      render(() => <RegexHighlightText text={text} matches={matches} />);

      expect(screen.getByText("a")).toBeInTheDocument();
      expect(screen.getByText("b")).toBeInTheDocument();
      expect(screen.getByText("c")).toBeInTheDocument();
      expect(screen.getByText("b")).toHaveAttribute("title", "Group 1");
    });

    it("handles full text match (entire string)", () => {
      const text = "hello";
      const matches: RegexMatch[] = [
        { start: 0, end: 5, groupIndex: 0, content: "hello" },
        { start: 0, end: 5, groupIndex: 1, content: "hello" },
      ];

      render(() => <RegexHighlightText text={text} matches={matches} />);

      expect(screen.getByText("hello")).toBeInTheDocument();
      expect(screen.getByText("hello")).toHaveAttribute("title", "Group 1");
    });

    it("handles special characters in text", () => {
      const text = "file(1).txt";
      const matches: RegexMatch[] = [
        { start: 4, end: 7, groupIndex: 0, content: "(1)" },
        { start: 4, end: 7, groupIndex: 1, content: "(1)" },
      ];

      render(() => <RegexHighlightText text={text} matches={matches} />);

      expect(screen.getByText("file")).toBeInTheDocument();
      expect(screen.getByText("(1)")).toBeInTheDocument();
      expect(screen.getByText(".txt")).toBeInTheDocument();
      expect(screen.getByText("(1)")).toHaveAttribute("title", "Group 1");
    });

    it("handles unicode and emoji in text", () => {
      const text = "hello🌍world";
      const matches: RegexMatch[] = [
        { start: 5, end: 7, groupIndex: 0, content: "🌍" },
        { start: 5, end: 7, groupIndex: 1, content: "🌍" },
      ];

      render(() => <RegexHighlightText text={text} matches={matches} />);

      expect(screen.getByText("hello")).toBeInTheDocument();
      expect(screen.getByText("🌍")).toBeInTheDocument();
      expect(screen.getByText("world")).toBeInTheDocument();
    });

    it("renders unmatched portions without highlight", () => {
      const text = "prefix_match_suffix";
      const matches: RegexMatch[] = [
        { start: 7, end: 12, groupIndex: 0, content: "match" },
        { start: 7, end: 12, groupIndex: 1, content: "match" },
      ];

      const { container } = render(() => (
        <RegexHighlightText text={text} matches={matches} />
      ));

      const prefixSpan = screen.getByText("prefix_");
      const suffixSpan = screen.getByText("_suffix");

      // Unmatched portions should not have title attribute
      expect(prefixSpan).not.toHaveAttribute("title");
      expect(suffixSpan).not.toHaveAttribute("title");
    });
  });
});
