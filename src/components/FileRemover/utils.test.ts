import { describe, it, expect } from "vitest";
import {
  formatFileSize,
  buildHighlightedSegments,
  validatePattern,
  checkDangerousOperation,
} from "./utils";
import { FileMatchItem } from "./types";

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

  describe("validatePattern", () => {
    it("returns error for empty pattern", () => {
      expect(validatePattern("", "simple")).toBe("Pattern cannot be empty");
      expect(validatePattern("   ", "simple")).toBe("Pattern cannot be empty");
    });

    it("validates simple patterns (always valid if non-empty)", () => {
      expect(validatePattern("test", "simple")).toBeUndefined();
      expect(validatePattern("file*.txt", "simple")).toBeUndefined();
    });

    it("validates valid regex patterns", () => {
      expect(validatePattern(".*\\.txt$", "regex")).toBeUndefined();
      expect(validatePattern("file\\d+", "regex")).toBeUndefined();
      expect(validatePattern("[a-z]+", "regex")).toBeUndefined();
    });

    it("returns error for invalid regex patterns", () => {
      const result = validatePattern("[invalid", "regex");
      expect(result).toContain("Invalid regex:");
    });

    it("returns error for unclosed group in regex", () => {
      const result = validatePattern("(unclosed", "regex");
      expect(result).toContain("Invalid regex:");
    });

    it("validates valid extension patterns", () => {
      expect(validatePattern(".txt", "extension")).toBeUndefined();
      expect(validatePattern("txt", "extension")).toBeUndefined();
      expect(validatePattern(".txt, .log, .tmp", "extension")).toBeUndefined();
      expect(validatePattern("txt,log,tmp", "extension")).toBeUndefined();
    });

    it("returns error for empty extension in list", () => {
      expect(validatePattern(".txt,,log", "extension")).toBe(
        "Invalid extension format: empty extension found"
      );
      expect(validatePattern(",txt", "extension")).toBe(
        "Invalid extension format: empty extension found"
      );
    });

    it("returns error for extensions with invalid characters", () => {
      const result = validatePattern(".tx/t", "extension");
      expect(result).toContain("Invalid extension:");
    });

    it("returns error for extension with only dot", () => {
      const result = validatePattern(".", "extension");
      expect(result).toContain("Invalid extension:");
    });
  });

  describe("checkDangerousOperation", () => {
    const createMockFile = (path: string, size = 1000): FileMatchItem => ({
      path,
      name: path.split("/").pop() || "",
      matchRanges: [],
      size,
      isDirectory: false,
      selected: true,
    });

    it("returns undefined for safe operations", () => {
      const files = [createMockFile("/home/user/projects/file.txt")];
      expect(checkDangerousOperation(files, "/home/user/projects")).toBeUndefined();
    });

    it("warns when deleting more than 100 files", () => {
      const files = Array.from({ length: 101 }, (_, i) =>
        createMockFile(`/home/user/file${i}.txt`)
      );
      const result = checkDangerousOperation(files, "/home/user");
      expect(result).toContain("101 files");
    });

    it("does not warn when deleting exactly 100 files", () => {
      const files = Array.from({ length: 100 }, (_, i) =>
        createMockFile(`/home/user/file${i}.txt`)
      );
      expect(checkDangerousOperation(files, "/home/user/projects")).toBeUndefined();
    });

    it("warns when deleting from /usr", () => {
      const files = [createMockFile("/usr/local/bin/myapp")];
      const result = checkDangerousOperation(files, "/usr/local/bin");
      expect(result).toContain("system directory");
    });

    it("warns when deleting from /bin", () => {
      const files = [createMockFile("/bin/myapp")];
      const result = checkDangerousOperation(files, "/bin");
      expect(result).toContain("system directory");
    });

    it("warns when deleting from /etc", () => {
      const files = [createMockFile("/etc/config")];
      const result = checkDangerousOperation(files, "/etc");
      expect(result).toContain("system directory");
    });

    it("warns when deleting from /home root", () => {
      const files = [createMockFile("/home/somefile")];
      const result = checkDangerousOperation(files, "/home");
      expect(result).toContain("root user directory");
    });

    it("does not warn for subdirectories of /home", () => {
      const files = [createMockFile("/home/user/file.txt")];
      expect(checkDangerousOperation(files, "/home/user")).toBeUndefined();
    });

    it("warns when deleting more than 1GB of data", () => {
      const files = [
        createMockFile("/home/user/large1.bin", 600 * 1024 * 1024),
        createMockFile("/home/user/large2.bin", 600 * 1024 * 1024),
      ];
      const result = checkDangerousOperation(files, "/home/user");
      expect(result).toContain("GB of data");
    });

    it("does not warn for less than 1GB", () => {
      const files = [createMockFile("/home/user/file.bin", 500 * 1024 * 1024)];
      expect(checkDangerousOperation(files, "/home/user")).toBeUndefined();
    });

    it("warns for Windows system paths", () => {
      const files = [createMockFile("C:\\Windows\\System32\\file.dll")];
      const result = checkDangerousOperation(files, "C:\\Windows\\System32");
      expect(result).toContain("Windows system directory");
    });

    it("warns for Windows Program Files", () => {
      const files = [createMockFile("C:\\Program Files\\App\\file.exe")];
      const result = checkDangerousOperation(files, "C:\\Program Files\\App");
      expect(result).toContain("Windows system directory");
    });
  });
});

