//! # Operation Registry Module
//!
//! Provides a thread-safe registry for managing async operations with cancellation support.
//! Uses DashMap for lock-free concurrent access and RAII guards for automatic cleanup.

use dashmap::DashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

/// Threshold for triggering lazy tombstone cleanup.
const SWEEP_THRESHOLD: usize = 100;

/// Maximum age for tombstones before they are cleaned up.
const TOMBSTONE_MAX_AGE: Duration = Duration::from_secs(60);

/// Error returned when an operation was cancelled before it could start.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CancelledError;

impl std::fmt::Display for CancelledError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Operation was cancelled")
    }
}

impl std::error::Error for CancelledError {}

/// Represents an entry in the operation registry.
#[derive(Debug)]
enum OperationEntry {
    /// An active operation with its cancellation flag.
    Active(Arc<AtomicBool>),
    /// A tombstone marking a pre-cancelled operation.
    Tombstone(Instant),
}

/// Thread-safe registry for managing async operations.
///
/// Provides:
/// - Registration of new operations with cancellation flags
/// - Cancellation of running or not-yet-started operations
/// - Automatic cleanup via RAII guards
/// - Lazy tombstone cleanup to prevent memory leaks
#[derive(Debug, Default)]
pub struct OperationRegistry {
    entries: DashMap<String, OperationEntry>,
}

impl OperationRegistry {
    /// Creates a new empty operation registry.
    pub fn new() -> Self {
        Self {
            entries: DashMap::new(),
        }
    }

    /// Attempts to register a new operation.
    ///
    /// # Arguments
    ///
    /// * `id` - Unique identifier for the operation
    ///
    /// # Returns
    ///
    /// * `Ok((OperationGuard, Arc<AtomicBool>))` - Guard for automatic cleanup and cancellation flag
    /// * `Err(CancelledError)` - If the operation was pre-cancelled (tombstone exists)
    ///
    /// # Lazy Cleanup
    ///
    /// When the registry exceeds `SWEEP_THRESHOLD` entries, old tombstones are automatically removed.
    pub fn try_register(&self, id: &str) -> Result<(OperationGuard<'_>, Arc<AtomicBool>), CancelledError> {
        // Check for tombstone first
        if let Some(entry) = self.entries.get(id) {
            if matches!(*entry, OperationEntry::Tombstone(_)) {
                // Remove tombstone and return error
                drop(entry); // Release the read lock before removing
                self.entries.remove(id);
                return Err(CancelledError);
            }
        }

        // Lazy sweep if threshold exceeded
        if self.entries.len() > SWEEP_THRESHOLD {
            self.sweep_old_tombstones();
        }

        // Create cancellation flag and register
        let cancel_flag = Arc::new(AtomicBool::new(false));
        self.entries.insert(id.to_string(), OperationEntry::Active(cancel_flag.clone()));

        let guard = OperationGuard {
            id: id.to_string(),
            registry: self,
        };

        Ok((guard, cancel_flag))
    }

    /// Cancels an operation by ID.
    ///
    /// If the operation is active, sets its cancellation flag to true.
    /// If the operation doesn't exist, creates a tombstone to prevent future registration.
    ///
    /// This method is idempotent - calling it multiple times is safe.
    pub fn cancel(&self, id: &str) {
        if let Some(entry) = self.entries.get(id) {
            if let OperationEntry::Active(flag) = &*entry {
                flag.store(true, Ordering::SeqCst);
            }
            // If already a tombstone, do nothing
        } else {
            // Create tombstone for pre-cancellation
            self.entries.insert(id.to_string(), OperationEntry::Tombstone(Instant::now()));
        }
    }

    /// Removes an entry from the registry.
    ///
    /// Called automatically by `OperationGuard::drop`.
    fn remove(&self, id: &str) {
        self.entries.remove(id);
    }

    /// Removes tombstones older than `TOMBSTONE_MAX_AGE`.
    fn sweep_old_tombstones(&self) {
        let now = Instant::now();
        self.entries.retain(|_, entry| {
            match entry {
                OperationEntry::Active(_) => true, // Keep all active operations
                OperationEntry::Tombstone(created_at) => {
                    now.duration_since(*created_at) < TOMBSTONE_MAX_AGE
                }
            }
        });
    }

    /// Returns the number of entries in the registry.
    #[cfg(test)]
    pub fn len(&self) -> usize {
        self.entries.len()
    }

    /// Returns true if the registry is empty.
    #[cfg(test)]
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }

    /// Checks if an operation is registered (for testing).
    #[cfg(test)]
    pub fn contains(&self, id: &str) -> bool {
        self.entries.contains_key(id)
    }

    /// Checks if an entry is a tombstone (for testing).
    #[cfg(test)]
    pub fn is_tombstone(&self, id: &str) -> bool {
        self.entries
            .get(id)
            .map(|e| matches!(*e, OperationEntry::Tombstone(_)))
            .unwrap_or(false)
    }

    /// Checks if an entry is active (for testing).
    #[cfg(test)]
    pub fn is_active(&self, id: &str) -> bool {
        self.entries
            .get(id)
            .map(|e| matches!(*e, OperationEntry::Active(_)))
            .unwrap_or(false)
    }

    /// Inserts a tombstone with a custom timestamp (for testing lazy sweep).
    #[cfg(test)]
    pub fn insert_tombstone_with_age(&self, id: &str, age: Duration) {
        let created_at = Instant::now() - age;
        self.entries.insert(id.to_string(), OperationEntry::Tombstone(created_at));
    }
}

/// RAII guard that automatically removes an operation from the registry when dropped.
///
/// This ensures cleanup happens on:
/// - Normal function completion
/// - Early returns via `?` operator
/// - Panics
#[derive(Debug)]
pub struct OperationGuard<'a> {
    id: String,
    registry: &'a OperationRegistry,
}

impl<'a> Drop for OperationGuard<'a> {
    fn drop(&mut self) {
        self.registry.remove(&self.id);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::panic;
    use std::thread;

    // ==================== Registration Tests ====================

    #[test]
    fn test_try_register_success() {
        let registry = OperationRegistry::new();
        let result = registry.try_register("op1");
        
        assert!(result.is_ok());
        let (guard, flag) = result.unwrap();
        assert!(!flag.load(Ordering::SeqCst));
        assert!(registry.is_active("op1"));
        
        drop(guard);
    }

    #[test]
    fn test_try_register_returns_error_if_tombstone_exists() {
        let registry = OperationRegistry::new();
        
        // Pre-cancel the operation
        registry.cancel("op1");
        assert!(registry.is_tombstone("op1"));
        
        // Try to register - should fail
        let result = registry.try_register("op1");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), CancelledError);
    }

    #[test]
    fn test_try_register_removes_tombstone_on_check() {
        let registry = OperationRegistry::new();
        
        // Pre-cancel the operation
        registry.cancel("op1");
        assert!(registry.is_tombstone("op1"));
        
        // Try to register - should fail and remove tombstone
        let _ = registry.try_register("op1");
        assert!(!registry.contains("op1"));
    }

    // ==================== Cancellation Tests ====================

    #[test]
    fn test_cancel_sets_flag_for_active_operation() {
        let registry = OperationRegistry::new();
        let (guard, flag) = registry.try_register("op1").unwrap();
        
        assert!(!flag.load(Ordering::SeqCst));
        registry.cancel("op1");
        assert!(flag.load(Ordering::SeqCst));
        
        drop(guard);
    }

    #[test]
    fn test_cancel_creates_tombstone_for_unknown_id() {
        let registry = OperationRegistry::new();
        
        assert!(!registry.contains("op1"));
        registry.cancel("op1");
        assert!(registry.is_tombstone("op1"));
    }

    #[test]
    fn test_cancel_is_idempotent() {
        let registry = OperationRegistry::new();
        let (guard, flag) = registry.try_register("op1").unwrap();
        
        registry.cancel("op1");
        registry.cancel("op1");
        registry.cancel("op1");
        
        assert!(flag.load(Ordering::SeqCst));
        assert!(registry.is_active("op1"));
        
        drop(guard);
    }

    // ==================== RAII Guard Tests ====================

    #[test]
    fn test_guard_drop_removes_active_entry() {
        let registry = OperationRegistry::new();
        
        {
            let (guard, _flag) = registry.try_register("op1").unwrap();
            assert!(registry.contains("op1"));
            drop(guard);
        }
        
        assert!(!registry.contains("op1"));
    }

    #[test]
    fn test_guard_drop_on_panic_still_cleans_up() {
        let registry = OperationRegistry::new();
        
        let result = panic::catch_unwind(panic::AssertUnwindSafe(|| {
            let (_guard, _flag) = registry.try_register("op1").unwrap();
            assert!(registry.contains("op1"));
            panic!("Simulated panic");
        }));
        
        assert!(result.is_err());
        assert!(!registry.contains("op1"));
    }

    #[test]
    fn test_guard_drop_does_not_remove_other_entries() {
        let registry = OperationRegistry::new();
        
        let (guard1, _flag1) = registry.try_register("op1").unwrap();
        let (guard2, _flag2) = registry.try_register("op2").unwrap();
        
        assert!(registry.contains("op1"));
        assert!(registry.contains("op2"));
        
        drop(guard1);
        
        assert!(!registry.contains("op1"));
        assert!(registry.contains("op2"));
        
        drop(guard2);
    }

    // ==================== Lazy Sweep Tests ====================

    #[test]
    fn test_lazy_sweep_not_triggered_under_threshold() {
        let registry = OperationRegistry::new();
        
        // Add old tombstone
        registry.insert_tombstone_with_age("old_tombstone", Duration::from_secs(120));
        
        // Register a few operations (under threshold)
        for i in 0..10 {
            registry.cancel(&format!("op{}", i));
        }
        
        // Old tombstone should still exist (no sweep triggered)
        assert!(registry.contains("old_tombstone"));
    }

    #[test]
    fn test_lazy_sweep_triggered_at_threshold() {
        let registry = OperationRegistry::new();
        
        // Add old tombstone
        registry.insert_tombstone_with_age("old_tombstone", Duration::from_secs(120));
        
        // Add entries to exceed threshold
        for i in 0..SWEEP_THRESHOLD + 1 {
            registry.cancel(&format!("tombstone{}", i));
        }
        
        // Trigger sweep by registering
        let _ = registry.try_register("trigger");
        
        // Old tombstone should be removed
        assert!(!registry.contains("old_tombstone"));
    }

    #[test]
    fn test_lazy_sweep_removes_old_tombstones() {
        let registry = OperationRegistry::new();
        
        // Add old tombstones
        registry.insert_tombstone_with_age("old1", Duration::from_secs(120));
        registry.insert_tombstone_with_age("old2", Duration::from_secs(90));
        
        // Add recent tombstones
        registry.cancel("recent1");
        registry.cancel("recent2");
        
        // Fill to threshold
        for i in 0..SWEEP_THRESHOLD {
            registry.cancel(&format!("filler{}", i));
        }
        
        // Trigger sweep
        let _ = registry.try_register("trigger");
        
        // Old tombstones should be removed
        assert!(!registry.contains("old1"));
        assert!(!registry.contains("old2"));
        
        // Recent tombstones should remain
        assert!(registry.contains("recent1"));
        assert!(registry.contains("recent2"));
    }

    #[test]
    fn test_lazy_sweep_keeps_recent_tombstones() {
        let registry = OperationRegistry::new();
        
        // Add recent tombstone (30 seconds old, under 60 second threshold)
        registry.insert_tombstone_with_age("recent", Duration::from_secs(30));
        
        // Fill to threshold
        for i in 0..SWEEP_THRESHOLD + 1 {
            registry.cancel(&format!("filler{}", i));
        }
        
        // Trigger sweep
        let _ = registry.try_register("trigger");
        
        // Recent tombstone should remain
        assert!(registry.contains("recent"));
    }

    #[test]
    fn test_lazy_sweep_keeps_active_operations() {
        let registry = OperationRegistry::new();
        
        // Register active operation
        let (guard, _flag) = registry.try_register("active").unwrap();
        
        // Fill to threshold with tombstones
        for i in 0..SWEEP_THRESHOLD + 1 {
            registry.cancel(&format!("tombstone{}", i));
        }
        
        // Trigger sweep
        let _ = registry.try_register("trigger");
        
        // Active operation should remain
        assert!(registry.is_active("active"));
        
        drop(guard);
    }

    // ==================== Concurrency Tests ====================

    #[test]
    fn test_concurrent_register_and_cancel() {
        let registry = Arc::new(OperationRegistry::new());
        let mut handles = vec![];
        
        // Spawn threads that register and cancel operations
        for i in 0..10 {
            let reg = Arc::clone(&registry);
            handles.push(thread::spawn(move || {
                for j in 0..100 {
                    let id = format!("op_{}_{}", i, j);
                    if let Ok((guard, _flag)) = reg.try_register(&id) {
                        // Simulate some work
                        thread::yield_now();
                        drop(guard);
                    }
                }
            }));
            
            let reg = Arc::clone(&registry);
            handles.push(thread::spawn(move || {
                for j in 0..100 {
                    let id = format!("op_{}_{}", i, j);
                    reg.cancel(&id);
                }
            }));
        }
        
        // All threads should complete without deadlock or panic
        for handle in handles {
            handle.join().unwrap();
        }
    }

    #[test]
    fn test_multiple_operations_independent() {
        let registry = OperationRegistry::new();
        
        let (guard1, flag1) = registry.try_register("op1").unwrap();
        let (guard2, flag2) = registry.try_register("op2").unwrap();
        let (guard3, flag3) = registry.try_register("op3").unwrap();
        
        // Cancel only op2
        registry.cancel("op2");
        
        assert!(!flag1.load(Ordering::SeqCst));
        assert!(flag2.load(Ordering::SeqCst));
        assert!(!flag3.load(Ordering::SeqCst));
        
        drop(guard1);
        drop(guard2);
        drop(guard3);
    }

    // ==================== Cancellation Loop Pattern Tests ====================

    #[test]
    fn test_loop_exits_when_flag_set() {
        let flag = Arc::new(AtomicBool::new(false));
        let flag_clone = Arc::clone(&flag);
        let started = Arc::new(AtomicBool::new(false));
        let started_clone = Arc::clone(&started);
        
        let handle = thread::spawn(move || {
            let mut iterations = 0;
            for _ in 0..1_000_000 {
                // Signal that the loop has started
                if iterations == 0 {
                    started_clone.store(true, Ordering::SeqCst);
                }
                if flag_clone.load(Ordering::SeqCst) {
                    break;
                }
                iterations += 1;
            }
            iterations
        });
        
        // Wait for the loop to start
        while !started.load(Ordering::SeqCst) {
            thread::yield_now();
        }
        
        // Let the loop run a bit more
        thread::sleep(Duration::from_millis(1));
        
        // Set cancellation flag
        flag.store(true, Ordering::SeqCst);
        
        let iterations = handle.join().unwrap();
        
        // Should have exited early (not all iterations)
        assert!(iterations < 1_000_000, "Loop should exit early, got {} iterations", iterations);
    }

    #[test]
    fn test_loop_completes_when_flag_not_set() {
        let flag = Arc::new(AtomicBool::new(false));
        let flag_clone = Arc::clone(&flag);
        
        let handle = thread::spawn(move || {
            let mut iterations = 0;
            for _ in 0..100 {
                if flag_clone.load(Ordering::SeqCst) {
                    break;
                }
                iterations += 1;
            }
            iterations
        });
        
        let iterations = handle.join().unwrap();
        
        // Should complete all iterations
        assert_eq!(iterations, 100);
    }

    #[test]
    fn test_loop_checks_every_iteration() {
        let flag = Arc::new(AtomicBool::new(false));
        let flag_clone = Arc::clone(&flag);
        let counter = Arc::new(std::sync::atomic::AtomicUsize::new(0));
        let counter_clone = Arc::clone(&counter);
        
        let handle = thread::spawn(move || {
            for _ in 0..1000 {
                counter_clone.fetch_add(1, Ordering::SeqCst);
                if flag_clone.load(Ordering::SeqCst) {
                    break;
                }
            }
        });
        
        // Wait for a few iterations
        while counter.load(Ordering::SeqCst) < 10 {
            thread::yield_now();
        }
        
        // Set flag
        flag.store(true, Ordering::SeqCst);
        
        handle.join().unwrap();
        
        let final_count = counter.load(Ordering::SeqCst);
        
        // Should have stopped shortly after flag was set (within a few iterations)
        // The exact count depends on timing, but should be much less than 1000
        assert!(final_count < 100, "Loop should exit promptly, got {} iterations", final_count);
    }
}

