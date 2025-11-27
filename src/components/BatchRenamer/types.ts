// ==================== Streaming Progress Types ====================
// These match the backend Rust enum variants serialized with camelCase

/**
 * Progress events for file listing operations.
 * Received via Tauri Channel during list_files_with_progress.
 */
export type ListProgressEvent =
  | { type: "started"; basePath: string }
  | { type: "scanning"; currentDir: string; filesFound: number }
  | { type: "completed"; totalFiles: number }
  | { type: "cancelled" };

/**
 * Progress events for batch rename operations.
 * Received via Tauri Channel during batch_rename_with_progress.
 */
export type RenameProgressEvent =
  | { type: "started"; totalFiles: number }
  | { type: "progress"; current: number; total: number; currentPath: string }
  | { type: "completed"; successful: number; failed: number }
  | { type: "cancelled" };

/**
 * State for tracking folder scanning progress in UI
 */
export interface ListProgressState {
  phase: "idle" | "scanning" | "completed" | "cancelled";
  currentDir?: string;
  filesFound: number;
  totalFiles?: number;
}

/**
 * State for tracking rename operation progress in UI
 */
export interface RenameProgressState {
  phase: "idle" | "renaming" | "completed" | "cancelled";
  current: number;
  total: number;
  currentPath?: string;
}

