# Phase 4: Polish

## Goal

Refine the user experience and styling.

## Tasks

- [x] **Status Feedback**

  - Add visual indicators for file status:
    - Idle (default)
    - Success (Green checkmark)
    - Error (Red X with tooltip)

- [x] **Styling**

  - Use CSS Grid or Flexbox to create a clean split-view layout for the file list.
  - Style the inputs and buttons to match the application theme.
  - Ensure the list handles scrolling for large numbers of files.

- [x] **Edge Case Handling**

  - Disable "Rename" button if no files are selected or if Find text is empty.
  - Show a warning if a rename would result in a name collision (if detectable on frontend).
  - Handle empty "Replace" text (effectively deleting the found text).

- [x] **Theme Support**

  - Add a toggle for Dark/Light mode.
  - Persist user preference.
  - Use Tailwind CSS variables for colors/themes to make it easier to later add more themes.

- [x] **Layout Improvements**
  - Increase content width to utilize available space (e.g., `max-w-6xl` or `max-w-full` with padding).
  - Improve spacing between elements (inputs, buttons, list).
  - Enhance visual hierarchy.
