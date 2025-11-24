import { render, screen } from "@solidjs/testing-library";
import RegexHighlightText from "./RegexHighlightText";
import { RegexMatch } from "./renamingUtils";
import { describe, it, expect } from "vitest";

describe("RegexHighlightText", () => {
  describe("Original Mode - Basic Rendering", () => {
    it("renders text without matches correctly", () => {
      render(() => <RegexHighlightText text="Hello World" matches={[]} mode="original" />);
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

      render(() => <RegexHighlightText text={text} matches={matches} mode="original" />);

      // Check if segments are rendered
      expect(screen.getByText("file")).toBeInTheDocument();
      expect(screen.getByText("123")).toBeInTheDocument();
      expect(screen.getByText(".txt")).toBeInTheDocument();

      // Check for highlighting classes (indirectly via title)
      const fileSpan = screen.getByText("file");
      expect(fileSpan).toHaveAttribute("title", "Group 1");

      const numberSpan = screen.getByText("123");
      expect(numberSpan).toHaveAttribute("title", "Group 2");
    });

    it("handles group 0 only (no capture groups) with red highlighting", () => {
      const text = "hello world";
      const matches: RegexMatch[] = [
        { start: 0, end: 5, groupIndex: 0, content: "hello" },
      ];

      const { container } = render(() => (
        <RegexHighlightText text={text} matches={matches} mode="original" />
      ));

      const helloSpan = screen.getByText("hello");
      expect(helloSpan).toHaveAttribute("title", "Matched text (will be replaced)");
      // Should have error/red classes for removed text
      expect(helloSpan.className).toContain("text-error");
      expect(helloSpan.className).toContain("line-through");
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

      render(() => <RegexHighlightText text={text} matches={matches} mode="original" />);

      // Expected segments: "a" (Group 1), "b" (Group 2), "c" (Group 1)
      const aSpan = screen.getByText("a");
      expect(aSpan).toHaveAttribute("title", "Group 1");

      const bSpan = screen.getByText("b");
      expect(bSpan).toHaveAttribute("title", "Group 2");

      const cSpan = screen.getByText("c");
      expect(cSpan).toHaveAttribute("title", "Group 1");
    });
  });

  describe("Modified Mode - Basic Rendering", () => {
    it("renders text without matches correctly", () => {
      render(() => <RegexHighlightText text="Hello World" matches={[]} mode="modified" />);
      expect(screen.getByText("Hello World")).toBeInTheDocument();
    });

    it("highlights literal replacement text (groupIndex -1) as added/green", () => {
      const text = "newtext";
      const matches: RegexMatch[] = [
        { start: 0, end: 7, groupIndex: -1, content: "newtext" },
      ];

      const { container } = render(() => (
        <RegexHighlightText text={text} matches={matches} mode="modified" />
      ));

      const newTextSpan = screen.getByText("newtext");
      expect(newTextSpan).toHaveAttribute("title", "New text");
      // Should have success/green classes for added text
      expect(newTextSpan.className).toContain("text-success");
    });

    it("renders group references with their group colors", () => {
      const text = "file123";
      // Simulating $1$2 replacement where file is group 1 and 123 is group 2
      const matches: RegexMatch[] = [
        { start: 0, end: 4, groupIndex: 1, content: "file" },
        { start: 4, end: 7, groupIndex: 2, content: "123" },
      ];

      render(() => <RegexHighlightText text={text} matches={matches} mode="modified" />);

      const fileSpan = screen.getByText("file");
      expect(fileSpan).toHaveAttribute("title", "Group 1");

      const numberSpan = screen.getByText("123");
      expect(numberSpan).toHaveAttribute("title", "Group 2");
    });

    it("handles mixed literal and group reference text", () => {
      const text = "prefix_file_suffix";
      // Simulating "prefix_$1_suffix" where "prefix_" and "_suffix" are literal (-1)
      // and "file" is from group 1
      const matches: RegexMatch[] = [
        { start: 0, end: 7, groupIndex: -1, content: "prefix_" },
        { start: 7, end: 11, groupIndex: 1, content: "file" },
        { start: 11, end: 18, groupIndex: -1, content: "_suffix" },
      ];

      render(() => <RegexHighlightText text={text} matches={matches} mode="modified" />);

      const prefixSpan = screen.getByText("prefix_");
      expect(prefixSpan).toHaveAttribute("title", "New text");
      expect(prefixSpan.className).toContain("text-success");

      const fileSpan = screen.getByText("file");
      expect(fileSpan).toHaveAttribute("title", "Group 1");

      const suffixSpan = screen.getByText("_suffix");
      expect(suffixSpan).toHaveAttribute("title", "New text");
      expect(suffixSpan.className).toContain("text-success");
    });
  });

  describe("Edge Cases", () => {
    it("handles empty text", () => {
      const { container } = render(() => (
        <RegexHighlightText text="" matches={[]} mode="original" />
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

      render(() => <RegexHighlightText text={text} matches={matches} mode="original" />);

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

      render(() => <RegexHighlightText text={text} matches={matches} mode="original" />);

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

      render(() => <RegexHighlightText text={text} matches={matches} mode="original" />);

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
        <RegexHighlightText text={text} matches={matches} mode="original" />
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

      render(() => <RegexHighlightText text={text} matches={matches} mode="original" />);

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

      render(() => <RegexHighlightText text={text} matches={matches} mode="original" />);

      expect(screen.getByText("hello")).toBeInTheDocument();
      expect(screen.getByText("hello")).toHaveAttribute("title", "Group 1");
    });

    it("handles special characters in text", () => {
      const text = "file(1).txt";
      const matches: RegexMatch[] = [
        { start: 4, end: 7, groupIndex: 0, content: "(1)" },
        { start: 4, end: 7, groupIndex: 1, content: "(1)" },
      ];

      render(() => <RegexHighlightText text={text} matches={matches} mode="original" />);

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

      render(() => <RegexHighlightText text={text} matches={matches} mode="original" />);

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
        <RegexHighlightText text={text} matches={matches} mode="original" />
      ));

      const prefixSpan = screen.getByText("prefix_");
      const suffixSpan = screen.getByText("_suffix");

      // Unmatched portions should not have title attribute
      expect(prefixSpan).not.toHaveAttribute("title");
      expect(suffixSpan).not.toHaveAttribute("title");
    });
  });

  describe("Color Class Verification", () => {
    it("uses error/red color for group 0 in original mode", () => {
      const text = "match";
      const matches: RegexMatch[] = [
        { start: 0, end: 5, groupIndex: 0, content: "match" },
      ];

      render(() => <RegexHighlightText text={text} matches={matches} mode="original" />);

      const matchSpan = screen.getByText("match");
      expect(matchSpan.className).toContain("bg-error");
      expect(matchSpan.className).toContain("text-error");
      expect(matchSpan.className).toContain("line-through");
    });

    it("uses success/green color for literal text (-1) in modified mode", () => {
      const text = "added";
      const matches: RegexMatch[] = [
        { start: 0, end: 5, groupIndex: -1, content: "added" },
      ];

      render(() => <RegexHighlightText text={text} matches={matches} mode="modified" />);

      const addedSpan = screen.getByText("added");
      expect(addedSpan.className).toContain("bg-success");
      expect(addedSpan.className).toContain("text-success");
    });

    it("does not use red or green for capture groups (1+)", () => {
      const text = "group1";
      const matches: RegexMatch[] = [
        { start: 0, end: 6, groupIndex: 1, content: "group1" },
      ];

      render(() => <RegexHighlightText text={text} matches={matches} mode="original" />);

      const groupSpan = screen.getByText("group1");
      // Should not have error (red) or success (green) colors
      expect(groupSpan.className).not.toContain("text-error");
      expect(groupSpan.className).not.toContain("text-success");
      // Should have some other color (blue is first in GROUP_COLORS)
      expect(groupSpan.className).toContain("text-blue");
    });
  });
});
