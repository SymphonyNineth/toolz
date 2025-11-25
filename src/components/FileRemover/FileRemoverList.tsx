import { Component, For, Show, createMemo } from "solid-js";
import { FileMatchItem } from "./types";
import FileRemoverRow from "./FileRemoverRow";
import { formatFileSize } from "./utils";

interface FileRemoverListProps {
  files: FileMatchItem[];
  onToggleSelect: (path: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onInvertSelection: () => void;
  onRemoveFromList: (paths: string[]) => void;
}

const FileRemoverList: Component<FileRemoverListProps> = (props) => {
  const selectedCount = createMemo(
    () => props.files.filter((f) => f.selected).length
  );
  const selectedSize = createMemo(() =>
    props.files.filter((f) => f.selected).reduce((sum, f) => sum + f.size, 0)
  );

  return (
    <div class="card bg-base-100 shadow-lg">
      <div class="card-body p-0">
        {/* Header */}
        <div class="flex items-center justify-between px-4 py-3 border-b border-base-300">
          <div class="flex items-center gap-4">
            <span class="font-medium">{props.files.length} files found</span>
            <span class="text-sm text-base-content/60">
              {selectedCount()} selected ({formatFileSize(selectedSize())})
            </span>
          </div>

          <div class="flex gap-2">
            <button class="btn btn-xs btn-ghost" onClick={props.onSelectAll}>
              Select All
            </button>
            <button class="btn btn-xs btn-ghost" onClick={props.onDeselectAll}>
              Deselect All
            </button>
            <button
              class="btn btn-xs btn-ghost"
              onClick={props.onInvertSelection}
            >
              Invert
            </button>
            <Show when={selectedCount() > 0}>
              <button
                class="btn btn-xs btn-ghost text-warning"
                onClick={() => {
                  const selectedPaths = props.files
                    .filter((f) => f.selected)
                    .map((f) => f.path);
                  props.onRemoveFromList(selectedPaths);
                }}
              >
                Remove Selected from List
              </button>
            </Show>
          </div>
        </div>

        {/* File List */}
        <Show
          when={props.files.length > 0}
          fallback={
            <div class="flex flex-col items-center justify-center py-16 text-base-content/50">
              <svg
                class="w-16 h-16 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p>No files found matching the pattern</p>
              <p class="text-sm mt-1">
                Select a folder and enter a pattern to search
              </p>
            </div>
          }
        >
          <div class="max-h-[500px] overflow-y-auto divide-y divide-base-200">
            <For each={props.files}>
              {(file) => (
                <FileRemoverRow
                  file={file}
                  onToggleSelect={props.onToggleSelect}
                />
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default FileRemoverList;

