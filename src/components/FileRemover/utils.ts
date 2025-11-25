import { PatternType, FileMatchItem } from "./types";

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

/**
 * Validate a search pattern based on its type
 * @returns Error message if invalid, undefined if valid
 */
export function validatePattern(
  pattern: string,
  type: PatternType
): string | undefined {
  if (!pattern.trim()) {
    return "Pattern cannot be empty";
  }

  if (type === "regex") {
    try {
      new RegExp(pattern);
    } catch (e) {
      return `Invalid regex: ${(e as Error).message}`;
    }
  }

  if (type === "extension") {
    const extensions = pattern.split(",").map((s) => s.trim());
    if (extensions.some((ext) => !ext)) {
      return "Invalid extension format: empty extension found";
    }
    // Check for invalid characters in extensions
    const invalidExt = extensions.find((ext) => {
      const cleaned = ext.startsWith(".") ? ext.slice(1) : ext;
      return cleaned.length === 0 || /[\/\\:*?"<>|]/.test(cleaned);
    });
    if (invalidExt) {
      return `Invalid extension: "${invalidExt}"`;
    }
  }

  return undefined;
}

/**
 * Check for potentially dangerous deletion operations
 * @returns Warning message if operation is dangerous, undefined if safe
 */
export function checkDangerousOperation(
  files: FileMatchItem[],
  basePath: string
): string | undefined {
  // Warn if deleting many files
  if (files.length > 100) {
    return `You are about to delete ${files.length} files. This is a large number of files.`;
  }

  // Warn if deleting from system directories (Linux/Unix)
  const systemPaths = ["/usr", "/bin", "/etc", "/var", "/opt", "/lib", "/sbin"];
  const normalizedBase = basePath.toLowerCase();
  
  for (const sysPath of systemPaths) {
    if (normalizedBase === sysPath || normalizedBase.startsWith(sysPath + "/")) {
      return `Warning: You are attempting to delete files from a system directory (${sysPath}).`;
    }
  }

  // Warn if deleting from home root
  if (normalizedBase === "/home" || normalizedBase === "/root") {
    return "Warning: You are attempting to delete files from a root user directory.";
  }

  // Warn if deleting from Windows system paths
  const windowsSystemPaths = ["c:\\windows", "c:\\program files", "c:\\program files (x86)"];
  for (const winPath of windowsSystemPaths) {
    if (normalizedBase.toLowerCase().startsWith(winPath)) {
      return `Warning: You are attempting to delete files from a Windows system directory.`;
    }
  }

  // Check for large total size (> 1GB)
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  if (totalSize > 1024 * 1024 * 1024) {
    return `Warning: You are about to delete ${formatFileSize(totalSize)} of data.`;
  }

  return undefined;
}

/**
 * Build highlighted segments from match ranges
 */
export function buildHighlightedSegments(
  text: string,
  ranges: [number, number][]
): { text: string; isMatch: boolean }[] {
  if (!ranges || ranges.length === 0) {
    return [{ text, isMatch: false }];
  }

  const segments: { text: string; isMatch: boolean }[] = [];
  let lastEnd = 0;

  // Sort ranges by start position
  const sortedRanges = [...ranges].sort((a, b) => a[0] - b[0]);

  for (const [start, end] of sortedRanges) {
    if (start > lastEnd) {
      segments.push({ text: text.slice(lastEnd, start), isMatch: false });
    }
    segments.push({ text: text.slice(start, end), isMatch: true });
    lastEnd = end;
  }

  if (lastEnd < text.length) {
    segments.push({ text: text.slice(lastEnd), isMatch: false });
  }

  return segments;
}

