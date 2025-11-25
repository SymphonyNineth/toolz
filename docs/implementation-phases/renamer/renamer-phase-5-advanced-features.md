# Phase 5: Advanced Features

## Goal

Implement advanced renaming capabilities and improve user confidence with better visualization and safety mechanisms.

## Tasks

- [x] **Diff Highlighting**

  - In the "Original Name" column, highlight characters that will be removed in **red**.
  - In the "New Name" column, highlight characters that will be added in **green**.
  - Keep unchanged characters with standard styling.

- [x] **Advanced Regex Support**

  - Add a toggle/mode for "Regex Mode".
  - Allow users to enter valid JavaScript Regular Expressions.
  - Provide a cheat sheet for common regex patterns.
  - Validate regex input and show errors if invalid.

- [x] **Working with Regex groups**

  - At the moment users can input regex groups

- [x] **Show the user value of each group**

  - Make it easy to see the value of each group

- [x] **Color code groups**

  - At the original name instead of showing all red, color code the groups
  - When showing the value of each group, show it in the new same color

- [x] **Numbering & Sequencing**

  - Add a feature to append or prepend numbers to filenames.
  - Options for:
    - Start number (e.g., 1, 001).
    - Increment step.
    - Separator (e.g., "-", "\_", " ").
    - Position (Start or End or Index of filename).
  - Implementation details:
    - `NumberingControls.tsx` - Collapsible UI panel with all numbering options
    - `renamingUtils.ts` - `formatNumber()` and `applyNumbering()` utility functions
    - Numbering is applied after find/replace operations
    - Preview shows the sequence (e.g., "001, 002, ...")
    - Checkbox and panel expansion are synchronized: checking opens the panel, unchecking closes it
    - Full test coverage in `NumberingControls.test.tsx` and `renamingUtils.test.ts`

- [ ] **Undo Functionality**
  - Store the history of rename operations (map of new path -> old path).
  - Add an "Undo Last Rename" button after a successful operation.
  - Implement the backend logic to reverse the rename (renaming new path back to old path).
  - Handle cases where the undo might fail (e.g., file deleted or moved externally).
