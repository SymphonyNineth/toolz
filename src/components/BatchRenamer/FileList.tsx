import { Component, For, createMemo } from "solid-js";
import Button from "../ui/Button";
import FileRow, { FileRowData } from "./FileRow";
import { useFileSelection } from "../../hooks/useFileSelection";

export interface FileItem extends FileRowData { }

interface FileListProps {
  files: FileItem[];
  onRemoveFiles?: (pathsToRemove: string[]) => void;
}

const FileList: Component<FileListProps> = (props) => {
  const {
    selectedPaths,
    toggleSelection,
    toggleSelectAll,
    allSelected,
    clearSelection,
    setSelectAllCheckbox,
  } = useFileSelection(() => props.files);

  const handleClearAll = () => {
    if (props.files.length === 0) return;
    props.onRemoveFiles?.(props.files.map((f) => f.path));
    clearSelection();
  };

  const handleClearRenamed = () => {
    const renamedFiles = props.files.filter((f) => f.status === "success");
    if (renamedFiles.length === 0) return;
    props.onRemoveFiles?.(renamedFiles.map((f) => f.path));
    clearSelection();
  };

  const handleRemoveSelected = () => {
    const selected = selectedPaths();
    if (selected.size === 0) return;
    props.onRemoveFiles?.(Array.from(selected));
    clearSelection();
  };

  const renamedCount = createMemo(
    () => props.files.filter((f) => f.status === "success").length
  );

  return (
    <div class="w-full mt-6 bg-base-100 rounded-box shadow flex flex-col max-h-[60vh]">
      {/* Action Buttons */}
      {props.files.length > 0 && (
        <div class="p-4 border-b border-base-300 flex gap-2 justify-end">
          <Button onClick={handleClearAll} variant="error" size="sm">
            Clear All ({props.files.length})
          </Button>
          <Button
            onClick={handleClearRenamed}
            variant="warning"
            size="sm"
            disabled={renamedCount() === 0}
          >
            Clear Renamed ({renamedCount()})
          </Button>
          <Button
            onClick={handleRemoveSelected}
            variant="secondary"
            size="sm"
            disabled={selectedPaths().size === 0}
          >
            Remove Selected ({selectedPaths().size})
          </Button>
        </div>
      )}

      <div class="overflow-x-auto overflow-y-auto flex-1">
        <table class="table table-zebra w-full table-pin-rows">
          <thead>
            <tr>
              <th class="w-10 bg-base-200">
                <input
                  type="checkbox"
                  class="checkbox checkbox-sm"
                  checked={allSelected()}
                  ref={setSelectAllCheckbox}
                  onChange={toggleSelectAll}
                />
              </th>
              <th class="w-10 bg-base-200"></th>
              <th class="w-10 bg-base-200"></th>
              <th class="bg-base-200">Original Name</th>
              <th class="bg-base-200">New Name</th>
            </tr>
          </thead>
          <tbody>
            <For
              each={props.files}
              fallback={
                <tr>
                  <td colspan="5" class="text-center py-12">
                    <div class="flex flex-col items-center gap-3 text-base-content/50">
                      <svg
                        class="w-12 h-12"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="1.5"
                          d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <p class="text-sm">No files selected</p>
                      <p class="text-xs">Use the buttons above to select files or folders</p>
                    </div>
                  </td>
                </tr>
              }
            >
              {(file) => (
                <FileRow
                  file={file}
                  isSelected={selectedPaths().has(file.path)}
                  onToggleSelection={() => toggleSelection(file.path)}
                />
              )}
            </For>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FileList;
