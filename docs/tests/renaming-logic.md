# Existing Tests

This document tracks the unit tests that have already been implemented in the codebase.

## Renaming Logic (`src/components/BatchRenamer/renamingUtils.test.ts`)

These tests cover the core business logic for calculating new filenames.

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

## BatchRenamer Component (`src/components/BatchRenamer/BatchRenamer.test.tsx`)

These tests cover the main container component and its integration with Tauri mocks.

- **Rendering**

* [x] Renders title and main buttons ("Select Files").

- **Interaction**

* [x] Mocked file selection via `dialog.open`.
* [x] Mocked backend invocation `batch_rename`.
* [x] Verifies that the UI updates after selection.
* [x] Verifies that the rename command is called with correct arguments.
