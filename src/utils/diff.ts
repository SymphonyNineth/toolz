export type DiffSegmentType = 'added' | 'removed' | 'unchanged';

export interface DiffSegment {
    type: DiffSegmentType;
    text: string;
}

/**
 * Computes a character-level diff between two strings using a simplified
 * Myers diff algorithm approach.
 * 
 * @param original - The original string
 * @param modified - The modified string
 * @returns Array of diff segments showing what was added, removed, or unchanged
 */
export function computeDiff(original: string, modified: string): DiffSegment[] {
    if (original === modified) {
        return [{ type: 'unchanged', text: original }];
    }

    const m = original.length;
    const n = modified.length;

    // Build LCS table using dynamic programming
    const lcs: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

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
