import { Component, For } from "solid-js";
import { RegexMatch } from "./renamingUtils";

interface RegexHighlightTextProps {
  text: string;
  matches: RegexMatch[];
}

const GROUP_COLORS = [
  "bg-base-content/20 text-base-content", // Group 0 (Full match)
  "bg-blue-500/20 text-blue-600 dark:text-blue-400",
  "bg-green-500/20 text-green-600 dark:text-green-400",
  "bg-purple-500/20 text-purple-600 dark:text-purple-400",
  "bg-orange-500/20 text-orange-600 dark:text-orange-400",
  "bg-pink-500/20 text-pink-600 dark:text-pink-400",
  "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400",
  "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
  "bg-red-500/20 text-red-600 dark:text-red-400",
];

const RegexHighlightText: Component<RegexHighlightTextProps> = (props) => {
  const segments = () => {
    const text = props.text;
    const matches = props.matches;
    const charStyles = new Array(text.length).fill(-1);

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

  return (
    <span class="font-mono text-sm break-all">
      <For each={segments()}>
        {(segment) => {
          if (segment.groupIndex === -1) {
            return <span>{segment.text}</span>;
          }
          const colorClass = GROUP_COLORS[segment.groupIndex % GROUP_COLORS.length];
          return (
            <span
              class={`rounded-sm px-0.5 mx-px ${colorClass}`}
              title={`Group ${segment.groupIndex}`}
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
