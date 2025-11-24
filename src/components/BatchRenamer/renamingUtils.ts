export interface RenameResult {
  newName: string;
  error?: string;
}

export function calculateNewName(
  originalName: string,
  findText: string,
  replaceText: string,
  caseSensitive: boolean,
  regexMode: boolean
): RenameResult {
  if (!findText) {
    return { newName: originalName };
  }

  try {
    let regex: RegExp;

    if (regexMode) {
      // In regex mode, use the pattern directly
      const flags = caseSensitive ? "g" : "gi";
      regex = new RegExp(findText, flags);
    } else {
      // In normal mode, escape special characters
      const flags = caseSensitive ? "g" : "gi";
      const escapedFindText = findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      regex = new RegExp(escapedFindText, flags);
    }

    const newName = originalName.replace(regex, replaceText);
    return { newName };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return { newName: originalName, error: errorMessage };
  }
}

export interface RegexMatch {
  start: number;
  end: number;
  groupIndex: number; // 0 for full match, 1+ for capture groups, -1 for literal replacement text
  content: string;
}

export function getRegexMatches(text: string, regex: RegExp): RegexMatch[] {
  const matches: RegexMatch[] = [];

  try {
    // Ensure the regex has the 'd' flag for indices if supported
    // We create a new RegExp to avoid side effects on the passed regex object
    // and to ensure we have the 'd' flag.
    const flags = new Set(regex.flags.split(""));
    flags.add("d");
    if (!flags.has("g")) {
      // We generally want global matching to find all occurrences if the original was global
      // But if the user didn't ask for global, maybe we shouldn't?
      // Actually, for visualization, we probably want to visualize what the replacement does.
      // The replacement logic in calculateNewName uses 'g' or 'gi'.
      // So we should probably respect the 'g' flag from the input regex,
      // but calculateNewName constructs it with 'g'.
    }

    const safeRegex = new RegExp(regex.source, Array.from(flags).join(""));

    let match;
    while ((match = safeRegex.exec(text)) !== null) {
      // @ts-ignore - indices property exists when 'd' flag is used
      const indices = match.indices;

      if (indices) {
        for (let i = 0; i < indices.length; i++) {
          if (indices[i]) {
            matches.push({
              start: indices[i][0],
              end: indices[i][1],
              groupIndex: i,
              content: text.substring(indices[i][0], indices[i][1]),
            });
          }
        }
      }

      // Prevent infinite loop on zero-length matches (e.g., /.*/, /a*/, /^/, /$/)
      if (match[0].length === 0) {
        safeRegex.lastIndex++;
      }

      if (!safeRegex.global) break;
    }
  } catch (e) {
    // Fallback or error handling if 'd' flag is not supported or invalid regex
    console.error("Error extracting regex matches:", e);
  }

  return matches;
}

export function getReplacementSegments(
  originalName: string,
  regex: RegExp,
  replaceText: string
): { newName: string; segments: RegexMatch[] } {
  const segments: RegexMatch[] = [];
  let newName = "";
  let lastIndex = 0;

  // Helper to add literal segment (groupIndex = -1)
  const addLiteralSegment = (content: string) => {
    if (content.length > 0) {
      segments.push({
        start: newName.length,
        end: newName.length + content.length,
        groupIndex: -1, // -1 indicates literal replacement text (new/added)
        content,
      });
      newName += content;
    }
  };

  try {
    // Ensure 'd' flag for indices, and 'g' if original had it
    const flags = new Set(regex.flags.split(""));
    flags.add("d");
    const safeRegex = new RegExp(regex.source, Array.from(flags).join(""));

    let match;
    while ((match = safeRegex.exec(originalName)) !== null) {
      // Append non-matched part (unchanged from original, not highlighted)
      newName += originalName.substring(lastIndex, match.index);

      // Process replacement string
      // We need to parse $$, $&, $1, $2, etc.
      // Regex to find tokens: /\$(\$|&|`|'|\d+)/g
      const tokenRegex = /\$(\$|&|`|'|\d+)/g;
      let lastTokenIndex = 0;
      let tokenMatch;

      while ((tokenMatch = tokenRegex.exec(replaceText)) !== null) {
        // Append literal part before token as "new/added" text
        const literalBefore = replaceText.substring(lastTokenIndex, tokenMatch.index);
        addLiteralSegment(literalBefore);

        const token = tokenMatch[1];
        if (token === "$") {
          // Escaped $, treat as literal
          addLiteralSegment("$");
        } else if (token === "&") {
          // Entire match - use groupIndex 0
          const content = match[0];
          segments.push({
            start: newName.length,
            end: newName.length + content.length,
            groupIndex: 0,
            content,
          });
          newName += content;
        } else if (token === "`") {
          // Before match - this is text from original, not "new"
          const content = originalName.substring(0, match.index);
          newName += content;
        } else if (token === "'") {
          // After match - this is text from original, not "new"
          const content = originalName.substring(match.index + match[0].length);
          newName += content;
        } else {
          // Group index
          const groupIndex = parseInt(token, 10);
          // Check if group exists
          if (groupIndex > 0 && groupIndex < match.length) {
            const content = match[groupIndex] || ""; // Group might be undefined (optional group)
            if (content) {
              segments.push({
                start: newName.length,
                end: newName.length + content.length,
                groupIndex: groupIndex,
                content,
              });
              newName += content;
            }
          } else {
            // If group doesn't exist, JS replace usually treats it as literal "$n"
            // e.g. "abc".replace(/(a)/, "$2") -> "$2bc"
            addLiteralSegment("$" + token);
          }
        }

        lastTokenIndex = tokenRegex.lastIndex;
      }

      // Append remaining literal part of replacement string as "new/added" text
      const literalAfter = replaceText.substring(lastTokenIndex);
      addLiteralSegment(literalAfter);

      lastIndex = safeRegex.lastIndex;

      // Prevent infinite loop on zero-length matches (e.g., /.*/, /a*/, /^/, /$/)
      if (match[0].length === 0) {
        safeRegex.lastIndex++;
      }

      if (!safeRegex.global) break;
    }

    // Append remaining part of original string (unchanged, not highlighted)
    newName += originalName.substring(lastIndex);
  } catch (e) {
    console.error("Error calculating replacement segments:", e);
    // Fallback: just return the string without segments
    return { newName: originalName.replace(regex, replaceText), segments: [] };
  }

  return { newName, segments };
}
