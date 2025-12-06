//! Diff and regex highlighting utilities.
//!
//! This module provides functionality for:
//! - Computing character-level diffs between strings using `dissimilar`
//! - Extracting regex match highlights with capture group support

use dissimilar::Chunk;
use regex::Regex;
use serde::{Deserialize, Serialize};

// ==================== Standard Diff Types ====================

/// Type of change in a diff segment.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum DiffSegmentType {
    Added,
    Removed,
    Unchanged,
}

/// A segment of text with its diff type.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DiffSegment {
    pub segment_type: DiffSegmentType,
    pub text: String,
}

/// Computes a character-level diff between two strings.
///
/// Uses the `dissimilar` crate for semantic cleanup of diffs.
///
/// # Arguments
///
/// * `original` - The original string
/// * `modified` - The modified string
///
/// # Returns
///
/// A vector of `DiffSegment` representing the changes.
pub fn compute_diff(original: &str, modified: &str) -> Vec<DiffSegment> {
    dissimilar::diff(original, modified)
        .into_iter()
        .map(|chunk| match chunk {
            Chunk::Equal(s) => DiffSegment {
                segment_type: DiffSegmentType::Unchanged,
                text: s.to_string(),
            },
            Chunk::Delete(s) => DiffSegment {
                segment_type: DiffSegmentType::Removed,
                text: s.to_string(),
            },
            Chunk::Insert(s) => DiffSegment {
                segment_type: DiffSegmentType::Added,
                text: s.to_string(),
            },
        })
        .collect()
}

// ==================== Regex Highlight Types ====================

/// Segment of text for regex highlighting.
///
/// Represents either plain text (not part of a match) or a highlighted
/// capture group from a regex match.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase", tag = "type", content = "value")]
pub enum RegexSegment {
    /// Standard text (not part of a match)
    Text(String),
    /// Highlighted group text (id: 0=whole match, 1..N=capture groups)
    Group { id: usize, text: String },
}

/// Returns a fully segmented string with regex matches highlighted.
///
/// Includes non-matching text as `Text` segments for complete rendering.
/// When capture groups are present, each group is returned as a separate
/// `Group` segment. When no capture groups exist, the whole match is
/// returned as `Group { id: 0 }`.
///
/// # Arguments
///
/// * `text` - The text to search in
/// * `pattern` - The regex pattern to use
///
/// # Returns
///
/// * `Ok(Vec<RegexSegment>)` - The segmented string
/// * `Err(String)` - If the regex pattern is invalid
pub fn get_regex_highlights(text: &str, pattern: &str) -> Result<Vec<RegexSegment>, String> {
    let re = Regex::new(pattern).map_err(|e| e.to_string())?;
    let mut segments = Vec::new();
    let mut last_idx = 0;

    for cap in re.captures_iter(text) {
        let whole_match = cap.get(0).unwrap();

        // 1. Push text BEFORE the match
        if whole_match.start() > last_idx {
            segments.push(RegexSegment::Text(
                text[last_idx..whole_match.start()].to_string(),
            ));
        }

        // 2. Handle capture groups or whole match
        if cap.len() > 1 {
            // Has explicit capture groups - highlight each
            let mut inner_last = whole_match.start();
            for i in 1..cap.len() {
                if let Some(g) = cap.get(i) {
                    // SAFETY CHECK: Prevent nested/overlapping groups from duplicating text
                    if g.start() < inner_last {
                        continue;
                    }

                    // Text between capture groups
                    if g.start() > inner_last {
                        segments.push(RegexSegment::Text(text[inner_last..g.start()].to_string()));
                    }

                    segments.push(RegexSegment::Group {
                        id: i,
                        text: g.as_str().to_string(),
                    });
                    inner_last = g.end();
                }
            }
            // Remaining text inside the whole match (after all groups)
            if inner_last < whole_match.end() {
                segments.push(RegexSegment::Text(
                    text[inner_last..whole_match.end()].to_string(),
                ));
            }
        } else {
            // No capture groups - highlight entire match as group 0
            segments.push(RegexSegment::Group {
                id: 0,
                text: whole_match.as_str().to_string(),
            });
        }

        last_idx = whole_match.end();
    }

    // 3. Push remaining text AFTER the last match
    if last_idx < text.len() {
        segments.push(RegexSegment::Text(text[last_idx..].to_string()));
    }

    Ok(segments)
}

/// Checks if a regex pattern contains capture groups.
///
/// Uses the regex engine itself for robust detection, not string heuristics.
/// Returns false for:
/// - Non-capturing groups `(?:...)`
/// - Escaped parentheses `\(`
/// - Character classes containing parentheses `[(]`
///
/// # Arguments
///
/// * `pattern` - The regex pattern to check
///
/// # Returns
///
/// `true` if the pattern contains at least one capture group, `false` otherwise.
pub fn has_capture_groups(pattern: &str) -> bool {
    match Regex::new(pattern) {
        Ok(re) => re.captures_len() > 1, // >1 because group 0 is always the whole match
        Err(_) => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== compute_diff tests ====================

    #[test]
    fn test_compute_diff_simple_insert() {
        let result = compute_diff("abc", "abXc");
        assert_eq!(result.len(), 3);
        assert_eq!(result[0].segment_type, DiffSegmentType::Unchanged);
        assert_eq!(result[0].text, "ab");
        assert_eq!(result[1].segment_type, DiffSegmentType::Added);
        assert_eq!(result[1].text, "X");
        assert_eq!(result[2].segment_type, DiffSegmentType::Unchanged);
        assert_eq!(result[2].text, "c");
    }

    #[test]
    fn test_compute_diff_simple_delete() {
        let result = compute_diff("abXc", "abc");
        assert_eq!(result.len(), 3);
        assert_eq!(result[0].segment_type, DiffSegmentType::Unchanged);
        assert_eq!(result[0].text, "ab");
        assert_eq!(result[1].segment_type, DiffSegmentType::Removed);
        assert_eq!(result[1].text, "X");
        assert_eq!(result[2].segment_type, DiffSegmentType::Unchanged);
        assert_eq!(result[2].text, "c");
    }

    #[test]
    fn test_compute_diff_unchanged() {
        let result = compute_diff("hello", "hello");
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].segment_type, DiffSegmentType::Unchanged);
        assert_eq!(result[0].text, "hello");
    }

    #[test]
    fn test_compute_diff_complete_replacement() {
        let result = compute_diff("old", "new");
        // dissimilar may produce various segments; just check we have both removed and added
        let has_removed = result
            .iter()
            .any(|s| s.segment_type == DiffSegmentType::Removed);
        let has_added = result
            .iter()
            .any(|s| s.segment_type == DiffSegmentType::Added);
        assert!(has_removed);
        assert!(has_added);
    }

    #[test]
    fn test_compute_diff_empty_strings() {
        let result = compute_diff("", "");
        assert!(result.is_empty());
    }

    #[test]
    fn test_compute_diff_from_empty() {
        let result = compute_diff("", "abc");
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].segment_type, DiffSegmentType::Added);
        assert_eq!(result[0].text, "abc");
    }

    #[test]
    fn test_compute_diff_to_empty() {
        let result = compute_diff("abc", "");
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].segment_type, DiffSegmentType::Removed);
        assert_eq!(result[0].text, "abc");
    }

    // ==================== get_regex_highlights tests ====================

    #[test]
    fn test_regex_highlights_no_groups() {
        let result = get_regex_highlights("file123.txt", r"\d+").unwrap();
        assert_eq!(result.len(), 3);
        assert_eq!(result[0], RegexSegment::Text("file".to_string()));
        assert_eq!(
            result[1],
            RegexSegment::Group {
                id: 0,
                text: "123".to_string()
            }
        );
        assert_eq!(result[2], RegexSegment::Text(".txt".to_string()));
    }

    #[test]
    fn test_regex_highlights_with_groups() {
        let result = get_regex_highlights("file123-abc.txt", r"(\d+)-(\w+)").unwrap();
        // Expected: "file" + group(1)="123" + "-" + group(2)="abc" + ".txt"
        assert_eq!(result.len(), 5);
        assert_eq!(result[0], RegexSegment::Text("file".to_string()));
        assert_eq!(
            result[1],
            RegexSegment::Group {
                id: 1,
                text: "123".to_string()
            }
        );
        // "-" is between the groups inside the match
        assert_eq!(result[2], RegexSegment::Text("-".to_string()));
        assert_eq!(
            result[3],
            RegexSegment::Group {
                id: 2,
                text: "abc".to_string()
            }
        );
        // ".txt" is after the match
        assert_eq!(result[4], RegexSegment::Text(".txt".to_string()));
    }

    #[test]
    fn test_regex_highlights_text_gaps() {
        // String with multiple matches and text between them
        let result = get_regex_highlights("a1b2c", r"\d").unwrap();
        assert_eq!(result.len(), 5);
        assert_eq!(result[0], RegexSegment::Text("a".to_string()));
        assert_eq!(
            result[1],
            RegexSegment::Group {
                id: 0,
                text: "1".to_string()
            }
        );
        assert_eq!(result[2], RegexSegment::Text("b".to_string()));
        assert_eq!(
            result[3],
            RegexSegment::Group {
                id: 0,
                text: "2".to_string()
            }
        );
        assert_eq!(result[4], RegexSegment::Text("c".to_string()));
    }

    #[test]
    fn test_regex_highlights_no_match() {
        let result = get_regex_highlights("hello", r"\d+").unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0], RegexSegment::Text("hello".to_string()));
    }

    #[test]
    fn test_regex_highlights_invalid_pattern() {
        let result = get_regex_highlights("test", r"[invalid");
        assert!(result.is_err());
    }

    #[test]
    fn test_regex_highlights_entire_string_match() {
        let result = get_regex_highlights("123", r"\d+").unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(
            result[0],
            RegexSegment::Group {
                id: 0,
                text: "123".to_string()
            }
        );
    }

    #[test]
    fn test_regex_highlights_match_at_start() {
        let result = get_regex_highlights("123abc", r"\d+").unwrap();
        assert_eq!(result.len(), 2);
        assert_eq!(
            result[0],
            RegexSegment::Group {
                id: 0,
                text: "123".to_string()
            }
        );
        assert_eq!(result[1], RegexSegment::Text("abc".to_string()));
    }

    #[test]
    fn test_regex_highlights_match_at_end() {
        let result = get_regex_highlights("abc123", r"\d+").unwrap();
        assert_eq!(result.len(), 2);
        assert_eq!(result[0], RegexSegment::Text("abc".to_string()));
        assert_eq!(
            result[1],
            RegexSegment::Group {
                id: 0,
                text: "123".to_string()
            }
        );
    }

    #[test]
    fn test_regex_highlights_with_trailing_text_after_groups() {
        // Pattern that captures only part of the match
        let result = get_regex_highlights("file123px.txt", r"(\d+)px").unwrap();
        // Expected: "file" + group(1)="123" + "px" (trailing inside match) + ".txt"
        assert_eq!(result.len(), 4);
        assert_eq!(result[0], RegexSegment::Text("file".to_string()));
        assert_eq!(
            result[1],
            RegexSegment::Group {
                id: 1,
                text: "123".to_string()
            }
        );
        assert_eq!(result[2], RegexSegment::Text("px".to_string()));
        assert_eq!(result[3], RegexSegment::Text(".txt".to_string()));
    }

    // ==================== has_capture_groups tests ====================

    #[test]
    fn test_has_capture_groups_true_for_real_groups() {
        assert!(has_capture_groups(r"(\d+)"));
        assert!(has_capture_groups(r"(\w+)-(\d+)"));
        assert!(has_capture_groups(r"^(.+)\.txt$"));
    }

    #[test]
    fn test_has_capture_groups_false_for_noncapturing() {
        assert!(!has_capture_groups(r"(?:\d+)"));
        assert!(!has_capture_groups(r"(?:foo|bar)"));
    }

    #[test]
    fn test_has_capture_groups_false_for_escaped_parens() {
        assert!(!has_capture_groups(r"\(\d+\)"));
        assert!(!has_capture_groups(r"foo\(bar\)"));
    }

    #[test]
    fn test_has_capture_groups_false_for_character_class() {
        assert!(!has_capture_groups(r"[(]foo[)]"));
    }

    #[test]
    fn test_has_capture_groups_no_parens_at_all() {
        assert!(!has_capture_groups(r"\d+"));
        assert!(!has_capture_groups(r"hello"));
    }

    #[test]
    fn test_has_capture_groups_invalid_pattern() {
        // Invalid patterns should return false
        assert!(!has_capture_groups(r"[invalid"));
    }

    #[test]
    fn test_has_capture_groups_mixed() {
        // Has both capturing and non-capturing
        assert!(has_capture_groups(r"(?:\d+)-(\w+)"));
    }
}
