//! Session-based file state management.
//!
//! This module provides thread-safe storage for files selected during
//! a renaming session. Files stay on the backend after selection,
//! allowing the frontend to request computed previews without
//! re-transmitting all file paths.

use std::sync::RwLock;

/// Session-based file storage for the renamer.
///
/// Files are stored in memory and can be accessed from multiple threads.
/// Uses `RwLock` for thread-safe read/write access.
pub struct FileState {
    renamer_files: RwLock<Vec<String>>,
}

impl FileState {
    /// Creates a new empty FileState.
    pub fn new() -> Self {
        Self {
            renamer_files: RwLock::new(Vec::new()),
        }
    }

    /// Sets the list of files for the renamer session.
    ///
    /// Replaces any existing files.
    pub fn set_files(&self, files: Vec<String>) {
        *self.renamer_files.write().unwrap() = files;
    }

    /// Gets a clone of the current file list.
    pub fn get_files(&self) -> Vec<String> {
        self.renamer_files.read().unwrap().clone()
    }

    /// Clears all stored files.
    pub fn clear(&self) {
        self.renamer_files.write().unwrap().clear();
    }

    /// Returns the number of stored files.
    #[cfg(test)]
    pub fn len(&self) -> usize {
        self.renamer_files.read().unwrap().len()
    }
}

impl Default for FileState {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    use std::thread;

    #[test]
    fn test_file_state_set_get() {
        let state = FileState::new();
        let files = vec![
            "/path/to/file1.txt".to_string(),
            "/path/to/file2.txt".to_string(),
        ];

        state.set_files(files.clone());
        let result = state.get_files();

        assert_eq!(result, files);
    }

    #[test]
    fn test_file_state_clear() {
        let state = FileState::new();
        state.set_files(vec!["file1.txt".to_string()]);
        assert_eq!(state.len(), 1);

        state.clear();
        assert_eq!(state.len(), 0);
        assert!(state.get_files().is_empty());
    }

    #[test]
    fn test_file_state_replace_files() {
        let state = FileState::new();
        state.set_files(vec!["old.txt".to_string()]);
        state.set_files(vec!["new1.txt".to_string(), "new2.txt".to_string()]);

        let files = state.get_files();
        assert_eq!(files.len(), 2);
        assert!(files.contains(&"new1.txt".to_string()));
        assert!(files.contains(&"new2.txt".to_string()));
        assert!(!files.contains(&"old.txt".to_string()));
    }

    #[test]
    fn test_file_state_empty_by_default() {
        let state = FileState::new();
        assert!(state.get_files().is_empty());
    }

    #[test]
    fn test_file_state_concurrent_access() {
        let state = Arc::new(FileState::new());
        let mut handles = vec![];

        // Writer thread
        let state_clone = Arc::clone(&state);
        handles.push(thread::spawn(move || {
            for i in 0..10 {
                state_clone.set_files(vec![format!("file{}.txt", i)]);
            }
        }));

        // Reader threads
        for _ in 0..3 {
            let state_clone = Arc::clone(&state);
            handles.push(thread::spawn(move || {
                for _ in 0..20 {
                    let _ = state_clone.get_files();
                }
            }));
        }

        for handle in handles {
            handle.join().unwrap();
        }

        // Just verify we can still read without panic
        let _ = state.get_files();
    }
}
