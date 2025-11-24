import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import DiffText from "./DiffText";

describe("DiffText", () => {
  describe("Original Mode", () => {
    it("should show removed characters with strikethrough styling", () => {
      const { container } = render(() => (
        <DiffText
          original="old_name.txt"
          modified="new_name.txt"
          mode="original"
        />
      ));

      // Check for removed text (should have line-through class)
      const removedSpan = container.querySelector(".line-through");
      expect(removedSpan).toBeInTheDocument();
      expect(removedSpan).toHaveTextContent("old");
    });

    it("should show unchanged characters without special styling", () => {
      const { container } = render(() => (
        <DiffText original="test.txt" modified="test.md" mode="original" />
      ));

      // 'test.' should be unchanged
      const spans = container.querySelectorAll("span > span");
      const unchangedSpans = Array.from(spans).filter(
        (s) =>
          !s.classList.contains("line-through") &&
          !s.classList.contains("bg-error/20")
      );

      const unchangedText = unchangedSpans.map((s) => s.textContent).join("");
      expect(unchangedText).toContain("test.");
    });

    it("should not show added characters in original mode", () => {
      const { container } = render(() => (
        <DiffText original="old" modified="oldnew" mode="original" />
      ));

      // The container should only contain 'old', not 'new'
      expect(container.textContent).toBe("old");
    });
  });

  describe("Modified Mode", () => {
    it("should show added characters with success styling", () => {
      const { container } = render(() => (
        <DiffText
          original="old_name.txt"
          modified="new_name.txt"
          mode="modified"
        />
      ));

      // Check for added text (should have text-success class)
      const addedSpan = container.querySelector(".text-success");
      expect(addedSpan).toBeInTheDocument();
      expect(addedSpan).toHaveTextContent("new");
    });

    it("should show unchanged characters without special styling", () => {
      const { container } = render(() => (
        <DiffText original="test.txt" modified="test.md" mode="modified" />
      ));

      // 'test.' should be unchanged
      const text = container.textContent;
      expect(text).toContain("test.");
    });

    it("should not show removed characters in modified mode", () => {
      const { container } = render(() => (
        <DiffText original="oldtext" modified="text" mode="modified" />
      ));

      // The container should only contain 'text', not 'old'
      expect(container.textContent).toBe("text");
    });
  });

  describe("Edge Cases", () => {
    it("should handle identical strings (no diff)", () => {
      const { container } = render(() => (
        <DiffText original="same.txt" modified="same.txt" mode="original" />
      ));

      expect(container.textContent).toBe("same.txt");
      // Should not have any special styling
      expect(container.querySelector(".line-through")).not.toBeInTheDocument();
      expect(container.querySelector(".text-success")).not.toBeInTheDocument();
    });

    it("should handle empty original string", () => {
      const { container } = render(() => (
        <DiffText original="" modified="new.txt" mode="modified" />
      ));

      // Everything is added
      const addedSpan = container.querySelector(".text-success");
      expect(addedSpan).toHaveTextContent("new.txt");
    });

    it("should handle empty modified string", () => {
      const { container } = render(() => (
        <DiffText original="old.txt" modified="" mode="original" />
      ));

      // Everything is removed
      const removedSpan = container.querySelector(".line-through");
      expect(removedSpan).toHaveTextContent("old.txt");
    });

    it("should handle complete replacement", () => {
      const { container: originalContainer } = render(() => (
        <DiffText original="abc" modified="xyz" mode="original" />
      ));

      const { container: modifiedContainer } = render(() => (
        <DiffText original="abc" modified="xyz" mode="modified" />
      ));

      // Original mode shows 'abc' as removed
      expect(originalContainer.textContent).toBe("abc");
      expect(
        originalContainer.querySelector(".line-through")
      ).toHaveTextContent("abc");

      // Modified mode shows 'xyz' as added
      expect(modifiedContainer.textContent).toBe("xyz");
      expect(
        modifiedContainer.querySelector(".text-success")
      ).toHaveTextContent("xyz");
    });

    it("should handle special characters", () => {
      const { container } = render(() => (
        <DiffText
          original="file(1).txt"
          modified="file[2].txt"
          mode="original"
        />
      ));

      const removedSpan = container.querySelector(".line-through");
      expect(removedSpan?.textContent).toContain("(1)");
    });

    it("should handle unicode characters", () => {
      // Using BMP characters (single code unit in UTF-16), not emoji (surrogate pairs)
      const { container } = render(() => (
        <DiffText original="hello世界" modified="hello地球" mode="modified" />
      ));

      const addedSpan = container.querySelector(".text-success");
      expect(addedSpan).toHaveTextContent("地球");
    });
  });
});
