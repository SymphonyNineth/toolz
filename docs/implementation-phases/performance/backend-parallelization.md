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
- [x] Add `rayon = "1"` to the `[dependencies]` section in `src-tauri/Cargo.toml`

### Step 1.2: Verify Build
- [x] Run `cargo build` in `src-tauri/` to ensure the dependency is installed correctly

---

## Phase 2: Create Progress Event Types

### Step 2.1: Define Progress Types for File Search (remove.rs)
- [x] Create a `SearchProgress` enum with variants:
  - `Started` - Contains the base directory path being searched
  - `Scanning` - Contains current directory being scanned and files found so far
  - `Matching` - Contains number of files being pattern-matched
  - `Completed` - Contains total matches found

### Step 2.2: Define Progress Types for File Listing (rename.rs)
- [x] Create a `ListProgress` enum with variants:
  - `Started` - Contains the base directory path
  - `Scanning` - Contains current directory and file count so far
  - `Completed` - Contains total file count

### Step 2.3: Define Progress Types for Operations
- [x] Create a `RenameProgress` enum with Started, Progress, and Completed variants
- [x] Create a `DeleteProgress` enum with Started, Progress, and Completed variants

---

## Phase 3: Implement Streaming File Search (File Remover)

### Step 3.1: Create New Streaming Command
- [x] Add `search_files_with_progress` command in `remove.rs`
- [x] Accept a `Channel<SearchProgress>` parameter for progress events
- [x] Keep the existing `search_files_by_pattern` command unchanged for backward compatibility

### Step 3.2: Implement Two-Phase Scanning
- [x] **Phase A - Directory Walking**: Use WalkDir to collect all file paths first, sending `Scanning` progress events periodically (every 100 files or every directory)
- [x] **Phase B - Pattern Matching**: Use Rayon's `par_iter()` to match patterns in parallel across collected files

### Step 3.3: Send Progress Events
- [x] Send `Started` event when beginning the operation
- [x] Send `Scanning` events during directory traversal (throttle to avoid overwhelming the channel)
- [x] Send `Matching` event when starting parallel pattern matching
- [x] Send `Completed` event with final results

### Step 3.4: Add Parallelization for Pattern Matching
- [x] Convert the file iteration to use `par_iter()` for the pattern matching phase
- [x] Use `filter_map` to apply pattern matching in parallel and collect results
- [x] Ensure thread-safe access to the regex pattern (compile once, clone for threads)

---

## Phase 4: Implement Streaming File Listing (Batch Renamer)

### Step 4.1: Create New Streaming Command
- [x] Add `list_files_with_progress` command in `rename.rs`
- [x] Accept a `Channel<ListProgress>` parameter for progress events
- [x] Keep the existing `list_files_recursively` command unchanged

### Step 4.2: Implement Progressive Directory Walking
- [x] Walk directories and send progress every N files (e.g., every 50 files)
- [x] Include current directory path in progress events for user feedback

### Step 4.3: Consider Parallel Directory Reading
- [x] Evaluate if parallel directory reading with Rayon provides benefit
- Note: File system I/O is typically the bottleneck, so WalkDir sequential traversal is used with parallel pattern matching in the file remover

---

## Phase 5: Implement Streaming Batch Operations

### Step 5.1: Create Streaming Rename Command
- [x] Add `batch_rename_with_progress` command in `rename.rs`
- [x] Accept a `Channel<RenameProgress>` parameter
- [x] Send progress after each file rename operation

### Step 5.2: Create Streaming Delete Command
- [x] Add `batch_delete_with_progress` command in `remove.rs`
- [x] Accept a `Channel<DeleteProgress>` parameter
- [x] Send progress after each file deletion

### Step 5.3: Add Parallelization for Batch Operations
- [x] Evaluated: Parallel rename/delete not implemented as file I/O is the bottleneck and sequential operations allow for proper progress tracking
- Note: Batch operations remain sequential to ensure accurate progress reporting and avoid race conditions

---

## Phase 6: Register New Commands

### Step 6.1: Update lib.rs
- [x] Add new streaming commands to the `generate_handler!` macro:
  - `search_files_with_progress`
  - `list_files_with_progress`
  - `batch_rename_with_progress`
  - `batch_delete_with_progress`

---

## Phase 7: Testing

### Step 7.1: Unit Tests for Progress Events
- [x] Test progress type serialization (JSON format with camelCase)
- [x] Test that progress events contain correct field names

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
- [x] Add doc comments to all new commands explaining their purpose
- [x] Document the progress event types and when each is sent
- [x] Note the thread-safety considerations for parallel operations

### Step 8.2: Update Project Documentation
- [x] Document the new streaming API in the appropriate docs file
- [x] Note backward compatibility with existing commands

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

## Frontend Usage

To use the streaming commands from the frontend:

```typescript
import { Channel, invoke } from '@tauri-apps/api/core';

// Search files with progress
const onProgress = new Channel<SearchProgress>();
onProgress.onmessage = (msg) => {
  console.log('Progress:', msg);
  // Update UI based on msg.type: 'started', 'scanning', 'matching', 'completed'
};

const results = await invoke('search_files_with_progress', {
  basePath: '/path/to/search',
  pattern: '*.txt',
  patternType: 'extension',
  includeSubdirs: true,
  caseSensitive: false,
  onProgress
});
```

---

## Acceptance Criteria

- [x] Large folders (10000+ files) no longer freeze the UI (backend support added)
- [x] Progress updates can be sent to frontend during long operations
- [x] Pattern matching uses multiple CPU cores (via Rayon)
- [x] Existing functionality remains unchanged (backward compatible)
- [x] All new code has unit test coverage for progress types
- [ ] Performance improvement is measurable on large directories (requires frontend integration)

