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

## Verification Plan

### Automated Tests
- None planned for this phase (UI-focused feature).

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
