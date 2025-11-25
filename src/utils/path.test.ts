import { describe, it, expect } from "vitest";
import {
  getFileName,
  getDirectory,
  getPathSeparator,
  joinPath,
} from "./path";

describe("getFileName", () => {
  it("should extract filename from Unix-style path", () => {
    expect(getFileName("/home/user/documents/file.txt")).toBe("file.txt");
  });

  it("should extract filename from Windows-style path", () => {
    expect(getFileName("C:\\Users\\user\\documents\\file.txt")).toBe(
      "file.txt"
    );
  });

  it("should handle filename only", () => {
    expect(getFileName("file.txt")).toBe("file.txt");
  });

  it("should handle paths with mixed separators", () => {
    expect(getFileName("/home/user\\documents/file.txt")).toBe("file.txt");
  });

  it("should handle empty string", () => {
    expect(getFileName("")).toBe("");
  });

  it("should handle path ending with separator", () => {
    expect(getFileName("/home/user/")).toBe("");
  });
});

describe("getDirectory", () => {
  it("should extract directory from Unix-style path", () => {
    expect(getDirectory("/home/user/documents/file.txt")).toBe(
      "/home/user/documents"
    );
  });

  it("should extract directory from Windows-style path", () => {
    expect(getDirectory("C:\\Users\\user\\documents\\file.txt")).toBe(
      "C:\\Users\\user\\documents"
    );
  });

  it("should handle filename only", () => {
    expect(getDirectory("file.txt")).toBe("");
  });

  it("should handle root path", () => {
    expect(getDirectory("/file.txt")).toBe("");
  });
});

describe("getPathSeparator", () => {
  it("should return forward slash for Unix paths", () => {
    expect(getPathSeparator("/home/user/file.txt")).toBe("/");
  });

  it("should return backslash for Windows paths", () => {
    expect(getPathSeparator("C:\\Users\\file.txt")).toBe("\\");
  });

  it("should default to forward slash for paths without separators", () => {
    expect(getPathSeparator("file.txt")).toBe("/");
  });

  it("should detect backslash if both separators present", () => {
    // When backslash is present, assume Windows
    expect(getPathSeparator("/home\\user/file.txt")).toBe("\\");
  });
});

describe("joinPath", () => {
  it("should join Unix-style paths", () => {
    expect(joinPath("/home/user/documents", "file.txt")).toBe(
      "/home/user/documents/file.txt"
    );
  });

  it("should join Windows-style paths", () => {
    expect(joinPath("C:\\Users\\documents", "file.txt")).toBe(
      "C:\\Users\\documents\\file.txt"
    );
  });

  it("should handle directory without trailing separator", () => {
    expect(joinPath("/home/user", "file.txt")).toBe("/home/user/file.txt");
  });
});

