# Phase 1: Backend Setup

## Goal
Set up the Tauri backend with necessary plugins and custom commands to support file renaming.

## Tasks

- [x] **Add Dependencies**
    - Add `tauri-plugin-dialog` to `src-tauri/Cargo.toml`.
    - Run `cargo build` to ensure dependencies are downloaded.

- [x] **Register Plugin**
    - Initialize and register `tauri-plugin-dialog` in `src-tauri/src/lib.rs`.

- [x] **Implement `batch_rename` Command**
    - Create a new command function `batch_rename` in `src-tauri/src/lib.rs` (or a separate module).
    - **Signature**: `fn batch_rename(files: Vec<(String, String)>) -> Result<Vec<String>, String>`
    - **Logic**:
        - Iterate over the provided file pairs (current path, new path).
        - Use `std::fs::rename` to rename each file.
        - Collect successfully renamed paths.
        - Handle errors (e.g., permission denied, file not found) gracefully, perhaps returning a partial success or a detailed error list.
    - Register the command in the `tauri::Builder` invoke handler.
