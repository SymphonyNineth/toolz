export type NumberingPosition = "start" | "end" | "index";

export interface NumberingOptions {
  enabled: boolean;
  startNumber: number;
  increment: number;
  padding: number; // Number of digits (e.g., 3 means 001, 002, 003)
  separator: string;
  position: NumberingPosition;
  insertIndex?: number; // Used when position is "index"
}

export const DEFAULT_NUMBERING_OPTIONS: NumberingOptions = {
  enabled: false,
  startNumber: 1,
  increment: 1,
  padding: 1,
  separator: "-",
  position: "start",
  insertIndex: 0,
};

/**
 * Information about the numbering applied to a filename
 * Used for color-coded preview display
 */
export interface NumberingInfo {
  enabled: boolean;
  formattedNumber: string;
  separator: string;
  position: NumberingPosition;
  /** Character index where the numbering starts in the new name (before extension) */
  insertIndex: number;
}

/**
 * Gets numbering information for a file at a given index
 * Used for highlighting the numbering parts in the preview
 */
export function getNumberingInfo(
  name: string,
  fileIndex: number,
  options: NumberingOptions
): NumberingInfo {
  if (!options.enabled) {
    return {
      enabled: false,
      formattedNumber: "",
      separator: "",
      position: options.position,
      insertIndex: 0,
    };
  }

  const number = options.startNumber + fileIndex * options.increment;
  const formattedNumber = formatNumber(number, options.padding);

  // Calculate insert index based on position
  const lastDotIndex = name.lastIndexOf(".");
  const hasExtension = lastDotIndex > 0;
  const baseName = hasExtension ? name.substring(0, lastDotIndex) : name;

  let insertIndex = 0;
  switch (options.position) {
    case "start":
      insertIndex = 0;
      break;
    case "end":
      insertIndex = baseName.length;
      break;
    case "index":
      insertIndex = Math.max(0, Math.min(options.insertIndex ?? 0, baseName.length));
      break;
  }

  return {
    enabled: true,
    formattedNumber,
    separator: options.separator,
    position: options.position,
    insertIndex,
  };
}

/**
 * Formats a number with leading zeros based on padding
 * @param num - The number to format
 * @param padding - Number of digits (minimum length)
 * @returns Formatted number string (e.g., "001" for num=1, padding=3)
 */
export function formatNumber(num: number, padding: number): string {
  return String(num).padStart(padding, "0");
}

/**
 * Applies numbering to a filename based on options and file index
 * @param name - Original filename
 * @param fileIndex - Index of the file in the list (0-based)
 * @param options - Numbering options
 * @returns Filename with number applied
 */
export function applyNumbering(
  name: string,
  fileIndex: number,
  options: NumberingOptions
): string {
  if (!options.enabled) {
    return name;
  }

  const number = options.startNumber + fileIndex * options.increment;
  const formattedNumber = formatNumber(number, options.padding);

  // Extract filename and extension
  const lastDotIndex = name.lastIndexOf(".");
  const hasExtension = lastDotIndex > 0;
  const baseName = hasExtension ? name.substring(0, lastDotIndex) : name;
  const extension = hasExtension ? name.substring(lastDotIndex) : "";

  let newBaseName: string;

  switch (options.position) {
    case "start":
      newBaseName = `${formattedNumber}${options.separator}${baseName}`;
      break;
    case "end":
      newBaseName = `${baseName}${options.separator}${formattedNumber}`;
      break;
    case "index": {
      const insertAt = Math.max(
        0,
        Math.min(options.insertIndex ?? 0, baseName.length)
      );
      const numberWithSeparator =
        insertAt === 0
          ? `${formattedNumber}${options.separator}`
          : insertAt === baseName.length
            ? `${options.separator}${formattedNumber}`
            : `${options.separator}${formattedNumber}${options.separator}`;
      newBaseName =
        baseName.substring(0, insertAt) +
        numberWithSeparator +
        baseName.substring(insertAt);
      break;
    }
    default:
      newBaseName = baseName;
  }

  return newBaseName + extension;
}
