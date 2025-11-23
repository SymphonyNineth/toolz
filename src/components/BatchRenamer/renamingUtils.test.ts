
import { describe, it, expect } from 'vitest';
import { calculateNewName } from './renamingUtils';

describe('calculateNewName', () => {
  describe('Normal Mode', () => {
    it('should return original name if find text is empty', () => {
      const result = calculateNewName('file.txt', '', 'new', false, false);
      expect(result.newName).toBe('file.txt');
      expect(result.error).toBeUndefined();
    });

    it('should replace text case-insensitively by default', () => {
      const result = calculateNewName('File.txt', 'file', 'document', false, false);
      expect(result.newName).toBe('document.txt');
    });

    it('should replace text case-sensitively when enabled', () => {
      const result1 = calculateNewName('File.txt', 'file', 'document', true, false);
      expect(result1.newName).toBe('File.txt'); // No match

      const result2 = calculateNewName('File.txt', 'File', 'Document', true, false);
      expect(result2.newName).toBe('Document.txt');
    });

    it('should replace all occurrences', () => {
      const result = calculateNewName('test-test.txt', 'test', 'sample', false, false);
      expect(result.newName).toBe('sample-sample.txt');
    });

    it('should handle special characters as literals', () => {
      const result = calculateNewName('file(1).txt', '(1)', '[2]', false, false);
      expect(result.newName).toBe('file[2].txt');
    });

    it('should handle regex special characters as literals in normal mode', () => {
      const result = calculateNewName('file.txt', '.', '-', false, false);
      expect(result.newName).toBe('file-txt'); // Replaces dots, not any char
    });
    
    it('should handle empty replace text (deletion)', () => {
        const result = calculateNewName('file_v1.txt', '_v1', '', false, false);
        expect(result.newName).toBe('file.txt');
    });
  });

  describe('Regex Mode', () => {
    it('should use regex for replacement', () => {
      const result = calculateNewName('file123.txt', '\\d+', 'NUM', false, true);
      expect(result.newName).toBe('fileNUM.txt');
    });

    it('should handle capture groups', () => {
      const result = calculateNewName('file-123.txt', 'file-(\\d+)', 'doc-$1', false, true);
      expect(result.newName).toBe('doc-123.txt');
    });

    it('should return error for invalid regex', () => {
      const result = calculateNewName('file.txt', '(', 'replacement', false, true);
      expect(result.newName).toBe('file.txt');
      expect(result.error).toBeDefined();
    });

    it('should respect case sensitivity in regex mode', () => {
      const result1 = calculateNewName('File.txt', 'file', 'doc', true, true);
      expect(result1.newName).toBe('File.txt'); // No match due to case

      const result2 = calculateNewName('File.txt', 'File', 'Doc', true, true);
      expect(result2.newName).toBe('Doc.txt');
    });
    
    it('should replace all occurrences in regex mode', () => {
        const result = calculateNewName('a1b2c3.txt', '\\d', 'X', false, true);
        expect(result.newName).toBe('aXbXcX.txt');
    });
  });
  
  describe('Repeating Characters', () => {
    it('should replace multiple repeating characters', () => {
      const result = calculateNewName('aaaaa', 'a', 'b', false, false);
      expect(result.newName).toBe('bbbbb');
    });

    it('should handle non-overlapping matches correctly (find length < total length)', () => {
      // "aaaaa" -> find "aa" -> matches indices 0-1 and 2-3. Index 4 is left alone.
      const result = calculateNewName('aaaaa', 'aa', 'b', false, false);
      expect(result.newName).toBe('bba');
    });

    it('should handle matches where find length > 1 and replace length is smaller', () => {
      const result = calculateNewName('aaabbb', 'aa', 'x', false, false);
      expect(result.newName).toBe('xabbb');
    });

    it('should handle matches where find length > 1 and replace length is larger', () => {
      const result = calculateNewName('aaabbb', 'aa', 'xxx', false, false);
      expect(result.newName).toBe('xxxabbb');
    });

    it('should handle alternating repeating patterns', () => {
      const result = calculateNewName('ababab', 'ab', 'xy', false, false);
      expect(result.newName).toBe('xyxyxy');
    });
    
    it('should handle repeating characters with partial match at the end', () => {
        // "aaaa" -> find "aaa" -> matches first 3. Last "a" remains.
        const result = calculateNewName('aaaa', 'aaa', 'b', false, false);
        expect(result.newName).toBe('ba');
    });
  });

  describe('Edge Cases', () => {
      it('should handle no matches gracefully', () => {
          const result = calculateNewName('file.txt', 'notfound', 'replace', false, false);
          expect(result.newName).toBe('file.txt');
      });

      it('should handle replacement resulting in empty string', () => {
          const result = calculateNewName('delete_me', 'delete_me', '', false, false);
          expect(result.newName).toBe('');
      });
      
      it('should handle special replacement patterns in normal mode (no capture group replacement)', () => {
          // In normal mode, $1 should be treated literally if possible, but JS replace might interpret it.
          // Wait, string.replace(string, string) treats $ as special in replacement string?
          // MDN says: "The replacement string can include the following special replacement patterns:"
          // $$ Inserts a "$".
          // $& Inserts the matched substring.
          // $` Inserts the portion of the string that precedes the matched substring.
          // $' Inserts the portion of the string that follows the matched substring.
          // $n or $nn Where n or nn are decimal digits, inserts the nth parenthesized submatch string...
          
          // Let's verify behavior. If I replace "a" with "$1", and there are no groups (because normal mode escapes everything), it usually inserts "$1" literal or empty if group doesn't exist?
          // Actually, if regex has no capturing groups, $1 is usually treated as literal "$1" in some engines, but in JS:
          // "abc".replace(/a/, "$1") -> "$1bc" (because group 1 doesn't exist)
          
          const result = calculateNewName('abc', 'a', '$1', false, false);
          expect(result.newName).toBe('$1bc');
      });
  });
});
