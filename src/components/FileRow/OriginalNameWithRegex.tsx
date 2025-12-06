import { Component, For } from "solid-js";
import { isRegexSegmentGroup, RegexSegment } from "../BatchRenamer/types";

const GROUP_COLORS = [
  "bg-primary/20 text-primary",
  "bg-secondary/20 text-secondary",
  "bg-accent/20 text-accent",
  "bg-info/20 text-info",
  "bg-warning/20 text-warning",
  "bg-success/20 text-success",
  "bg-error/20 text-error",
];

interface OriginalNameWithRegexProps {
  segments: RegexSegment[];
}

/**
 * Renders original filename with backend-provided regex segments.
 * Capture groups are color-coded; non-matching text stays neutral.
 */
const OriginalNameWithRegex: Component<OriginalNameWithRegexProps> = (props) => {
  const getClass = (segment: RegexSegment) => {
    if (segment.type === "text") return "";
    if (segment.id === 0) return "bg-base-content/10 text-base-content";
    const paletteIndex = (segment.id - 1) % GROUP_COLORS.length;
    return GROUP_COLORS[paletteIndex];
  };

  return (
    <span class="font-mono text-sm">
      <For each={props.segments}>
        {(segment) => {
          const colorClass = getClass(segment);
          if (!colorClass && isRegexSegmentGroup(segment)) {
            return <span>{segment.value}</span>;
          }
          return (
            <span class={`rounded-sm px-0.5 mx-px ${colorClass}`} title={segment.type === "group" ? `Group ${segment.id}` : undefined}>
              {segment.type === "group" ? segment.text : segment.value}
            </span>
          );
        }}
      </For>
    </span>
  );
};

export default OriginalNameWithRegex;

