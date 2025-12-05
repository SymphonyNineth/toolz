export type DiffSegmentType = 'added' | 'removed' | 'unchanged';

export interface DiffSegment {
    type: DiffSegmentType;
    text: string;
}

/**
 * Maximum combined length of strings for which to compute full diff.
 * Beyond this, we fall back to a simple comparison.
 * This prevents memory exhaustion for very long strings.
 */
const MAX_DIFF_LENGTH = 500;

/**
 * Computes a character-level diff between two strings.
 * 
 * For strings within MAX_DIFF_LENGTH, uses LCS-based diff algorithm.
 * For longer strings, falls back to simple prefix/suffix matching to avoid
 * memory exhaustion.
 * 
 * @param original - The original string
 * @param modified - The modified string
 * @returns Array of diff segments showing what was added, removed, or unchanged
 */
export function computeDiff(original: string, modified: string): DiffSegment[] {
    if (original === modified) {
        return [{ type: 'unchanged', text: original }];
    }

    // For very long strings, use simple diff to avoid memory issues
    if (original.length + modified.length > MAX_DIFF_LENGTH) {
        return computeSimpleDiff(original, modified);
    }

    return computeLCSDiff(original, modified);
}

/**
 * Simple diff that finds common prefix and suffix, treating the middle as changed.
 * Much faster and memory-efficient for long strings.
 */
function computeSimpleDiff(original: string, modified: string): DiffSegment[] {
    const segments: DiffSegment[] = [];

    // Find common prefix
    let prefixLen = 0;
    const minLen = Math.min(original.length, modified.length);
    while (prefixLen < minLen && original[prefixLen] === modified[prefixLen]) {
        prefixLen++;
    }

    // Find common suffix (but don't overlap with prefix)
    let suffixLen = 0;
    while (
        suffixLen < minLen - prefixLen &&
        original[original.length - 1 - suffixLen] === modified[modified.length - 1 - suffixLen]
    ) {
        suffixLen++;
    }

    // Add common prefix
    if (prefixLen > 0) {
        segments.push({ type: 'unchanged', text: original.substring(0, prefixLen) });
    }

    // Add removed part from original
    const removedPart = original.substring(prefixLen, original.length - suffixLen);
    if (removedPart.length > 0) {
        segments.push({ type: 'removed', text: removedPart });
    }

    // Add added part from modified
    const addedPart = modified.substring(prefixLen, modified.length - suffixLen);
    if (addedPart.length > 0) {
        segments.push({ type: 'added', text: addedPart });
    }

    // Add common suffix
    if (suffixLen > 0) {
        segments.push({ type: 'unchanged', text: original.substring(original.length - suffixLen) });
    }

    return segments;
}

/**
 * Full LCS-based diff algorithm.
 * Only used for strings within MAX_DIFF_LENGTH.
 */
function computeLCSDiff(original: string, modified: string): DiffSegment[] {
    const m = original.length;
    const n = modified.length;

    // Build LCS table using dynamic programming
    // Use typed array for better memory efficiency
    const lcs: number[][] = new Array(m + 1);
    for (let i = 0; i <= m; i++) {
        lcs[i] = new Array(n + 1).fill(0);
    }

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (original[i - 1] === modified[j - 1]) {
                lcs[i][j] = lcs[i - 1][j - 1] + 1;
            } else {
                lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
            }
        }
    }

    // Backtrack to build diff segments
    let i = m;
    let j = n;
    const reversedSegments: DiffSegment[] = [];

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && original[i - 1] === modified[j - 1]) {
            // Characters match - unchanged
            let unchangedText = original[i - 1];
            i--;
            j--;

            // Collect consecutive unchanged characters
            while (i > 0 && j > 0 && original[i - 1] === modified[j - 1]) {
                unchangedText = original[i - 1] + unchangedText;
                i--;
                j--;
            }

            reversedSegments.push({ type: 'unchanged', text: unchangedText });
        } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
            // Character was added
            let addedText = modified[j - 1];
            j--;

            // Collect consecutive added characters
            while (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j]) && 
                   (i === 0 || j === 0 || original[i - 1] !== modified[j - 1])) {
                addedText = modified[j - 1] + addedText;
                j--;
            }

            reversedSegments.push({ type: 'added', text: addedText });
        } else if (i > 0) {
            // Character was removed
            let removedText = original[i - 1];
            i--;

            // Collect consecutive removed characters
            while (i > 0 && (j === 0 || lcs[i - 1][j] >= lcs[i][j - 1]) && 
                   (i === 0 || j === 0 || original[i - 1] !== modified[j - 1])) {
                removedText = original[i - 1] + removedText;
                i--;
            }

            reversedSegments.push({ type: 'removed', text: removedText });
        }
    }

    // Reverse to get correct order
    return reversedSegments.reverse();
}
