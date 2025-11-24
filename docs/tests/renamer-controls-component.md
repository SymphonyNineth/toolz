# RenamerControls Component Tests

**Target Component:** `src/components/BatchRenamer/RenamerControls.tsx`

## Goal
Ensure the control panel correctly accepts input, communicates changes to the parent, and handles all edge cases including regex mode features, dynamic UI updates, and special character handling.

## Test Cases to Implement

### Rendering
- [x] Should render "Find" and "Replace with" input fields.
- [x] Should render "Case Sensitive" toggle/checkbox.
- [x] Should render "Regex Mode" toggle/checkbox.
- [x] Should display initial values from props (findText, replaceText, caseSensitive, regexMode).

### Interactions
- [x] Should call `setFindText` when typing in the Find input.
- [x] Should call `setReplaceText` when typing in the Replace input.
- [x] Should call `setCaseSensitive` when toggling the checkbox.
- [x] Should call `setRegexMode` when toggling the checkbox.

### Validation & Feedback
- [x] Should display the regex error message when `regexError` prop is provided.
- [x] Should not display error message when `regexError` is undefined.
- [x] Should display different error messages based on the specific `regexError` value.

### Regex Mode Features
- [x] Should show "Regex Cheat Sheet" button when regex mode is enabled.
- [x] Should hide "Regex Cheat Sheet" button when regex mode is disabled.
- [x] Should show regex-specific placeholder ("Regex pattern...") in Find input when regex mode enabled.
- [x] Should show text placeholder ("Text to find...") in Find input when regex mode disabled.
- [x] Should show regex-specific placeholder ("Use $1, $2 for groups...") in Replace input when regex mode enabled.
- [x] Should show text placeholder ("Replacement text...") in Replace input when regex mode disabled.

### Edge Cases
- [x] Should handle empty string input.
- [x] Should handle special regex characters (.*+?^${}()|[]\\) in find input.
- [x] Should handle unicode characters (emoji, non-Latin scripts) in inputs.
- [x] Should toggle case sensitive from false to true.
- [x] Should toggle case sensitive from true to false.
- [x] Should toggle regex mode from false to true.
- [x] Should toggle regex mode from true to false.
- [x] Should handle multiple rapid input changes correctly.
- [x] Should handle very long input strings (stress test with 1000+ characters).

## Test Coverage Summary

**Total Test Cases:** 24
- **Rendering:** 4 tests
- **Interactions:** 4 tests
- **Validation & Feedback:** 3 tests
- **Regex Mode Features:** 6 tests
- **Edge Cases:** 10 tests

All tests verify proper isolation of component logic, correct prop handling, and comprehensive edge case coverage.

