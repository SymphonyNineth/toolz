/**
 * Path utility functions for cross-platform path manipulation.
 */

/**
 * Extracts the filename from a file path.
 * Handles both Windows (backslash) and Unix (forward slash) separators.
 *
 * @param path - The full file path
 * @returns The filename portion of the path
 */
export function getFileName(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts.pop() || "";
}

/**
 * Extracts the directory portion from a file path.
 * Preserves the original path separator style.
 *
 * @param path - The full file path
 * @returns The directory portion of the path (without trailing separator)
 */
export function getDirectory(path: string): string {
  const separator = path.includes("\\") ? "\\" : "/";
  return path.substring(0, path.lastIndexOf(separator));
}

/**
 * Gets the path separator used in the given path.
 *
 * @param path - The file path to analyze
 * @returns The separator character ("/" or "\\")
 */
export function getPathSeparator(path: string): string {
  return path.includes("\\") ? "\\" : "/";
}

/**
 * Joins a directory and filename using the appropriate separator.
 *
 * @param directory - The directory path
 * @param filename - The filename to append
 * @returns The combined path
 */
export function joinPath(directory: string, filename: string): string {
  const separator = getPathSeparator(directory);
  return `${directory}${separator}${filename}`;
}

