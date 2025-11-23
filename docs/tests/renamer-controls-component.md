# RenamerControls Component Tests

**Target Component:** `src/components/BatchRenamer/RenamerControls.tsx`

## Goal
Ensure the control panel correctly accepts input and communicates changes to the parent.

## Test Cases to Implement

### Rendering
- [ ] Should render "Find" and "Replace with" input fields.
- [ ] Should render "Case Sensitive" toggle/checkbox.
- [ ] Should render "Regex Mode" toggle/checkbox.

### Interactions
- [ ] Should call `setFindText` when typing in the Find input.
- [ ] Should call `setReplaceText` when typing in the Replace input.
- [ ] Should call `setCaseSensitive` when toggling the checkbox.
- [ ] Should call `setRegexMode` when toggling the checkbox.

### Validation & Feedback
- [ ] Should display the regex error message when `regexError` prop is provided.
- [ ] Should not display error message when `regexError` is undefined.
- [ ] Should disable/enable controls appropriately if needed (e.g., if certain modes are mutually exclusive).
