# Phase 5: Advanced Features

## Goal
Implement advanced renaming capabilities and improve user confidence with better visualization and safety mechanisms.

## Tasks

- [x] **Diff Highlighting**
    - In the "Original Name" column, highlight characters that will be removed in **red**.
    - In the "New Name" column, highlight characters that will be added in **green**.
    - Keep unchanged characters with standard styling.

- [ ] **Advanced Regex Support**
    - Add a toggle/mode for "Regex Mode".
    - Allow users to enter valid JavaScript Regular Expressions.
    - Provide a cheat sheet or tooltip for common regex patterns.
    - Validate regex input and show errors if invalid.

- [ ] **Numbering & Sequencing**
    - Add a feature to append or prepend numbers to filenames.
    - Options for:
        - Start number (e.g., 1, 001).
        - Increment step.
        - Separator (e.g., "-", "_", " ").
        - Position (Start or End of filename).

- [ ] **Undo Functionality**
    - Store the history of rename operations (map of new path -> old path).
    - Add an "Undo Last Rename" button after a successful operation.
    - Implement the backend logic to reverse the rename (renaming new path back to old path).
    - Handle cases where the undo might fail (e.g., file deleted or moved externally).
