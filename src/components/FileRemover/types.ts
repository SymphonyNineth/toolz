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

export interface DeleteProgress {
  current: number;
  total: number;
}

