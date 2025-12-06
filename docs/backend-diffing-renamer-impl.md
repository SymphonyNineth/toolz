# Backend Refactor Part 1: Infrastructure & Renamer

This document tracks the implementation of the backend diffing refactor for the **Batch Renamer**.

> [!NOTE]
> All backend changes should be verified with `cargo test`.
> All frontend changes should be verified with `bun run test --run`.

## Phase 1: Backend Infrastructure & Core Logic

Set up the fundamental Rust modules and state management.

- [ ] **1.1. Add Dependencies**
    - [ ] Update `src-tauri/Cargo.toml` with `dissimilar` and `regex`.
- [ ] **1.2. Implement `diff.rs`**
    - [ ] Create `src-tauri/src/diff.rs`.
    - [ ] Implement `DiffSegment`, `DiffSegmentType` types.
    - [ ] Implement `RegexSegment` enum (`Text(String)` / `Group { id, text }`).
    - [ ] Implement `compute_diff` using `dissimilar`.
    - [ ] Implement `get_regex_highlights` - returns FULL segmented string with gaps (not just matches).
    - [ ] Implement `has_capture_groups` using `Regex::captures_len() > 1` (robust, not string heuristic).
    - [ ] **TEST**: Unit tests in `diff.rs` covering:
        - Simple string diffs (insert/delete/equal).
        - `get_regex_highlights` returns Text segments for non-matching parts.
        - `get_regex_highlights` handles multiple capture groups.
        - `has_capture_groups` returns false for `(?:)`, `\(`, `[(]`.
- [ ] **1.3. Implement `file_state.rs`**
    - [ ] Create `src-tauri/src/file_state.rs`.
    - [ ] Implement `FileState` struct with `renamer_files: RwLock<Vec<String>>`.
    - [ ] Implement getters/setters.
    - [ ] Register `FileState` in `lib.rs` using `manage()`.
    - [ ] **TEST**: Write unit tests in `file_state.rs` covering:
        - Concurrent access (read/write).
        - State clearing.

## Phase 2: Renamer Backend Integration

Connect the new core logic to the Renamer commands.

- [ ] **2.1. Update `rename.rs` Commands**
    - [ ] Modify `list_files_with_progress` to store results in `FileState`.
    - [ ] Implement `compute_previews` command in `src-tauri/src/rename.rs`.
    - [ ] Use `diff::compute_diff` for standard mode, `diff::get_regex_highlights` for regex mode.
    - [ ] Return `Vec<FilePreviewResult>`.
    - [ ] **TEST**: Write integration tests in `rename.rs` covering:
        - `compute_previews` returns correct `Diff` type for simple search.
        - `compute_previews` returns correct `RegexGroups` type for capture groups.
        - `compute_previews` handles empty state correctly.
- [ ] **2.2. Verify `batch_rename` Integration**
    - [ ] Update `batch_rename` to use files from `FileState` instead of passing them all.
    - [ ] **TEST**: Ensure rename operations still work with the state-based approach.

## Phase 3: Renamer Frontend Refactor

Update the frontend to use the new "backend state" model.

- [ ] **3.1. Update Types**
    - [ ] Update `src/components/BatchRenamer/types.ts` with `FilePreviewResult`, `DiffSegment`, `RegexSegment`.
- [ ] **3.2. Refactor `BatchRenamer/index.tsx` Data Flow**
    - [ ] Remove `selectedPaths` signal (replace with active session tracking if needed, or just rely on backend).
    - [ ] Remove `computeDiff` and regex logic from frontend.
    - [ ] Implement `invoke('compute_previews', ...)` effect when controls change.
    - [ ] Update `selectFiles`/`selectFolders` to only receive counts/status.
    - [ ] **TEST**: Update component tests to mock the new backend commands.
- [ ] **3.3. Refactor `FileRow.tsx` Rendering**
    - [ ] Update component to accept `FilePreviewResult`.
    - [ ] Implement rendering for `Diff` mode (using `original_segments`).
    - [ ] Implement rendering for `RegexGroups` mode:
        - Original column: Render `RegexSegment[]` with color-coded groups.
        - New Name column: Render `DiffSegment[]` (standard diff).
    - [ ] **TEST**: Unit tests for `FileRow` checking both visual modes.
- [ ] **3.4. Cleanup**
    - [ ] Remove unused `src/utils/diff.ts`.
    - [ ] Remove unused regex helpers in `renamingUtils.ts`.
