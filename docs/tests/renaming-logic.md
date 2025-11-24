# Existing Tests

This document tracks the unit tests that have already been implemented in the codebase.

## Renaming Logic (`src/components/BatchRenamer/renamingUtils.test.ts`)

These tests cover the core business logic for calculating new filenames.

### calculateNewName

- **Normal Mode**

* [x] Basic text replacement.
* [x] Case-insensitive replacement (default).
* [x] Case-sensitive replacement (toggle).
* [x] Handling special characters as literals.
* [x] Empty find text handling.

- **Regex Mode**

* [x] Basic regex replacement.
* [x] Capture groups support (`$1`, etc.).
* [x] Invalid regex error handling.
* [x] Case sensitivity flags (`g` vs `gi`).

- **Repeating Characters**

* [x] Multiple repeating characters.
* [x] Non-overlapping matches.
* [x] Different find/replace lengths.
* [x] Alternating patterns.
* [x] Partial matches.

- **Edge Cases**

* [x] No matches found.
* [x] Empty replacement string (deletion).
* [x] Special replacement patterns in normal mode.

### getRegexMatches

* [x] Empty array for no matches.
* [x] Correct indices for simple match.
* [x] Capture groups support.
* [x] Global flag handling.
* [x] Empty text handling.
* [x] Nested groups.
* [x] Optional groups that do not match.
* [x] Multiple separate matches with global flag.

### getReplacementSegments

* [x] Basic replacement without groups.
* [x] `$1` group reference.
* [x] `$$` (literal dollar sign).
* [x] `$&` (entire match).
* [x] `` $` `` (before match).
* [x] `$'` (after match).
* [x] Non-existent group reference as literal.
* [x] Global regex with multiple matches.
* [x] Replacement with no special patterns.
* [x] Empty replacement.
* [x] Preserve non-matched parts.
* [x] Correct segment positions tracking.
* [x] Optional group that is undefined.
* [x] Multiple occurrences with global regex.
* [x] Complex replacement pattern.
* [x] No matches handling.
* [x] Adjacent matches.
* [x] Case-insensitive regex.
* [x] Multiple groups with same content.

## BatchRenamer Component (`src/components/BatchRenamer/BatchRenamer.test.tsx`)

These tests cover the main container component and its integration with Tauri mocks.

- **Rendering**

* [x] Renders title and main buttons ("Select Files").

- **Interaction**

* [x] Mocked file selection via `dialog.open`.
* [x] Mocked backend invocation `batch_rename`.
* [x] Verifies that the UI updates after selection.
* [x] Verifies that the rename command is called with correct arguments.

## Diff Utilities (`src/utils/diff.test.ts`)

These tests cover the LCS-based diff algorithm.

- **Basic Cases**

* [x] Identical strings (unchanged).
* [x] Empty original string (pure addition).
* [x] Empty modified string (pure deletion).
* [x] Both empty strings.

- **Simple Replacements**

* [x] Replacement at the beginning.
* [x] Replacement in the middle.
* [x] Replacement at the end.

- **Single Character Changes**

* [x] Single character addition.
* [x] Single character removal.
* [x] Single character replacement.

- **Complex Diffs**

* [x] Multiple changes throughout string.
* [x] Complete string replacement.
* [x] Insertion in the middle.

- **Special Characters**

* [x] Special characters correctly handled.
* [x] Unicode characters (BMP).
* [x] Whitespace changes.

- **Output Integrity**

* [x] Segments reconstruct original and modified strings.
* [x] No empty segments produced.

## DiffText Component (`src/components/BatchRenamer/DiffText.test.tsx`)

- **Original Mode**

* [x] Shows removed characters with strikethrough.
* [x] Shows unchanged characters without styling.
* [x] Does not show added characters.

- **Modified Mode**

* [x] Shows added characters with success styling.
* [x] Shows unchanged characters without styling.
* [x] Does not show removed characters.

- **Edge Cases**

* [x] Identical strings (no diff).
* [x] Empty original string.
* [x] Empty modified string.
* [x] Complete replacement.
* [x] Special characters.
* [x] Unicode characters.

## RegexHighlightText Component (`src/components/BatchRenamer/RegexHighlightText.test.tsx`)

- **Basic Rendering**

* [x] Text without matches.
* [x] Text with matches and group highlighting.
* [x] Nested groups correctly handled.

- **Edge Cases**

* [x] Empty text.
* [x] Match at the end of text.
* [x] Match at the beginning of text.
* [x] Multiple separate matches (global regex).
* [x] Group index greater than color count (wrapping).
* [x] Single character matches.
* [x] Full text match (entire string).
* [x] Special characters in text.
* [x] Unicode and emoji in text.
* [x] Unmatched portions without highlight.
