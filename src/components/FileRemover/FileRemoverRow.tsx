import { Component, Show, For } from "solid-js";
import Checkbox from "../ui/Checkbox";
import { FolderIcon, FilesIcon } from "../ui/icons";
import { FileMatchItem } from "./types";
import { formatFileSize, buildHighlightedSegments } from "./utils";

interface FileRemoverRowProps {
  file: FileMatchItem;
  onToggleSelect: (path: string) => void;
}

/**
 * Renders a single file row with match highlighting
 */
const FileRemoverRow: Component<FileRemoverRowProps> = (props) => {
  // Build highlighted name segments
  const highlightedName = () => {
    return buildHighlightedSegments(props.file.name, props.file.matchRanges);
  };

  return (
    <div
      class={`flex items-center gap-3 px-4 py-2 hover:bg-base-200 transition-colors ${
        props.file.selected ? "bg-error/5" : ""
      }`}
    >
      <Checkbox
        checked={props.file.selected}
        onChange={() => props.onToggleSelect(props.file.path)}
      />

      <div class="flex-shrink-0 text-base-content/50">
        <Show when={props.file.isDirectory} fallback={<FilesIcon size="sm" />}>
          <FolderIcon size="sm" />
        </Show>
      </div>

      <div class="flex-1 min-w-0">
        <div class="font-mono text-sm truncate">
          <For each={highlightedName()}>
            {(segment) => (
              <span
                class={
                  segment.isMatch
                    ? "bg-warning/30 text-warning-content rounded px-0.5"
                    : ""
                }
              >
                {segment.text}
              </span>
            )}
          </For>
        </div>
        <div class="text-xs text-base-content/50 truncate">{props.file.path}</div>
      </div>

      <div class="flex-shrink-0 text-xs text-base-content/50">
        {formatFileSize(props.file.size)}
      </div>
    </div>
  );
};

export default FileRemoverRow;

