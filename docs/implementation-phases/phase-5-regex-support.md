# Implementation Plan - Advanced Regex Support

## Goal
Add advanced regex pattern matching capabilities to the batch file renamer, allowing power users to leverage JavaScript regular expressions for complex renaming operations.

## User Review Required
> [!NOTE]
> The regex mode will be toggled via a checkbox in the controls. When enabled, the "Find" field will accept JavaScript regex patterns instead of literal strings.

> [!IMPORTANT]
> Invalid regex patterns will be caught and displayed to the user with clear error messages to prevent confusion.

## Proposed Changes

### Batch Renamer Controls
#### [MODIFY] [RenamerControls.tsx](file:///home/hayk/side-projects/simple-tools/src/components/BatchRenamer/RenamerControls.tsx)
- Add a new `regexMode` prop (boolean) and `setRegexMode` handler.
- Add a checkbox for "Regex Mode" below the "Case Sensitive" checkbox.
- Add a button/link to show the regex cheat sheet.
- Display regex validation errors if the pattern is invalid.

---

### Batch Renamer Main Component
#### [MODIFY] [index.tsx](file:///home/hayk/side-projects/simple-tools/src/components/BatchRenamer/index.tsx)
- Add `regexMode` signal with `createSignal<boolean>(false)`.
- Update the `fileItems` memo to handle regex mode:
  - When `regexMode` is `true`, treat `findText()` as a regex pattern (no escaping).
  - When `regexMode` is `false`, escape special characters (current behavior).
  - Wrap regex creation in try-catch to handle invalid patterns.
  - Store regex validation errors in a new signal `regexError`.
- Pass `regexMode`, `setRegexMode`, and `regexError` to `RenamerControls`.
- Reset `regexError` when `findText` or `regexMode` changes.

---

### Regex Cheat Sheet Component
#### [NEW] [RegexCheatSheet.tsx](file:///home/hayk/side-projects/simple-tools/src/components/BatchRenamer/RegexCheatSheet.tsx)
- Create a modal/dialog component that displays common regex patterns.
- Include examples like:
  - `.` - Any character
  - `\d` - Any digit
  - `\w` - Any word character
  - `^` - Start of string
  - `$` - End of string
  - `[abc]` - Character class
  - `(group)` - Capture group
  - `*`, `+`, `?` - Quantifiers
- Include practical examples for file renaming:
  - Remove numbers: `\d+` → ``
  - Replace spaces with underscores: `\s` → `_`
  - Extract part of filename: `^(.+)_old$` → `$1_new`
- Add a close button to dismiss the cheat sheet.

---

### Regex Highlighting System
#### [RegexHighlightText.tsx](file:///home/hayk/side-projects/simple-tools/src/components/BatchRenamer/RegexHighlightText.tsx)
The component visualizes regex matches and replacements with color-coded highlighting:

**Original Name (mode="original"):**
- **Red with strikethrough**: Group 0 (full match) - text that will be removed/replaced
- **Group colors (blue, purple, orange, etc.)**: Capture groups (1, 2, 3...) - text that can be referenced in replacement

**New Name (mode="modified"):**
- **Green**: Literal replacement text (groupIndex -1) - new text being added
- **Group colors**: Text from group references ($1, $2, etc.) - showing origin of content

**Color Scheme:**
- Red and green are reserved exclusively for removed/added text highlighting
- Capture groups use distinct colors: blue, purple, orange, pink, cyan, yellow, indigo, teal
- This ensures clear visual distinction between "what changes" and "what transfers"

#### [renamingUtils.ts](file:///home/hayk/side-projects/simple-tools/src/components/BatchRenamer/renamingUtils.ts)
- `getRegexMatches()`: Returns regex matches with group indices for original name highlighting
- `getReplacementSegments()`: Returns segments for new name highlighting, including:
  - Group reference segments (groupIndex > 0)
  - Full match reference segments (groupIndex 0, for $&)
  - Literal replacement text segments (groupIndex -1)

---

## Verification Plan

### Automated Tests
- `RegexHighlightText.test.tsx`: Tests for both original and modified mode highlighting
- `renamingUtils.test.ts`: Tests for `getReplacementSegments` including literal segment tracking

### Manual Verification
1. **Regex Mode Toggle**:
   - Enable regex mode and verify the checkbox is checked.
   - Enter a valid regex pattern (e.g., `\d+`) and verify it matches numbers in filenames.
   - Enter an invalid regex pattern (e.g., `[unclosed`) and verify an error message is displayed.

2. **Regex Patterns**:
   - Test basic patterns: `.`, `\d`, `\w`, `\s`
   - Test anchors: `^test`, `test$`
   - Test capture groups: `(.+)_(\d+)` with replacement `$2_$1`
   - Test quantifiers: `a+`, `b*`, `c?`

3. **Regex Cheat Sheet**:
   - Click the cheat sheet button/link.
   - Verify the modal opens with all pattern examples.
   - Close the modal and verify it dismisses properly.

4. **Edge Cases**:
   - Empty regex pattern (should match nothing or show warning).
   - Regex with no matches (preview should show no changes).
   - Case sensitivity with regex mode (verify flags are applied correctly).
