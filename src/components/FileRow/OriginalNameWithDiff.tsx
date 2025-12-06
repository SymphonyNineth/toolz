import { Component, For } from "solid-js";
import { DiffSegment } from "../BatchRenamer/types";

/** Helper component to render original name with "removed" parts highlighted in red */
interface OriginalNameWithDiffProps {
  segments: DiffSegment[];
}

const OriginalNameWithDiff: Component<OriginalNameWithDiffProps> = (props) => {
  return (
    <span class="font-mono text-sm">
      <For each={props.segments}>
        {(segment: DiffSegment) => {
          if (segment.segmentType === "removed") {
            return (
              <span class="bg-error/20 text-error line-through">
                {segment.text}
              </span>
            );
          } else if (segment.segmentType === "unchanged") {
            return <span>{segment.text}</span>;
          }
          // Don't show 'added' segments in the original name
          return null;
        }}
      </For>
    </span>
  );
};

export default OriginalNameWithDiff;
