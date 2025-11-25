export type PatternType = "simple" | "extension" | "regex";

export interface FileMatchItem {
  path: string;
  name: string;
  matchRanges: [number, number][];
  size: number;
  isDirectory: boolean;
  selected: boolean;
}

export interface SearchFilesParams {
  basePath: string;
  pattern: string;
  patternType: PatternType;
  includeSubdirs: boolean;
  caseSensitive: boolean;
}

export interface DeleteFilesParams {
  files: string[];
  deleteEmptyDirs: boolean;
}

export interface DeleteResult {
  successful: string[];
  failed: [string, string][];
  deletedDirs: string[];
}

// Legacy simple progress type for batched operations
export interface DeleteProgress {
  current: number;
  total: number;
}

// ==================== Streaming Progress Types ====================
// These match the backend Rust enum variants serialized with camelCase

/**
 * Progress events for file search operations.
 * Received via Tauri Channel during search_files_with_progress.
 */
export type SearchProgressEvent =
  | { type: "started"; basePath: string }
  | { type: "scanning"; currentDir: string; filesFound: number }
  | { type: "matching"; totalFiles: number }
  | { type: "completed"; matchesFound: number };

/**
 * Progress events for batch delete operations.
 * Received via Tauri Channel during batch_delete_with_progress.
 */
export type StreamingDeleteProgress =
  | { type: "started"; totalFiles: number }
  | { type: "progress"; current: number; total: number; currentPath: string }
  | { type: "completed"; successful: number; failed: number };

/**
 * State for tracking search progress in UI
 */
export interface SearchProgressState {
  phase: "idle" | "scanning" | "matching" | "completed";
  currentDir?: string;
  filesFound: number;
  totalFiles?: number;
  matchesFound?: number;
}

