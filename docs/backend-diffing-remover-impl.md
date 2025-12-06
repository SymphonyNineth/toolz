# Backend Refactor Part 2: File Remover

This document tracks the implementation of the backend diffing refactor for the **File Remover**.

> [!NOTE]
> All backend changes should be verified with `cargo test`.
> All frontend changes should be verified with `bun run test --run`.

## Phase 1: Remover Backend Integration

Extend the state management to support File Remover.

- [ ] **1.1. Extend `FileState`**
    - [ ] Update `src-tauri/src/file_state.rs`.
    - [ ] Add `remover_files: RwLock<Vec<FileMatchResult>>` to `FileState`.
    - [ ] Add getters/setters for remover results.
    - [ ] **TEST**: Unit tests for new state fields.
- [ ] **1.2. Update `remove.rs` Commands**
    - [ ] Modify `search_files_by_pattern` to store results in `FileState`.
    - [ ] Modify `search_files_with_progress` to store results in `FileState` upon completion.
    - [ ] Implement `get_remover_results` command to fetch stored results.
    - [ ] **TEST**: Integration tests in `remove.rs` using `FileState`:
        - Verify search results are stored correctly.
        - Verify retrieval returns the same data.

## Phase 2: Remover Frontend Refactor

Update the frontend to retrieve results from backend state.

- [ ] **2.1. Refactor `FileRemover/index.tsx`**
    - [ ] Update data fetching logic to:
        1. Invoke search (receive count).
        2. Invoke `get_remover_results` (receive data).
    - [ ] Ensure `matchRanges` from backend are preserved and passed to rows.
    - [ ] **TEST**: Update component tests to mock the new command sequence.
- [ ] **2.2. Verify Highlighting**
    - [ ] Verify `FileRemoverRow` correctly uses the `matchRanges` from the backend result.
    - [ ] (Existing highlighting logic in `FileRemoverRow` should likely work, just needs verification).
