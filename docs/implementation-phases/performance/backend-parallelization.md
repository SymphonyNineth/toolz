# Backend Parallelization and Progress Streaming

This document covers adding parallel processing with Rayon and progress streaming with Tauri Channels to prevent UI freezing when processing large folders.

## Overview

**Problem**: When selecting a large folder (thousands of files), the app hangs because:
- File listing and pattern matching run synchronously
- No progress feedback is sent until the entire operation completes
- Files are processed one at a time (no parallelization)

**Solution**: 
- Use Rayon for parallel file processing
- Use Tauri Channels to stream progress updates to the frontend
- Keep existing commands for backward compatibility, add new streaming variants

---

## Phase 1: Add Rayon Dependency

### Step 1.1: Update Cargo.toml
- [ ] Add `rayon = "1"` to the `[dependencies]` section in `src-tauri/Cargo.toml`

### Step 1.2: Verify Build
- [ ] Run `cargo build` in `src-tauri/` to ensure the dependency is installed correctly

---

## Phase 2: Create Progress Event Types

### Step 2.1: Define Progress Types for File Search (remove.rs)
- [ ] Create a `SearchProgress` enum with variants:
  - `Started` - Contains total directory count to scan
  - `Scanning` - Contains current directory being scanned and files found so far
  - `Matching` - Contains number of files being pattern-matched
  - `Completed` - Contains total matches found

### Step 2.2: Define Progress Types for File Listing (rename.rs)
- [ ] Create a `ListProgress` enum with variants:
  - `Started` - Contains the base directory path
  - `Scanning` - Contains current directory and file count so far
  - `Completed` - Contains total file count

### Step 2.3: Define Progress Types for Operations
- [ ] Create a `RenameProgress` struct with fields for current index and total count
- [ ] Create a `DeleteProgress` struct with fields for current index and total count

---

## Phase 3: Implement Streaming File Search (File Remover)

### Step 3.1: Create New Streaming Command
- [ ] Add `search_files_with_progress` command in `remove.rs`
- [ ] Accept a `Channel<SearchProgress>` parameter for progress events
- [ ] Keep the existing `search_files_by_pattern` command unchanged for backward compatibility

### Step 3.2: Implement Two-Phase Scanning
- [ ] **Phase A - Directory Walking**: Use WalkDir to collect all file paths first, sending `Scanning` progress events periodically (every 100 files or every directory)
- [ ] **Phase B - Pattern Matching**: Use Rayon's `par_iter()` to match patterns in parallel across collected files

### Step 3.3: Send Progress Events
- [ ] Send `Started` event when beginning the operation
- [ ] Send `Scanning` events during directory traversal (throttle to avoid overwhelming the channel)
- [ ] Send `Matching` event when starting parallel pattern matching
- [ ] Send `Completed` event with final results

### Step 3.4: Add Parallelization for Pattern Matching
- [ ] Convert the file iteration to use `par_iter()` for the pattern matching phase
- [ ] Use `filter_map` to apply pattern matching in parallel and collect results
- [ ] Ensure thread-safe access to the regex pattern (compile once, clone for threads)

---

## Phase 4: Implement Streaming File Listing (Batch Renamer)

### Step 4.1: Create New Streaming Command
- [ ] Add `list_files_with_progress` command in `rename.rs`
- [ ] Accept a `Channel<ListProgress>` parameter for progress events
- [ ] Keep the existing `list_files_recursively` command unchanged

### Step 4.2: Implement Progressive Directory Walking
- [ ] Walk directories and send progress every N files (e.g., every 50 files)
- [ ] Include current directory path in progress events for user feedback

### Step 4.3: Consider Parallel Directory Reading
- [ ] Evaluate if parallel directory reading with Rayon provides benefit
- [ ] If beneficial, use `par_bridge()` to parallelize WalkDir iteration
- [ ] Note: File system I/O may be the bottleneck, parallelization benefit varies by system

---

## Phase 5: Implement Streaming Batch Operations

### Step 5.1: Create Streaming Rename Command
- [ ] Add `batch_rename_with_progress` command in `rename.rs`
- [ ] Accept a `Channel<RenameProgress>` parameter
- [ ] Send progress after each file rename operation

### Step 5.2: Create Streaming Delete Command
- [ ] Add `batch_delete_with_progress` command in `remove.rs`
- [ ] Accept a `Channel<DeleteProgress>` parameter
- [ ] Send progress after each file deletion

### Step 5.3: Add Parallelization for Batch Operations
- [ ] Evaluate if parallel rename/delete provides benefit (likely limited by I/O)
- [ ] If parallel, use Rayon's `par_iter()` with atomic counters for progress
- [ ] Ensure proper error collection from parallel operations

---

## Phase 6: Register New Commands

### Step 6.1: Update lib.rs
- [ ] Add new streaming commands to the `generate_handler!` macro:
  - `search_files_with_progress`
  - `list_files_with_progress`
  - `batch_rename_with_progress`
  - `batch_delete_with_progress`

---

## Phase 7: Testing

### Step 7.1: Unit Tests for Progress Events
- [ ] Test that `Started` event is sent at the beginning
- [ ] Test that `Completed` event is sent at the end
- [ ] Test that progress events contain correct counts

### Step 7.2: Integration Tests
- [ ] Test streaming command with a directory containing many files
- [ ] Verify all files are still found (same results as non-streaming version)
- [ ] Test that parallel pattern matching produces same results as sequential

### Step 7.3: Performance Tests (Manual)
- [ ] Compare performance of parallel vs sequential pattern matching on large directories
- [ ] Measure progress event frequency to ensure UI responsiveness
- [ ] Test with 1000, 10000, and 100000 files to verify scalability

---

## Phase 8: Documentation

### Step 8.1: Update Code Documentation
- [ ] Add doc comments to all new commands explaining their purpose
- [ ] Document the progress event types and when each is sent
- [ ] Note the thread-safety considerations for parallel operations

### Step 8.2: Update Project Documentation
- [ ] Document the new streaming API in the appropriate docs file
- [ ] Note backward compatibility with existing commands

---

## Technical Notes

### Rayon Usage Patterns
- Use `par_iter()` to convert sequential iteration to parallel
- Use `filter_map()` for combined filtering and transformation
- Rayon automatically handles work-stealing across CPU cores

### Tauri Channel Considerations
- Channels are ordered and reliable for streaming data
- Avoid sending too many events (throttle to every N items)
- Channel automatically handles serialization of Rust types to JSON

### Thread Safety
- Regex patterns should be compiled once and shared (they are thread-safe)
- Use `Arc` if sharing mutable state across threads
- Collect results into thread-local vectors, then merge

---

## Acceptance Criteria

- [ ] Large folders (10000+ files) no longer freeze the UI
- [ ] Progress updates appear in the frontend during long operations
- [ ] Pattern matching uses multiple CPU cores
- [ ] Existing functionality remains unchanged (backward compatible)
- [ ] All new code has unit test coverage
- [ ] Performance improvement is measurable on large directories

