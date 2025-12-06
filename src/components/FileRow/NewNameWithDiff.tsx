import { Component, For } from "solid-js";
import { DiffSegment } from "../BatchRenamer/types";

/** Helper component to render new name with "added" parts highlighted in green */
interface NewNameWithDiffProps {
  segments: DiffSegment[];
}

const NewNameWithDiff: Component<NewNameWithDiffProps> = (props) => {
  return (
    <span class="font-mono text-sm">
      <For each={props.segments}>
        {(segment: DiffSegment) => {
          if (segment.segmentType === "added") {
            return (
              <span class="bg-success/20 text-success font-semibold">
                {segment.text}
              </span>
            );
          } else if (segment.segmentType === "unchanged") {
            return <span>{segment.text}</span>;
          }
          // Don't show 'removed' segments in the new name
          return null;
        }}
      </For>
    </span>
  );
};

export default NewNameWithDiff;
