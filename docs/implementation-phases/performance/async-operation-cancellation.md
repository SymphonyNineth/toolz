# Async Operation Cancellation Plan

## Problem Statement

When a user navigates away from a page where an async Rust operation is in progress (file listing, renaming, searching, or deleting), the operation continues running in the background. This causes:

1. **Memory leaks** - Operations hold onto memory (file lists, results) that will never be used
2. **Performance degradation** - CPU cycles wasted on operations whose results are discarded
3. **Resource contention** - File system operations may conflict with new operations started on another page
4. **Unexpected behavior** - Operations may complete and attempt to send progress updates to defunct channels

## Affected Operations

| Module      | Function                     | Operation Type                    |
| ----------- | ---------------------------- | --------------------------------- |
| `rename.rs` | `batch_rename_with_progress` | File renaming                     |
| `rename.rs` | `list_files_with_progress`   | Directory scanning                |
| `remove.rs` | `search_files_with_progress` | File search with pattern matching |
| `remove.rs` | `batch_delete_with_progress` | File deletion                     |

## Final Specifications

### 1. Backend Architecture (Rust)

#### Concurrency: DashMap

Use `DashMap` for the registry. It provides lock-free concurrent access without the contention issues of `Mutex<HashMap>`.

#### The `try_register` Pattern

Implement a clean API that returns a `Result`:

```rust
fn try_register(id: &str) -> Result<(OperationGuard, Arc<AtomicBool>), CancelledError>
```

- Returns `Ok((guard, flag))` if registration succeeds
- Returns `Err(CancelledError)` if a tombstone exists (operation was pre-cancelled)
- Command handlers use `?` operator for clean early exit

#### Lazy Tombstone Cleanup

No background threads. Instead, use lazy sweeping:

- **Trigger:** When `try_register` is called AND map size > 100
- **Action:** Scan and remove tombstones older than 1 minute
- **Benefit:** Zero complexity, no spawned tasks, cleanup happens naturally

### 2. Safety Mechanisms

#### Implicit Cancellation (Dead Man's Switch)

In progress loops, check the result of `channel.send()`:

- If emit fails → frontend is gone (app closed, refreshed, or navigated away)
- Treat emit failure exactly like a cancellation flag
- Exit the loop immediately

This provides a second layer of protection beyond explicit cancellation.

#### Cancellation Check Granularity

`AtomicBool::load()` is nanoseconds-fast. Check **every single iteration**:

- No batch checking logic (e.g., "every 100th file")
- Keeps loops simple and readable
- Immediate response to cancellation

### 3. Frontend Integration (SolidJS)

#### ID Generation

Generate IDs on the client using `nanoid` before invoking any command. This ensures the ID is always available for cleanup, even if the invoke is still pending.

#### UX Distinction: Cancellation vs Error

| Outcome      | UI Feedback                    |
| ------------ | ------------------------------ |
| Cancellation | Info/Neutral toast (blue/gray) |
| Error        | Error toast (red)              |

Cancellation is not an error—it's expected behavior when the user navigates away.

## Proposed Solution

### Overview

Implement a cooperative cancellation mechanism where:

1. Frontend generates a unique operation ID before starting any async operation
2. The backend maintains a concurrent registry of active operations with cancellation signals
3. Frontend can request cancellation by operation ID (even before operation starts)
4. Operations check cancellation status every iteration and exit early if cancelled
5. Operations also exit if progress channel send fails (implicit cancellation)
6. RAII guards ensure automatic cleanup on completion, error, or panic

### Backend Changes (Rust)

#### 1. Create Operation Registry

Create a new module `src-tauri/src/operations.rs` that manages:

- A thread-safe concurrent registry using **DashMap**
- Cancellation tokens/flags for each operation
- RAII guards for automatic cleanup
- Tombstone support with lazy cleanup for race condition handling

#### 2. Cancellation Mechanism

Use `Arc<AtomicBool>` as a cancellation flag:

- Simple and lightweight
- Can be shared across threads safely
- Check every iteration—no batching needed

#### 3. RAII Guard for Automatic Cleanup

Create a `Drop` guard struct that automatically removes the operation from the registry when it goes out of scope (function ends, errors, or panics).

#### 4. Tombstone Strategy for Race Conditions

**Problem:** Race condition between start and cancel:

1. Frontend generates ID `ABC`
2. Frontend calls `start_operation('ABC')`
3. User immediately clicks "Back"
4. Frontend `onCleanup` calls `cancel_operation('ABC')`
5. Due to thread scheduling, `cancel` reaches backend BEFORE `start`
6. `cancel_operation` finds nothing, returns "Success"
7. `start_operation` finally executes and runs uncancelled

**Solution:** When `cancel_operation` is called for a non-existent ID, register it as a "tombstone" (pre-cancelled entry with timestamp). When `try_register` is called:

1. Check if ID exists as tombstone
2. If tombstone exists → return `Err(CancelledError)`, remove tombstone
3. If doesn't exist → register normally
4. If map size > 100 → lazy sweep tombstones older than 1 minute

#### 5. New Tauri Command

Create a `cancel_operation` command that:

- Takes an operation ID
- If operation exists: sets cancellation flag to true
- If operation doesn't exist: creates a tombstone entry with current timestamp
- Returns success (always succeeds, idempotent)

### Frontend Changes (SolidJS)

#### 1. Generate IDs on Frontend

Use `nanoid` to generate IDs before invoking. This ensures we always have the ID available for cleanup.

#### 2. Register Cleanup BEFORE Starting Operation

Order matters to avoid race conditions:

1. Generate operation ID
2. Register `onCleanup` handler with the ID
3. Start the operation

#### 3. Handle Responses by Type

- **Success:** Normal completion flow
- **Cancelled:** Show info/neutral toast, no error state
- **Error:** Show error toast with message

### Operation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
├─────────────────────────────────────────────────────────────────┤
│  1. User triggers operation (e.g., select folder)               │
│  2. Generate operation ID with nanoid()                         │
│  3. Register onCleanup FIRST (before invoke)                    │
│  4. Call Tauri command with operation ID                        │
│                                                                  │
│  [User navigates away - at any point]                           │
│                                                                  │
│  5. onCleanup fires                                              │
│  6. Call cancel_operation(operationId)                          │
│     - Works even if operation hasn't started yet (tombstone)    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          BACKEND                                 │
├─────────────────────────────────────────────────────────────────┤
│  [On start_operation call]                                      │
│  1. Receive operation request with ID                           │
│  2. Call try_register(id)                                       │
│     - If Err(Cancelled): return early with Cancelled status     │
│     - If map > 100 entries: lazy sweep old tombstones           │
│  3. Get (guard, cancel_flag) from Ok result                     │
│  4. Start spawn_blocking with cancel_flag                       │
│                                                                  │
│  [In the blocking task loop - EVERY iteration]                  │
│  5. Check cancel_flag.load()                                    │
│  6. Check channel.send() result                                 │
│  7. If either fails: return Cancelled status                    │
│                                                                  │
│  [On cancel_operation call]                                     │
│  8. Look up operation in registry                               │
│  9. If found: set cancellation flag to true                     │
│  10. If not found: create tombstone with timestamp              │
│                                                                  │
│  [On function exit - any path]                                  │
│  11. OperationGuard dropped → auto-removes from registry        │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Order

### Phase 1: Backend Infrastructure

- [ ] Add `dashmap` to Cargo.toml
- [ ] Create `operations.rs` module with:
  - [ ] `OperationEntry` enum (Active with flag, or Tombstone with timestamp)
  - [ ] `OperationRegistry` struct using DashMap
  - [ ] `OperationGuard` RAII struct with Drop impl
  - [ ] `try_register()` returning `Result<(Guard, Flag), CancelledError>`
  - [ ] `cancel()` method with tombstone creation
  - [ ] Lazy tombstone sweep logic (when size > 100, remove > 1 min old)
- [ ] Add registry as Tauri managed state in `lib.rs`
- [ ] Implement `cancel_operation` Tauri command
- [ ] Write unit tests for registry (including race condition scenarios)

### Phase 2: Update Rename Operations

- [ ] Modify `list_files_with_progress`:
  - [ ] Accept operation ID parameter
  - [ ] Call `try_register()` with `?` for early exit if cancelled
  - [ ] Check cancellation flag AND channel.send() result each iteration
  - [ ] Return `Cancelled` status when cancelled
- [ ] Modify `batch_rename_with_progress` similarly
- [ ] Update existing tests, add cancellation tests

### Phase 3: Update Remove Operations

- [ ] Modify `search_files_with_progress`:
  - [ ] Accept operation ID parameter
  - [ ] Call `try_register()` with `?` for early exit
  - [ ] Check cancellation in scan loop (every iteration)
  - [ ] Handle parallel match phase cancellation
  - [ ] Return `Cancelled` status when cancelled
- [ ] Modify `batch_delete_with_progress` similarly
- [ ] Update existing tests, add cancellation tests

### Phase 4: Frontend Integration

- [ ] Add `nanoid` to package.json
- [ ] Update BatchRenamer component:
  - [ ] Generate ID with `nanoid()` before operation
  - [ ] Register `onCleanup` before `invoke()`
  - [ ] Handle `Cancelled` response → info toast
  - [ ] Handle `Error` response → error toast
- [ ] Update FileRemover component similarly
- [ ] Style distinction between cancelled (neutral) and error (red) states

### Phase 5: Testing & Polish

- [ ] Manual testing: navigate away during various operation phases
- [ ] Test rapid navigation scenarios (start → immediate cancel)
- [ ] Test app refresh during operation (dead man's switch)
- [ ] Verify no memory leaks with repeated start/cancel cycles
- [ ] Verify tombstones are cleaned up via lazy sweep
- [ ] Update documentation

## Edge Cases Handled

| Edge Case                                 | Solution                                                      |
| ----------------------------------------- | ------------------------------------------------------------- |
| Operation completes before cancel request | Cancel is a no-op (ID already removed by guard)               |
| Cancel called multiple times              | Idempotent - setting flag to true is safe to repeat           |
| Frontend unmounts during operation start  | Tombstone strategy - cancel creates pre-cancelled entry       |
| Rust code panics mid-operation            | RAII guard auto-cleans registry on panic                      |
| Error propagation with `?` operator       | RAII guard auto-cleans on early return                        |
| Backend restarts                          | Registry is in-memory, starts fresh (no stale entries)        |
| App closed/refreshed during operation     | Dead man's switch - channel.send() fails, operation exits     |
| Tombstone accumulation                    | Lazy sweep when map > 100 entries, removes tombstones > 1 min |

## Testing Strategy

### Overview

| Component              | Test Type          | Approach                                   |
| ---------------------- | ------------------ | ------------------------------------------ |
| `OperationRegistry`    | Unit tests         | Full coverage - pure Rust logic            |
| `OperationGuard` Drop  | Unit tests         | Full coverage - verify cleanup on drop     |
| Lazy tombstone sweep   | Unit tests         | Full coverage - mock timestamps            |
| Cancellation flag loop | Unit tests         | Pattern test - verify early exit           |
| Dead man's switch      | Manual/Integration | Channel is concrete type, hard to mock     |
| Race conditions        | Manual stress test | Rapid navigation, trust DashMap guarantees |
| Full E2E flow          | Manual             | Navigate away during operations            |

### Unit Tests: OperationRegistry (Full Coverage)

The registry is pure Rust logic with no Tauri dependencies—ideal for unit testing.

#### Test Cases

**Registration:**

- `test_try_register_success` - Returns Ok with guard and flag for new ID
- `test_try_register_returns_error_if_tombstone_exists` - Pre-cancelled ID fails
- `test_try_register_removes_tombstone_on_check` - Tombstone cleaned up after rejection

**Cancellation:**

- `test_cancel_sets_flag_for_active_operation` - Flag changes from false to true
- `test_cancel_creates_tombstone_for_unknown_id` - New entry created with timestamp
- `test_cancel_is_idempotent` - Multiple calls don't cause issues

**RAII Guard:**

- `test_guard_drop_removes_active_entry` - Entry gone after guard dropped
- `test_guard_drop_on_panic_still_cleans_up` - Use `std::panic::catch_unwind`
- `test_guard_drop_does_not_remove_other_entries` - Only removes its own ID

**Lazy Sweep:**

- `test_lazy_sweep_not_triggered_under_threshold` - No sweep when map < 100
- `test_lazy_sweep_triggered_at_threshold` - Sweep runs when map >= 100
- `test_lazy_sweep_removes_old_tombstones` - Tombstones > 1 min removed
- `test_lazy_sweep_keeps_recent_tombstones` - Tombstones < 1 min kept
- `test_lazy_sweep_keeps_active_operations` - Active entries never removed

**Concurrency:**

- `test_concurrent_register_and_cancel` - No deadlocks or panics
- `test_multiple_operations_independent` - Operations don't interfere

### Unit Tests: Cancellation Loop Pattern

Test that loops exit correctly when cancellation is detected.

#### Test Cases

- `test_loop_exits_when_flag_set` - Spawn thread, set flag, verify early exit
- `test_loop_completes_when_flag_not_set` - Full iteration without cancellation
- `test_loop_checks_every_iteration` - Counter shows immediate response

### Tests NOT Suitable for Unit Testing

#### Dead Man's Switch

The Tauri `Channel<T>` is a concrete type, not a trait. Mocking would require:

- Creating a trait abstraction (adds complexity)
- Wrapping the channel (runtime overhead)

**Recommendation:** Test manually by closing/refreshing the app during an operation. Verify logs show early exit.

#### Race Conditions

Timing-dependent scenarios are inherently flaky in tests. Options considered:

- **`loom` crate** - Exhaustive concurrency testing, but complex setup
- **Stress tests** - Run many iterations, but flaky and slow

**Recommendation:** Trust DashMap's battle-tested concurrency guarantees. Manual stress testing: rapidly navigate between pages while operations run.

### Manual Testing Checklist

#### Basic Cancellation

- [ ] Start file listing → navigate away → verify logs show cancellation
- [ ] Start rename operation → navigate away → verify partial renames don't occur
- [ ] Start search → navigate away → verify logs show cancellation
- [ ] Start delete → navigate away → verify partial deletes handled correctly

#### Race Conditions

- [ ] Click folder → immediately navigate away (tests tombstone path)
- [ ] Rapidly switch between Renamer and Remover pages
- [ ] Start operation → spam the back button

#### Dead Man's Switch

- [ ] Start long operation → refresh the page → verify backend exits
- [ ] Start long operation → close the app → reopen → verify no zombie process

#### UI Feedback

- [ ] Cancellation shows neutral/info toast (not error)
- [ ] Actual errors show red error toast
- [ ] Progress UI resets correctly after cancellation

### Test File Locations

| Test Suite                   | File                                   |
| ---------------------------- | -------------------------------------- |
| OperationRegistry unit tests | `src-tauri/src/operations.rs` (inline) |
| Rename cancellation tests    | `src-tauri/src/rename.rs` (inline)     |
| Remove cancellation tests    | `src-tauri/src/remove.rs` (inline)     |

## Progress Event Types

Add a `Cancelled` variant to each progress enum:

```rust
pub enum ListProgress {
    Started { ... },
    Scanning { ... },
    Completed { ... },
    Cancelled,  // New variant
}
```

Frontend uses this to distinguish outcomes and show appropriate UI feedback.

## Files to Modify

### New Dependencies

**Backend (`src-tauri/Cargo.toml`):**

- `dashmap` - Concurrent HashMap for high-performance registry access

**Frontend (`package.json`):**

- `nanoid` - Fast, secure unique ID generation

### New Files

- `src-tauri/src/operations.rs` - Operation registry, RAII guards, and cancellation logic

### Backend Modifications

- `src-tauri/src/Cargo.toml` - Add dashmap dependency
- `src-tauri/src/lib.rs` - Register operations module, add managed state, add cancel command
- `src-tauri/src/rename.rs` - Add cancellation support to async functions
- `src-tauri/src/remove.rs` - Add cancellation support to async functions

### Frontend Modifications

- `package.json` - Add nanoid dependency
- `src/components/BatchRenamer/index.tsx` - Generate IDs, register cleanup, handle cancellation
- `src/components/FileRemover/index.tsx` - Generate IDs, register cleanup, handle cancellation
