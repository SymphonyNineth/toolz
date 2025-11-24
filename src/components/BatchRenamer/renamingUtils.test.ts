import { describe, it, expect } from "vitest";
import {
  calculateNewName,
  getRegexMatches,
  getReplacementSegments,
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
      const result = calculateNewName("file.txt", ".", "-", false, false);
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
    const sortedSegments = [...result.segments].sort((a, b) => a.start - b.start);

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
      expect(result.segments.some((s) => s.groupIndex === -1 && s.content === "START-")).toBe(true);
    });

    it("should handle $ anchor without infinite loop", () => {
      const result = getReplacementSegments("hello", /$/g, "-END");
      expect(result.newName).toBe("hello-END");
      // "-END" is literal
      expect(result.segments.some((s) => s.groupIndex === -1 && s.content === "-END")).toBe(true);
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
