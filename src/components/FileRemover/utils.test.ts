import { describe, it, expect } from "vitest";
import { formatFileSize, buildHighlightedSegments } from "./utils";

describe("utils", () => {
  describe("formatFileSize", () => {
    it("formats 0 bytes correctly", () => {
      expect(formatFileSize(0)).toBe("0 B");
    });

    it("formats bytes correctly", () => {
      expect(formatFileSize(500)).toBe("500 B");
      expect(formatFileSize(1023)).toBe("1023 B");
    });

    it("formats kilobytes correctly", () => {
      expect(formatFileSize(1024)).toBe("1 KB");
      expect(formatFileSize(1536)).toBe("1.5 KB");
      expect(formatFileSize(2048)).toBe("2 KB");
    });

    it("formats megabytes correctly", () => {
      expect(formatFileSize(1024 * 1024)).toBe("1 MB");
      expect(formatFileSize(1024 * 1024 * 2.5)).toBe("2.5 MB");
    });

    it("formats gigabytes correctly", () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe("1 GB");
      expect(formatFileSize(1024 * 1024 * 1024 * 1.5)).toBe("1.5 GB");
    });

    it("formats terabytes correctly", () => {
      expect(formatFileSize(1024 * 1024 * 1024 * 1024)).toBe("1 TB");
    });

    it("handles fractional values correctly", () => {
      expect(formatFileSize(1536)).toBe("1.5 KB");
      expect(formatFileSize(1024 * 1024 + 512 * 1024)).toBe("1.5 MB");
    });
  });

  describe("buildHighlightedSegments", () => {
    it("returns full text as non-match when no ranges provided", () => {
      const result = buildHighlightedSegments("hello world", []);
      expect(result).toEqual([{ text: "hello world", isMatch: false }]);
    });

    it("returns full text as non-match when ranges is undefined-like empty", () => {
      const result = buildHighlightedSegments("hello world", []);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ text: "hello world", isMatch: false });
    });

    it("highlights a single range at the beginning", () => {
      const result = buildHighlightedSegments("hello world", [[0, 5]]);
      expect(result).toEqual([
        { text: "hello", isMatch: true },
        { text: " world", isMatch: false },
      ]);
    });

    it("highlights a single range in the middle", () => {
      const result = buildHighlightedSegments("hello world", [[6, 11]]);
      expect(result).toEqual([
        { text: "hello ", isMatch: false },
        { text: "world", isMatch: true },
      ]);
    });

    it("highlights a single range at the end", () => {
      const result = buildHighlightedSegments("hello world", [[6, 11]]);
      expect(result).toEqual([
        { text: "hello ", isMatch: false },
        { text: "world", isMatch: true },
      ]);
    });

    it("highlights the entire text", () => {
      const result = buildHighlightedSegments("hello", [[0, 5]]);
      expect(result).toEqual([{ text: "hello", isMatch: true }]);
    });

    it("handles multiple non-overlapping ranges", () => {
      const result = buildHighlightedSegments("hello world foo", [
        [0, 5],
        [12, 15],
      ]);
      expect(result).toEqual([
        { text: "hello", isMatch: true },
        { text: " world ", isMatch: false },
        { text: "foo", isMatch: true },
      ]);
    });

    it("sorts ranges by start position", () => {
      const result = buildHighlightedSegments("hello world foo", [
        [12, 15],
        [0, 5],
      ]);
      expect(result).toEqual([
        { text: "hello", isMatch: true },
        { text: " world ", isMatch: false },
        { text: "foo", isMatch: true },
      ]);
    });

    it("handles adjacent ranges", () => {
      const result = buildHighlightedSegments("helloworld", [
        [0, 5],
        [5, 10],
      ]);
      expect(result).toEqual([
        { text: "hello", isMatch: true },
        { text: "world", isMatch: true },
      ]);
    });

    it("handles empty string", () => {
      const result = buildHighlightedSegments("", []);
      expect(result).toEqual([{ text: "", isMatch: false }]);
    });

    it("handles range covering nothing", () => {
      const result = buildHighlightedSegments("hello", [[0, 0]]);
      expect(result).toEqual([
        { text: "", isMatch: true },
        { text: "hello", isMatch: false },
      ]);
    });
  });
});

