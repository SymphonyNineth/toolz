# Phase 2: Frontend Setup

## Goal
Prepare the SolidJS frontend to interact with the backend and handle file selection.

## Tasks

- [x] **Install Frontend Dependencies**
    - Run `npm install @tauri-apps/plugin-dialog`.

- [x] **Create Component Structure**
    - Create directory `src/components/BatchRenamer`.
    - Create `src/components/BatchRenamer/index.tsx` as the main entry point.
    - Update `src/App.tsx` to render the `BatchRenamer` component (or set up routing if preferred).

- [x] **Implement File Selection Logic**
    - inside `BatchRenamer/index.tsx`:
        - Import `open` from `@tauri-apps/plugin-dialog`.
        - Create a "Select Files" button.
        - Implement the handler to open the native file dialog allowing multiple selections.
        - Store selected file paths in a local signal or store.
