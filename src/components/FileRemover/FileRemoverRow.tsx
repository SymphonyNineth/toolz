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
 * Renders a single file row with match highlighting.
 * Supports keyboard navigation for accessibility.
 */
const FileRemoverRow: Component<FileRemoverRowProps> = (props) => {
  // Build highlighted name segments
  const highlightedName = () => {
    return buildHighlightedSegments(props.file.name, props.file.matchRanges);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      props.onToggleSelect(props.file.path);
    }
  };

  const handleClick = () => {
    props.onToggleSelect(props.file.path);
  };

  return (
    <div
      role="listitem"
      tabIndex={0}
      aria-selected={props.file.selected}
      aria-label={`${props.file.name}, ${formatFileSize(props.file.size)}, ${props.file.selected ? "selected" : "not selected"}`}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      class={`file-remover-row flex items-center gap-3 px-4 py-2 cursor-pointer
        transition-all duration-150 ease-in-out
        hover:bg-base-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-inset
        ${props.file.selected ? "file-remover-row-selected bg-error/5 border-l-3 border-error" : ""}`}
    >
      <Checkbox
        checked={props.file.selected}
        onChange={() => props.onToggleSelect(props.file.path)}
        aria-hidden="true"
        tabIndex={-1}
      />

      <div class="flex-shrink-0 text-base-content/50" aria-hidden="true">
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
                    ? "match-highlight bg-warning/30 text-warning-content rounded px-0.5"
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

