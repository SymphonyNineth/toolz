import { describe, it, expect } from "vitest";
import {
  calculateNewName,
  getRegexMatches,
  getReplacementSegments,
  formatNumber,
  applyNumbering,
  NumberingOptions,
  DEFAULT_NUMBERING_OPTIONS,
} from "./renamingUtils";

describe("calculateNewName", () => {
  describe("Normal Mode", () => {
    it("should return original name if find text is empty", () => {
      const result = calculateNewName("file.txt", "", "new", false, false);
      expect(result.newName).toBe("file.txt");
      expect(result.error).toBeUndefined();
    });

    it("should replace text case-insensitively by default", () => {
      const result = calculateNewName(
        "File.txt",
        "file",
        "document",
        false,
        false
      );
      expect(result.newName).toBe("document.txt");
    });

    it("should replace text case-sensitively when enabled", () => {
      const result1 = calculateNewName(
        "File.txt",
        "file",
        "document",
        true,
        false
      );
      expect(result1.newName).toBe("File.txt"); // No match

      const result2 = calculateNewName(
        "File.txt",
        "File",
        "Document",
        true,
        false
      );
      expect(result2.newName).toBe("Document.txt");
    });

    it("should replace all occurrences", () => {
      const result = calculateNewName(
        "test-test.txt",
        "test",
        "sample",
        false,
        false
      );
      expect(result.newName).toBe("sample-sample.txt");
    });

    it("should handle special characters as literals", () => {
      const result = calculateNewName(
        "file(1).txt",
        "(1)",
        "[2]",
        false,
        false
      );
      expect(result.newName).toBe("file[2].txt");
    });

    it("should handle regex special characters as literals in normal mode", () => {
      // With includeExt: true to test on the full filename
      const result = calculateNewName(
        "file.txt",
        ".",
        "-",
        false,
        false,
        false,
        true
      );
      expect(result.newName).toBe("file-txt"); // Replaces dots, not any char
    });

    it("should handle empty replace text (deletion)", () => {
      const result = calculateNewName("file_v1.txt", "_v1", "", false, false);
      expect(result.newName).toBe("file.txt");
    });

    it("should replace only first occurrence when replaceFirstOnly is true", () => {
      const result = calculateNewName(
        "test-test.txt",
        "test",
        "sample",
        false,
        false,
        true
      );
      expect(result.newName).toBe("sample-test.txt");
    });
  });

  describe("Regex Mode", () => {
    it("should use regex for replacement", () => {
      const result = calculateNewName(
        "file123.txt",
        "\\d+",
        "NUM",
        false,
        true
      );
      expect(result.newName).toBe("fileNUM.txt");
    });

    it("should handle capture groups", () => {
      const result = calculateNewName(
        "file-123.txt",
        "file-(\\d+)",
        "doc-$1",
        false,
        true
      );
      expect(result.newName).toBe("doc-123.txt");
    });

    it("should return error for invalid regex", () => {
      const result = calculateNewName(
        "file.txt",
        "(",
        "replacement",
        false,
        true
      );
      expect(result.newName).toBe("file.txt");
      expect(result.error).toBeDefined();
    });

    it("should respect case sensitivity in regex mode", () => {
      const result1 = calculateNewName("File.txt", "file", "doc", true, true);
      expect(result1.newName).toBe("File.txt"); // No match due to case

      const result2 = calculateNewName("File.txt", "File", "Doc", true, true);
      expect(result2.newName).toBe("Doc.txt");
    });

    it("should replace all occurrences in regex mode", () => {
      const result = calculateNewName("a1b2c3.txt", "\\d", "X", false, true);
      expect(result.newName).toBe("aXbXcX.txt");
    });

    it("should replace only first occurrence in regex mode when replaceFirstOnly is true", () => {
      const result = calculateNewName(
        "a1b2c3.txt",
        "\\d",
        "X",
        false,
        true,
        true
      );
      expect(result.newName).toBe("aXb2c3.txt");
    });
  });

  describe("Repeating Characters", () => {
    it("should replace multiple repeating characters", () => {
      const result = calculateNewName("aaaaa", "a", "b", false, false);
      expect(result.newName).toBe("bbbbb");
    });

    it("should handle non-overlapping matches correctly (find length < total length)", () => {
      // "aaaaa" -> find "aa" -> matches indices 0-1 and 2-3. Index 4 is left alone.
      const result = calculateNewName("aaaaa", "aa", "b", false, false);
      expect(result.newName).toBe("bba");
    });

    it("should handle matches where find length > 1 and replace length is smaller", () => {
      const result = calculateNewName("aaabbb", "aa", "x", false, false);
      expect(result.newName).toBe("xabbb");
    });

    it("should handle matches where find length > 1 and replace length is larger", () => {
      const result = calculateNewName("aaabbb", "aa", "xxx", false, false);
      expect(result.newName).toBe("xxxabbb");
    });

    it("should handle alternating repeating patterns", () => {
      const result = calculateNewName("ababab", "ab", "xy", false, false);
      expect(result.newName).toBe("xyxyxy");
    });

    it("should handle repeating characters with partial match at the end", () => {
      // "aaaa" -> find "aaa" -> matches first 3. Last "a" remains.
      const result = calculateNewName("aaaa", "aaa", "b", false, false);
      expect(result.newName).toBe("ba");
    });
  });

  describe("Include Extension Mode", () => {
    it("should not replace text in extension when includeExt is false (default)", () => {
      const result = calculateNewName("file.txt", "txt", "doc", false, false);
      expect(result.newName).toBe("file.txt"); // Extension is protected
    });

    it("should replace text in extension when includeExt is true", () => {
      const result = calculateNewName(
        "file.txt",
        "txt",
        "doc",
        false,
        false,
        false,
        true
      );
      expect(result.newName).toBe("file.doc");
    });

    it("should only replace in basename when includeExt is false", () => {
      const result = calculateNewName(
        "test.test.txt",
        "test",
        "sample",
        false,
        false,
        false,
        false
      );
      expect(result.newName).toBe("sample.sample.txt"); // Both "test" in basename replaced, extension unchanged
    });

    it("should replace everywhere when includeExt is true", () => {
      const result = calculateNewName(
        "test.test.test",
        "test",
        "sample",
        false,
        false,
        false,
        true
      );
      expect(result.newName).toBe("sample.sample.sample");
    });

    it("should handle files without extension with includeExt false", () => {
      const result = calculateNewName(
        "README",
        "READ",
        "WRITE",
        false,
        false,
        false,
        false
      );
      expect(result.newName).toBe("WRITEME");
    });

    it("should handle files without extension with includeExt true", () => {
      const result = calculateNewName(
        "README",
        "READ",
        "WRITE",
        false,
        false,
        false,
        true
      );
      expect(result.newName).toBe("WRITEME");
    });

    it("should handle hidden files (starting with dot) with includeExt false", () => {
      // .gitignore has lastDotIndex = 0, which is NOT > 0, so treated as no extension
      const result = calculateNewName(
        ".gitignore",
        "git",
        "svn",
        false,
        false,
        false,
        false
      );
      expect(result.newName).toBe(".svnignore");
    });

    it("should handle hidden files with includeExt true", () => {
      const result = calculateNewName(
        ".gitignore",
        "git",
        "svn",
        false,
        false,
        false,
        true
      );
      expect(result.newName).toBe(".svnignore");
    });

    it("should protect extension from regex replacement when includeExt is false", () => {
      const result = calculateNewName(
        "file123.txt",
        "\\d+",
        "NUM",
        false,
        true,
        false,
        false
      );
      expect(result.newName).toBe("fileNUM.txt");
    });

    it("should allow regex to match extension when includeExt is true", () => {
      const result = calculateNewName(
        "file.txt123",
        "\\d+",
        "NUM",
        false,
        true,
        false,
        true
      );
      expect(result.newName).toBe("file.txtNUM");
    });

    it("should handle dot replacement with includeExt false", () => {
      // The dot before extension is part of the extension, so it shouldn't be replaced
      const result = calculateNewName(
        "file.name.txt",
        ".",
        "-",
        false,
        false,
        false,
        false
      );
      expect(result.newName).toBe("file-name.txt"); // Only dot in basename replaced
    });

    it("should replace all dots including extension separator when includeExt is true", () => {
      const result = calculateNewName(
        "file.name.txt",
        ".",
        "-",
        false,
        false,
        false,
        true
      );
      expect(result.newName).toBe("file-name-txt");
    });

    it("should handle replaceFirstOnly with includeExt false", () => {
      const result = calculateNewName(
        "test.test.txt",
        "test",
        "sample",
        false,
        false,
        true,
        false
      );
      expect(result.newName).toBe("sample.test.txt"); // Only first in basename replaced
    });

    it("should handle replaceFirstOnly with includeExt true", () => {
      const result = calculateNewName(
        "test.test.test",
        "test",
        "sample",
        false,
        false,
        true,
        true
      );
      expect(result.newName).toBe("sample.test.test"); // Only first occurrence replaced
    });

    it("should handle extension-only filename with includeExt false", () => {
      // ".txt" has lastDotIndex = 0, treated as no extension
      const result = calculateNewName(
        ".txt",
        "txt",
        "doc",
        false,
        false,
        false,
        false
      );
      expect(result.newName).toBe(".doc");
    });

    it("should handle case sensitivity with includeExt false", () => {
      const result = calculateNewName(
        "File.TXT",
        "txt",
        "doc",
        true,
        false,
        false,
        false
      );
      expect(result.newName).toBe("File.TXT"); // No match in basename, extension protected
    });

    it("should handle case sensitivity with includeExt true", () => {
      const result = calculateNewName(
        "File.TXT",
        "TXT",
        "DOC",
        true,
        false,
        false,
        true
      );
      expect(result.newName).toBe("File.DOC");
    });
  });

  describe("Edge Cases", () => {
    it("should handle no matches gracefully", () => {
      const result = calculateNewName(
        "file.txt",
        "notfound",
        "replace",
        false,
        false
      );
      expect(result.newName).toBe("file.txt");
    });

    it("should handle replacement resulting in empty string", () => {
      const result = calculateNewName(
        "delete_me",
        "delete_me",
        "",
        false,
        false
      );
      expect(result.newName).toBe("");
    });

    it("should handle special replacement patterns in normal mode (no capture group replacement)", () => {
      // In normal mode, $1 should be treated literally if possible, but JS replace might interpret it.
      // Wait, string.replace(string, string) treats $ as special in replacement string?
      // MDN says: "The replacement string can include the following special replacement patterns:"
      // $$ Inserts a "$".
      // $& Inserts the matched substring.
      // $` Inserts the portion of the string that precedes the matched substring.
      // $' Inserts the portion of the string that follows the matched substring.
      // $n or $nn Where n or nn are decimal digits, inserts the nth parenthesized submatch string...

      // Let's verify behavior. If I replace "a" with "$1", and there are no groups (because normal mode escapes everything), it usually inserts "$1" literal or empty if group doesn't exist?
      // Actually, if regex has no capturing groups, $1 is usually treated as literal "$1" in some engines, but in JS:
      // "abc".replace(/a/, "$1") -> "$1bc" (because group 1 doesn't exist)

      const result = calculateNewName("abc", "a", "$1", false, false);
      expect(result.newName).toBe("$1bc");
    });
  });
});

describe("getRegexMatches", () => {
  it("should return empty array for no matches", () => {
    const matches = getRegexMatches("hello", /world/);
    expect(matches).toEqual([]);
  });

  it("should return matches with correct indices for simple match", () => {
    const matches = getRegexMatches("hello world", /world/);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].content).toBe("world");
    expect(matches[0].start).toBe(6);
    expect(matches[0].end).toBe(11);
    expect(matches[0].groupIndex).toBe(0);
  });

  it("should return matches for capture groups", () => {
    const matches = getRegexMatches("file123", /(file)(\d+)/);
    // Group 0: file123
    // Group 1: file
    // Group 2: 123
    expect(matches).toHaveLength(3);

    const group0 = matches.find((m) => m.groupIndex === 0);
    expect(group0).toBeDefined();
    expect(group0?.content).toBe("file123");

    const group1 = matches.find((m) => m.groupIndex === 1);
    expect(group1).toBeDefined();
    expect(group1?.content).toBe("file");

    const group2 = matches.find((m) => m.groupIndex === 2);
    expect(group2).toBeDefined();
    expect(group2?.content).toBe("123");
  });

  it("should handle global flag correctly", () => {
    const matches = getRegexMatches("a1 b2", /(\w)(\d)/g);
    // Match 1: a1 (Group 0), a (Group 1), 1 (Group 2)
    // Match 2: b2 (Group 0), b (Group 1), 2 (Group 2)
    expect(matches).toHaveLength(6);
  });

  it("should handle empty text", () => {
    const matches = getRegexMatches("", /test/);
    expect(matches).toEqual([]);
  });

  it("should handle nested groups", () => {
    const matches = getRegexMatches("abc", /(a(b)c)/);
    // Group 0: abc (full match)
    // Group 1: abc (outer group)
    // Group 2: b (inner group)
    expect(matches).toHaveLength(3);

    const group0 = matches.find((m) => m.groupIndex === 0);
    expect(group0?.content).toBe("abc");
    expect(group0?.start).toBe(0);
    expect(group0?.end).toBe(3);

    const group2 = matches.find((m) => m.groupIndex === 2);
    expect(group2?.content).toBe("b");
    expect(group2?.start).toBe(1);
    expect(group2?.end).toBe(2);
  });

  it("should handle optional groups that do not match", () => {
    const matches = getRegexMatches("ac", /a(b)?c/);
    // Group 0: ac
    // Group 1: undefined (optional group didn't match)
    // Only group 0 should be in results since group 1 is undefined
    expect(matches).toHaveLength(1);
    expect(matches[0].groupIndex).toBe(0);
    expect(matches[0].content).toBe("ac");
  });

  it("should handle multiple separate matches with global flag", () => {
    const matches = getRegexMatches("cat bat rat", /(\w)at/g);
    // Three matches: cat, bat, rat
    // Each has group 0 (full) and group 1 (first char)
    expect(matches).toHaveLength(6);

    const group0Matches = matches.filter((m) => m.groupIndex === 0);
    expect(group0Matches).toHaveLength(3);
    expect(group0Matches[0].content).toBe("cat");
    expect(group0Matches[1].content).toBe("bat");
    expect(group0Matches[2].content).toBe("rat");
  });

  describe("Zero-length matches (memory leak prevention)", () => {
    it("should handle .* regex without infinite loop", () => {
      const matches = getRegexMatches("hello", /.*/g);
      expect(matches).toBeDefined();
      expect(Array.isArray(matches)).toBe(true);
    });

    it("should handle ^ anchor without infinite loop", () => {
      const matches = getRegexMatches("hello", /^/g);
      expect(matches).toBeDefined();
      expect(Array.isArray(matches)).toBe(true);
    });

    it("should handle $ anchor without infinite loop", () => {
      const matches = getRegexMatches("hello", /$/g);
      expect(matches).toBeDefined();
      expect(Array.isArray(matches)).toBe(true);
    });

    it("should handle a* regex (zero or more) without infinite loop", () => {
      const matches = getRegexMatches("bbb", /a*/g);
      expect(matches).toBeDefined();
      expect(Array.isArray(matches)).toBe(true);
    });

    it("should handle (?=.) lookahead without infinite loop", () => {
      const matches = getRegexMatches("abc", /(?=.)/g);
      expect(matches).toBeDefined();
      expect(Array.isArray(matches)).toBe(true);
    });

    it("should handle empty pattern without infinite loop", () => {
      const matches = getRegexMatches("ab", new RegExp("", "g"));
      expect(matches).toBeDefined();
      expect(Array.isArray(matches)).toBe(true);
    });
  });
});

describe("getReplacementSegments", () => {
  // Note: This function is designed to work with global regexes (with 'g' flag)
  // as that's how it's used in the application (calculateNewName always adds 'g' flag)

  it("should handle basic replacement without groups and mark as literal (-1)", () => {
    const result = getReplacementSegments("hello", /hello/g, "world");
    expect(result.newName).toBe("world");
    // Literal replacement text should have groupIndex = -1
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].groupIndex).toBe(-1);
    expect(result.segments[0].content).toBe("world");
  });

  it("should handle $1 group reference with literal text between", () => {
    const result = getReplacementSegments(
      "file123.txt",
      /(file)(\d+)/g,
      "$1-$2"
    );
    expect(result.newName).toBe("file-123.txt");

    // Should have segments for group 1, literal "-", and group 2
    expect(result.segments).toHaveLength(3);

    const group1Segment = result.segments.find((s) => s.groupIndex === 1);
    expect(group1Segment?.content).toBe("file");

    const literalSegment = result.segments.find((s) => s.groupIndex === -1);
    expect(literalSegment?.content).toBe("-");

    const group2Segment = result.segments.find((s) => s.groupIndex === 2);
    expect(group2Segment?.content).toBe("123");
  });

  it("should handle $$ (literal dollar sign) as literal segment", () => {
    const result = getReplacementSegments("price", /price/g, "$$100");
    expect(result.newName).toBe("$100");
    // "$" from $$ and "100" should be literal
    expect(result.segments.filter((s) => s.groupIndex === -1).length).toBe(2);
  });

  it("should handle $& (entire match)", () => {
    const result = getReplacementSegments("hello", /ell/g, "[$&]");
    expect(result.newName).toBe("h[ell]o");

    // Should have segment for group 0 (full match) and literal "[" and "]"
    const group0Segment = result.segments.find((s) => s.groupIndex === 0);
    expect(group0Segment?.content).toBe("ell");

    const literalSegments = result.segments.filter((s) => s.groupIndex === -1);
    expect(literalSegments).toHaveLength(2);
    expect(literalSegments[0].content).toBe("[");
    expect(literalSegments[1].content).toBe("]");
  });

  it("should handle $` (before match)", () => {
    const result = getReplacementSegments("hello", /ell/g, "$`");
    expect(result.newName).toBe("hho");
    // $` returns text from original, not "new" literal text
    // So no literal (-1) segments for the replaced part
  });

  it("should handle $' (after match)", () => {
    const result = getReplacementSegments("hello", /ell/g, "$'");
    // 'hello' with /ell/ matched -> 'o' is after the match
    // Result: 'h' + 'o' (from $') + 'o' (remaining) = 'hoo'
    expect(result.newName).toBe("hoo");
  });

  it("should handle non-existent group reference as literal", () => {
    const result = getReplacementSegments("hello", /(h)ello/g, "$1-$5");
    // $5 doesn't exist, should be treated as literal "$5"
    expect(result.newName).toBe("h-$5");

    // "-" and "$5" should be literal segments
    const literalSegments = result.segments.filter((s) => s.groupIndex === -1);
    expect(literalSegments).toHaveLength(2);
    expect(literalSegments[0].content).toBe("-");
    expect(literalSegments[1].content).toBe("$5");
  });

  it("should handle global regex with multiple matches", () => {
    const result = getReplacementSegments("a1b2c3", /(\w)(\d)/g, "[$1=$2]");
    expect(result.newName).toBe("[a=1][b=2][c=3]");

    // Should have segments for each match: "[", group1, "=", group2, "]" × 3
    // = 15 segments total (5 per match × 3 matches)
    expect(result.segments).toHaveLength(15);

    // 6 group segments (2 groups × 3 matches)
    const groupSegments = result.segments.filter((s) => s.groupIndex > 0);
    expect(groupSegments).toHaveLength(6);

    // 9 literal segments (3 literals × 3 matches)
    const literalSegments = result.segments.filter((s) => s.groupIndex === -1);
    expect(literalSegments).toHaveLength(9);
  });

  it("should handle replacement with no special patterns as literal", () => {
    const result = getReplacementSegments("old", /old/g, "new");
    expect(result.newName).toBe("new");
    // All replacement text is literal
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].groupIndex).toBe(-1);
    expect(result.segments[0].content).toBe("new");
  });

  it("should handle empty replacement", () => {
    const result = getReplacementSegments("hello", /ell/g, "");
    expect(result.newName).toBe("ho");
    expect(result.segments).toHaveLength(0);
  });

  it("should preserve non-matched parts of the string", () => {
    const result = getReplacementSegments(
      "prefix_match_suffix",
      /match/g,
      "replaced"
    );
    expect(result.newName).toBe("prefix_replaced_suffix");
    // Only the "replaced" part should be a segment
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].content).toBe("replaced");
    expect(result.segments[0].groupIndex).toBe(-1);
  });

  it("should track correct segment positions with mixed groups and literals", () => {
    const result = getReplacementSegments(
      "file123",
      /(file)(\d+)/g,
      "[$1]-[$2]"
    );
    expect(result.newName).toBe("[file]-[123]");

    // Segments in order: "[", "file", "]-[", "123", "]"
    // Note: consecutive literals between tokens are combined
    const sortedSegments = [...result.segments].sort(
      (a, b) => a.start - b.start
    );

    expect(sortedSegments).toHaveLength(5);

    expect(sortedSegments[0].content).toBe("[");
    expect(sortedSegments[0].groupIndex).toBe(-1);
    expect(sortedSegments[0].start).toBe(0);
    expect(sortedSegments[0].end).toBe(1);

    expect(sortedSegments[1].content).toBe("file");
    expect(sortedSegments[1].groupIndex).toBe(1);
    expect(sortedSegments[1].start).toBe(1);
    expect(sortedSegments[1].end).toBe(5);

    expect(sortedSegments[2].content).toBe("]-[");
    expect(sortedSegments[2].groupIndex).toBe(-1);
    expect(sortedSegments[2].start).toBe(5);
    expect(sortedSegments[2].end).toBe(8);

    expect(sortedSegments[3].content).toBe("123");
    expect(sortedSegments[3].groupIndex).toBe(2);
    expect(sortedSegments[3].start).toBe(8);
    expect(sortedSegments[3].end).toBe(11);

    expect(sortedSegments[4].content).toBe("]");
    expect(sortedSegments[4].groupIndex).toBe(-1);
    expect(sortedSegments[4].start).toBe(11);
    expect(sortedSegments[4].end).toBe(12);
  });

  it("should handle optional group that is undefined", () => {
    const result = getReplacementSegments("ac", /a(b)?c/g, "[$1]");
    // Group 1 is undefined, so nothing should be inserted for $1
    expect(result.newName).toBe("[]");
    // Only the brackets are literal segments
    const literalSegments = result.segments.filter((s) => s.groupIndex === -1);
    expect(literalSegments).toHaveLength(2);
  });

  it("should handle multiple occurrences with global regex", () => {
    const result = getReplacementSegments("test test test", /test/g, "X");
    // Global should replace all matches
    expect(result.newName).toBe("X X X");
    // 3 literal "X" segments
    expect(result.segments).toHaveLength(3);
    result.segments.forEach((s) => {
      expect(s.groupIndex).toBe(-1);
      expect(s.content).toBe("X");
    });
  });

  it("should handle complex replacement pattern", () => {
    const result = getReplacementSegments(
      "IMG_20230101_photo.jpg",
      /IMG_(\d{4})(\d{2})(\d{2})_(.+)\.jpg/g,
      "$4_$1-$2-$3.jpg"
    );
    expect(result.newName).toBe("photo_2023-01-01.jpg");

    // Groups: photo ($4), 2023 ($1), 01 ($2), 01 ($3)
    // Literals: "_", "-", "-", ".jpg"
    const groupSegments = result.segments.filter((s) => s.groupIndex > 0);
    const literalSegments = result.segments.filter((s) => s.groupIndex === -1);
    expect(groupSegments).toHaveLength(4);
    expect(literalSegments).toHaveLength(4);
  });

  it("should handle no matches", () => {
    const result = getReplacementSegments("hello", /world/g, "replaced");
    expect(result.newName).toBe("hello");
    expect(result.segments).toHaveLength(0);
  });

  it("should handle adjacent matches", () => {
    const result = getReplacementSegments("aaa", /a/g, "b");
    expect(result.newName).toBe("bbb");
    // 3 literal "b" segments
    expect(result.segments).toHaveLength(3);
  });

  it("should handle case-insensitive regex", () => {
    const result = getReplacementSegments("Hello HELLO hello", /hello/gi, "hi");
    expect(result.newName).toBe("hi hi hi");
    // 3 literal "hi" segments
    expect(result.segments).toHaveLength(3);
  });

  it("should handle multiple groups with same content", () => {
    const result = getReplacementSegments("abab", /(ab)/g, "[$1]");
    expect(result.newName).toBe("[ab][ab]");
    // 2 group segments + 4 literal brackets
    const groupSegments = result.segments.filter((s) => s.groupIndex === 1);
    const literalSegments = result.segments.filter((s) => s.groupIndex === -1);
    expect(groupSegments).toHaveLength(2);
    expect(literalSegments).toHaveLength(4);
  });

  describe("Zero-length matches (memory leak prevention)", () => {
    it("should handle .* regex without infinite loop", () => {
      const result = getReplacementSegments("hello", /.*/g, "[match]");
      // .* matches empty string at the end after matching "hello"
      expect(result.newName).toBeDefined();
    });

    it("should handle ^ anchor without infinite loop", () => {
      const result = getReplacementSegments("hello", /^/g, "START-");
      expect(result.newName).toBe("START-hello");
      // "START-" is literal
      expect(
        result.segments.some(
          (s) => s.groupIndex === -1 && s.content === "START-"
        )
      ).toBe(true);
    });

    it("should handle $ anchor without infinite loop", () => {
      const result = getReplacementSegments("hello", /$/g, "-END");
      expect(result.newName).toBe("hello-END");
      // "-END" is literal
      expect(
        result.segments.some((s) => s.groupIndex === -1 && s.content === "-END")
      ).toBe(true);
    });

    it("should handle a* regex (zero or more) without infinite loop", () => {
      const result = getReplacementSegments("bbb", /a*/g, "X");
      // a* matches empty string at each position between/around b's
      expect(result.newName).toBeDefined();
    });

    it("should handle (?=.) lookahead without infinite loop", () => {
      const result = getReplacementSegments("abc", /(?=.)/g, "-");
      // Lookahead is zero-width
      expect(result.newName).toBe("-a-b-c");
    });

    it("should handle empty pattern without infinite loop", () => {
      const result = getReplacementSegments("ab", new RegExp("", "g"), "-");
      expect(result.newName).toBeDefined();
    });
  });
});

describe("formatNumber", () => {
  it("should format number without padding when padding is 1", () => {
    expect(formatNumber(1, 1)).toBe("1");
    expect(formatNumber(9, 1)).toBe("9");
    expect(formatNumber(10, 1)).toBe("10");
    expect(formatNumber(100, 1)).toBe("100");
  });

  it("should add leading zeros based on padding", () => {
    expect(formatNumber(1, 2)).toBe("01");
    expect(formatNumber(1, 3)).toBe("001");
    expect(formatNumber(1, 4)).toBe("0001");
  });

  it("should not truncate numbers larger than padding", () => {
    expect(formatNumber(100, 2)).toBe("100");
    expect(formatNumber(1000, 3)).toBe("1000");
  });

  it("should handle zero correctly", () => {
    expect(formatNumber(0, 1)).toBe("0");
    expect(formatNumber(0, 3)).toBe("000");
  });
});

describe("applyNumbering", () => {
  const createOptions = (
    overrides: Partial<NumberingOptions> = {}
  ): NumberingOptions => ({
    ...DEFAULT_NUMBERING_OPTIONS,
    enabled: true,
    ...overrides,
  });

  describe("when disabled", () => {
    it("should return original name when numbering is disabled", () => {
      const options = createOptions({ enabled: false });
      expect(applyNumbering("file.txt", 0, options)).toBe("file.txt");
      expect(applyNumbering("file.txt", 5, options)).toBe("file.txt");
    });
  });

  describe("position: start", () => {
    it("should prepend number with separator at the start", () => {
      const options = createOptions({ position: "start", separator: "-" });
      expect(applyNumbering("file.txt", 0, options)).toBe("1-file.txt");
      expect(applyNumbering("file.txt", 1, options)).toBe("2-file.txt");
    });

    it("should respect padding", () => {
      const options = createOptions({
        position: "start",
        separator: "-",
        padding: 3,
      });
      expect(applyNumbering("file.txt", 0, options)).toBe("001-file.txt");
      expect(applyNumbering("file.txt", 9, options)).toBe("010-file.txt");
    });

    it("should respect start number", () => {
      const options = createOptions({
        position: "start",
        separator: "_",
        startNumber: 100,
      });
      expect(applyNumbering("file.txt", 0, options)).toBe("100_file.txt");
      expect(applyNumbering("file.txt", 1, options)).toBe("101_file.txt");
    });

    it("should respect increment", () => {
      const options = createOptions({
        position: "start",
        separator: "-",
        startNumber: 10,
        increment: 5,
      });
      expect(applyNumbering("file.txt", 0, options)).toBe("10-file.txt");
      expect(applyNumbering("file.txt", 1, options)).toBe("15-file.txt");
      expect(applyNumbering("file.txt", 2, options)).toBe("20-file.txt");
    });

    it("should work with empty separator", () => {
      const options = createOptions({ position: "start", separator: "" });
      expect(applyNumbering("file.txt", 0, options)).toBe("1file.txt");
    });

    it("should work with space separator", () => {
      const options = createOptions({ position: "start", separator: " " });
      expect(applyNumbering("file.txt", 0, options)).toBe("1 file.txt");
    });
  });

  describe("position: end", () => {
    it("should append number with separator at the end (before extension)", () => {
      const options = createOptions({ position: "end", separator: "-" });
      expect(applyNumbering("file.txt", 0, options)).toBe("file-1.txt");
      expect(applyNumbering("file.txt", 4, options)).toBe("file-5.txt");
    });

    it("should respect padding", () => {
      const options = createOptions({
        position: "end",
        separator: "_",
        padding: 2,
      });
      expect(applyNumbering("document.pdf", 0, options)).toBe(
        "document_01.pdf"
      );
      expect(applyNumbering("document.pdf", 9, options)).toBe(
        "document_10.pdf"
      );
    });

    it("should handle files without extension", () => {
      const options = createOptions({ position: "end", separator: "-" });
      expect(applyNumbering("README", 0, options)).toBe("README-1");
      expect(applyNumbering("Makefile", 2, options)).toBe("Makefile-3");
    });

    it("should handle files with multiple dots", () => {
      const options = createOptions({ position: "end", separator: "-" });
      expect(applyNumbering("file.backup.tar.gz", 0, options)).toBe(
        "file.backup.tar-1.gz"
      );
    });
  });

  describe("position: index", () => {
    it("should insert number at specified index", () => {
      const options = createOptions({
        position: "index",
        separator: "-",
        insertIndex: 4,
      });
      // "file.txt" -> insert at index 4 -> "file" + "-1-" + "" + ".txt"
      expect(applyNumbering("file.txt", 0, options)).toBe("file-1.txt");
    });

    it("should insert at beginning when index is 0", () => {
      const options = createOptions({
        position: "index",
        separator: "-",
        insertIndex: 0,
      });
      expect(applyNumbering("file.txt", 0, options)).toBe("1-file.txt");
    });

    it("should insert at end of basename when index equals basename length", () => {
      const options = createOptions({
        position: "index",
        separator: "_",
        insertIndex: 4, // "file" has 4 characters
      });
      expect(applyNumbering("file.txt", 0, options)).toBe("file_1.txt");
    });

    it("should clamp index to basename length", () => {
      const options = createOptions({
        position: "index",
        separator: "-",
        insertIndex: 100, // Way beyond "file"
      });
      expect(applyNumbering("file.txt", 0, options)).toBe("file-1.txt");
    });

    it("should handle negative index by clamping to 0", () => {
      const options = createOptions({
        position: "index",
        separator: "-",
        insertIndex: -5,
      });
      expect(applyNumbering("file.txt", 0, options)).toBe("1-file.txt");
    });

    it("should insert in the middle of filename", () => {
      const options = createOptions({
        position: "index",
        separator: "_",
        insertIndex: 2,
      });
      // "document" (8 chars) -> "do" + "_1_" + "cument" + ".pdf"
      expect(applyNumbering("document.pdf", 0, options)).toBe(
        "do_1_cument.pdf"
      );
    });
  });

  describe("combined options", () => {
    it("should apply all options together", () => {
      const options = createOptions({
        startNumber: 100,
        increment: 10,
        padding: 4,
        separator: "_",
        position: "start",
      });
      expect(applyNumbering("photo.jpg", 0, options)).toBe("0100_photo.jpg");
      expect(applyNumbering("photo.jpg", 1, options)).toBe("0110_photo.jpg");
      expect(applyNumbering("photo.jpg", 5, options)).toBe("0150_photo.jpg");
    });
  });

  describe("edge cases", () => {
    it("should handle empty filename", () => {
      const options = createOptions({ position: "start", separator: "-" });
      expect(applyNumbering("", 0, options)).toBe("1-");
    });

    it("should handle files starting with dot", () => {
      const options = createOptions({ position: "end", separator: "-" });
      // ".gitignore" - the dot is at index 0, lastIndexOf('.') returns 0
      // Since lastDotIndex is 0 (not > 0), it's treated as no extension
      expect(applyNumbering(".gitignore", 0, options)).toBe(".gitignore-1");
    });

    it("should handle extension only", () => {
      const options = createOptions({ position: "start", separator: "-" });
      expect(applyNumbering(".txt", 0, options)).toBe("1-.txt");
    });

    it("should handle very long filenames", () => {
      const options = createOptions({ position: "end", separator: "-" });
      const longName = "a".repeat(200) + ".txt";
      const result = applyNumbering(longName, 0, options);
      expect(result).toBe("a".repeat(200) + "-1.txt");
    });
  });
});
