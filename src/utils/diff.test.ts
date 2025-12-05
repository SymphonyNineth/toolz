import { describe, it, expect } from 'vitest';
import { computeDiff, DiffSegment } from './diff';

describe('computeDiff', () => {
  describe('Basic Cases', () => {
    it('should return unchanged for identical strings', () => {
      const result = computeDiff('hello', 'hello');
      expect(result).toEqual([{ type: 'unchanged', text: 'hello' }]);
    });

    it('should handle empty original string (pure addition)', () => {
      const result = computeDiff('', 'hello');
      expect(result).toEqual([{ type: 'added', text: 'hello' }]);
    });

    it('should handle empty modified string (pure deletion)', () => {
      const result = computeDiff('hello', '');
      expect(result).toEqual([{ type: 'removed', text: 'hello' }]);
    });

    it('should handle both empty strings', () => {
      const result = computeDiff('', '');
      expect(result).toEqual([{ type: 'unchanged', text: '' }]);
    });
  });

  describe('Simple Replacements', () => {
    it('should detect replacement at the beginning', () => {
      const result = computeDiff('old_name.txt', 'new_name.txt');
      
      // Should contain: removed 'old', added 'new', unchanged '_name.txt'
      const removedSegment = result.find(s => s.type === 'removed');
      const addedSegment = result.find(s => s.type === 'added');
      const unchangedSegment = result.find(s => s.type === 'unchanged');
      
      expect(removedSegment?.text).toBe('old');
      expect(addedSegment?.text).toBe('new');
      expect(unchangedSegment?.text).toContain('_name.txt');
    });

    it('should detect replacement in the middle', () => {
      const result = computeDiff('file_v1.txt', 'file_v2.txt');
      
      const removedSegment = result.find(s => s.type === 'removed');
      const addedSegment = result.find(s => s.type === 'added');
      
      expect(removedSegment?.text).toBe('1');
      expect(addedSegment?.text).toBe('2');
    });

    it('should detect replacement at the end', () => {
      const result = computeDiff('file.txt', 'file.md');
      
      const removedSegment = result.find(s => s.type === 'removed');
      const addedSegment = result.find(s => s.type === 'added');
      
      expect(removedSegment?.text).toBe('txt');
      expect(addedSegment?.text).toBe('md');
    });
  });

  describe('Single Character Changes', () => {
    it('should detect single character addition', () => {
      const result = computeDiff('ab', 'abc');
      
      const addedSegment = result.find(s => s.type === 'added');
      expect(addedSegment?.text).toBe('c');
    });

    it('should detect single character removal', () => {
      const result = computeDiff('abc', 'ab');
      
      const removedSegment = result.find(s => s.type === 'removed');
      expect(removedSegment?.text).toBe('c');
    });

    it('should detect single character replacement', () => {
      const result = computeDiff('abc', 'aXc');
      
      const removedSegment = result.find(s => s.type === 'removed');
      const addedSegment = result.find(s => s.type === 'added');
      
      expect(removedSegment?.text).toBe('b');
      expect(addedSegment?.text).toBe('X');
    });
  });

  describe('Complex Diffs', () => {
    it('should handle multiple changes throughout the string', () => {
      const result = computeDiff('abc123xyz', 'ABC456XYZ');
      
      // Should have multiple removed and added segments
      const removedSegments = result.filter(s => s.type === 'removed');
      const addedSegments = result.filter(s => s.type === 'added');
      
      expect(removedSegments.length).toBeGreaterThan(0);
      expect(addedSegments.length).toBeGreaterThan(0);
    });

    it('should handle complete string replacement', () => {
      const result = computeDiff('old', 'new');
      
      const removedSegment = result.find(s => s.type === 'removed');
      const addedSegment = result.find(s => s.type === 'added');
      
      expect(removedSegment?.text).toBe('old');
      expect(addedSegment?.text).toBe('new');
    });

    it('should handle insertion in the middle', () => {
      const result = computeDiff('ac', 'abc');
      
      const addedSegment = result.find(s => s.type === 'added');
      expect(addedSegment?.text).toBe('b');
      
      // Unchanged segments should cover 'a' and 'c'
      const unchangedText = result
        .filter(s => s.type === 'unchanged')
        .map(s => s.text)
        .join('');
      expect(unchangedText).toBe('ac');
    });
  });

  describe('Special Characters', () => {
    it('should handle special characters correctly', () => {
      const result = computeDiff('file(1).txt', 'file[2].txt');
      
      const removedSegment = result.find(s => s.type === 'removed');
      const addedSegment = result.find(s => s.type === 'added');
      
      expect(removedSegment?.text).toContain('(1)');
      expect(addedSegment?.text).toContain('[2]');
    });

    it('should handle unicode characters (BMP)', () => {
      // Using BMP characters (single code unit in UTF-16), not emoji (surrogate pairs)
      const result = computeDiff('hello世界', 'hello地球');
      
      const removedSegment = result.find(s => s.type === 'removed');
      const addedSegment = result.find(s => s.type === 'added');
      
      expect(removedSegment?.text).toBe('世界');
      expect(addedSegment?.text).toBe('地球');
    });

    it('should handle whitespace changes', () => {
      const result = computeDiff('hello world', 'hello  world');
      
      const addedSegment = result.find(s => s.type === 'added');
      expect(addedSegment?.text).toBe(' ');
    });
  });

  describe('Output Integrity', () => {
    it('should produce segments that reconstruct original and modified strings', () => {
      const original = 'file_v1.txt';
      const modified = 'document_v2.txt';
      const result = computeDiff(original, modified);
      
      // Reconstruct original: unchanged + removed
      const reconstructedOriginal = result
        .filter(s => s.type === 'unchanged' || s.type === 'removed')
        .map(s => s.text)
        .join('');
      
      // Reconstruct modified: unchanged + added
      const reconstructedModified = result
        .filter(s => s.type === 'unchanged' || s.type === 'added')
        .map(s => s.text)
        .join('');
      
      expect(reconstructedOriginal).toBe(original);
      expect(reconstructedModified).toBe(modified);
    });

    it('should not produce empty segments', () => {
      const result = computeDiff('old_name.txt', 'new_name.txt');
      
      for (const segment of result) {
        // Empty string is only valid for identical empty strings
        if (segment.text === '') {
          expect(result).toHaveLength(1);
          expect(segment.type).toBe('unchanged');
        }
      }
    });
  });

  describe('Long String Handling', () => {
    it('should handle very long strings without stack overflow', () => {
      // Create strings longer than MAX_DIFF_LENGTH (500)
      const original = 'prefix_' + 'a'.repeat(600) + '_suffix.txt';
      const modified = 'prefix_' + 'b'.repeat(600) + '_suffix.txt';
      
      // This should not throw an error
      const result = computeDiff(original, modified);
      
      // Should still produce valid segments
      expect(result.length).toBeGreaterThan(0);
      
      // Reconstruct and verify
      const reconstructedOriginal = result
        .filter(s => s.type === 'unchanged' || s.type === 'removed')
        .map(s => s.text)
        .join('');
      const reconstructedModified = result
        .filter(s => s.type === 'unchanged' || s.type === 'added')
        .map(s => s.text)
        .join('');
      
      expect(reconstructedOriginal).toBe(original);
      expect(reconstructedModified).toBe(modified);
    });

    it('should use simple diff for very long strings', () => {
      // Create strings longer than MAX_DIFF_LENGTH
      const original = 'start_' + 'x'.repeat(300) + '_end';
      const modified = 'start_' + 'y'.repeat(300) + '_end';
      
      const result = computeDiff(original, modified);
      
      // Simple diff should find common prefix and suffix
      const unchangedSegments = result.filter(s => s.type === 'unchanged');
      expect(unchangedSegments.some(s => s.text.includes('start_'))).toBe(true);
      expect(unchangedSegments.some(s => s.text.includes('_end'))).toBe(true);
    });

    it('should handle extremely long identical strings', () => {
      const longString = 'a'.repeat(10000);
      const result = computeDiff(longString, longString);
      
      expect(result).toEqual([{ type: 'unchanged', text: longString }]);
    });

    it('should handle long string with small change at start', () => {
      const original = 'A' + 'x'.repeat(600);
      const modified = 'B' + 'x'.repeat(600);
      
      const result = computeDiff(original, modified);
      
      // Should detect the change at the start
      const removedSegment = result.find(s => s.type === 'removed');
      const addedSegment = result.find(s => s.type === 'added');
      
      expect(removedSegment?.text).toBe('A');
      expect(addedSegment?.text).toBe('B');
    });

    it('should handle long string with small change at end', () => {
      const original = 'x'.repeat(600) + 'A';
      const modified = 'x'.repeat(600) + 'B';
      
      const result = computeDiff(original, modified);
      
      // Should detect the change at the end
      const removedSegment = result.find(s => s.type === 'removed');
      const addedSegment = result.find(s => s.type === 'added');
      
      expect(removedSegment?.text).toBe('A');
      expect(addedSegment?.text).toBe('B');
    });

    it('should handle long string with change in middle', () => {
      const prefix = 'x'.repeat(200);
      const suffix = 'y'.repeat(200);
      const original = prefix + 'OLD' + suffix;
      const modified = prefix + 'NEW' + suffix;
      
      const result = computeDiff(original, modified);
      
      // Should produce valid output
      const reconstructedOriginal = result
        .filter(s => s.type === 'unchanged' || s.type === 'removed')
        .map(s => s.text)
        .join('');
      const reconstructedModified = result
        .filter(s => s.type === 'unchanged' || s.type === 'added')
        .map(s => s.text)
        .join('');
      
      expect(reconstructedOriginal).toBe(original);
      expect(reconstructedModified).toBe(modified);
    });
  });
});

