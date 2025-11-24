import { Component, For } from "solid-js";
import { RegexMatch } from "./renamingUtils";

interface RegexHighlightTextProps {
  text: string;
  matches: RegexMatch[];
  mode: "original" | "modified";
}

// Colors for capture groups (1, 2, 3...) - excludes red and green which are reserved
// for removed/added text highlighting
const GROUP_COLORS = [
  "bg-blue-500/20 text-blue-600 dark:text-blue-400",      // Group 1
  "bg-purple-500/20 text-purple-600 dark:text-purple-400", // Group 2
  "bg-orange-500/20 text-orange-600 dark:text-orange-400", // Group 3
  "bg-pink-500/20 text-pink-600 dark:text-pink-400",       // Group 4
  "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400",       // Group 5
  "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400", // Group 6
  "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400", // Group 7
  "bg-teal-500/20 text-teal-600 dark:text-teal-400",       // Group 8
];

// Special highlight classes
const REMOVED_CLASS = "bg-error/20 text-error line-through decoration-2"; // Red - for removed text (group 0 in original mode)
const ADDED_CLASS = "bg-success/20 text-success font-semibold"; // Green - for added text (literal replacement in modified mode)

const RegexHighlightText: Component<RegexHighlightTextProps> = (props) => {
  const segments = () => {
    const text = props.text;
    const matches = props.matches;
    // Use -2 as "no style" marker, since -1 is now used for literal replacement text
    const charStyles = new Array(text.length).fill(-2);

    // Apply styles. Later matches (higher group indices usually) overwrite earlier ones.
    // Since matches are flattened, we need to be careful.
    // getRegexMatches returns matches sorted by their occurrence in the string, 
    // and for each occurrence, it includes all groups.
    // But the order in the array is: Match1-Group0, Match1-Group1, Match1-Group2, Match2-Group0...
    // Or it might be mixed if I implemented it to push all groups for a match.
    // My implementation:
    // for (let i = 0; i < indices.length; i++) { matches.push(...) }
    // So for a single match, Group 0 comes first, then Group 1, etc.
    // So iterating the array in order means higher group indices overwrite lower ones.
    // This is exactly what we want for nesting (innermost is usually higher index).

    for (const match of matches) {
      for (let i = match.start; i < match.end; i++) {
        charStyles[i] = match.groupIndex;
      }
    }

    const result: { text: string; groupIndex: number }[] = [];
    if (text.length === 0) return result;

    let currentStart = 0;
    let currentGroup = charStyles[0];

    for (let i = 1; i < text.length; i++) {
      if (charStyles[i] !== currentGroup) {
        result.push({
          text: text.substring(currentStart, i),
          groupIndex: currentGroup,
        });
        currentStart = i;
        currentGroup = charStyles[i];
      }
    }
    result.push({
      text: text.substring(currentStart),
      groupIndex: currentGroup,
    });

    return result;
  };

  const getColorClass = (groupIndex: number): string | null => {
    if (props.mode === "original") {
      // In original mode:
      // - Group 0 (full match) = red (being removed/replaced)
      // - Groups 1+ = their respective colors
      // - No match (-2) = no highlight
      if (groupIndex === -2) return null;
      if (groupIndex === 0) return REMOVED_CLASS;
      // Groups 1+ use GROUP_COLORS array (index 1 -> GROUP_COLORS[0], etc.)
      return GROUP_COLORS[(groupIndex - 1) % GROUP_COLORS.length];
    } else {
      // In modified mode:
      // - Group -1 (literal replacement) = green (new/added)
      // - Groups 0+ = their respective colors (from original groups)
      // - No match (-2) = no highlight
      if (groupIndex === -2) return null;
      if (groupIndex === -1) return ADDED_CLASS;
      if (groupIndex === 0) {
        // $& reference - use a neutral color since it's from full match
        return "bg-base-content/20 text-base-content";
      }
      // Groups 1+ use GROUP_COLORS array (index 1 -> GROUP_COLORS[0], etc.)
      return GROUP_COLORS[(groupIndex - 1) % GROUP_COLORS.length];
    }
  };

  const getTitle = (groupIndex: number): string | undefined => {
    if (groupIndex === -2) return undefined;
    if (groupIndex === -1) return "New text";
    if (groupIndex === 0) {
      return props.mode === "original" ? "Matched text (will be replaced)" : "Full match ($&)";
    }
    return `Group ${groupIndex}`;
  };

  return (
    <span class="font-mono text-sm break-all">
      <For each={segments()}>
        {(segment) => {
          const colorClass = getColorClass(segment.groupIndex);
          if (!colorClass) {
            return <span>{segment.text}</span>;
          }
          return (
            <span
              class={`rounded-sm px-0.5 mx-px ${colorClass}`}
              title={getTitle(segment.groupIndex)}
            >
              {segment.text}
            </span>
          );
        }}
      </For>
    </span>
  );
};

export default RegexHighlightText;
