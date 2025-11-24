import {
  Component,
  For,
  createSignal,
  createMemo,
  createEffect,
} from "solid-js";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import DiffText from "./DiffText";
import RegexHighlightText from "./RegexHighlightText";
import Button from "../ui/Button";
import { RegexMatch } from "./renamingUtils";

export interface FileItem {
  path: string;
  name: string;
  newName: string;
  status: "idle" | "success" | "error";
  hasCollision?: boolean;
  regexMatches?: RegexMatch[];
  newNameRegexMatches?: RegexMatch[];
}

interface FileListProps {
  files: FileItem[];
  onRemoveFiles?: (pathsToRemove: string[]) => void;
}

const StatusIcon = (props: { status: FileItem["status"] }) => {
  return (
    <div class="w-6 h-6 flex items-center justify-center">
      {props.status === "success" && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5 text-success"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clip-rule="evenodd"
          />
        </svg>
      )}
      {props.status === "error" && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5 text-error"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clip-rule="evenodd"
          />
        </svg>
      )}
    </div>
  );
};

const FileList: Component<FileListProps> = (props) => {
  const [selectedPaths, setSelectedPaths] = createSignal<Set<string>>(
    new Set()
  );

  const handleShowInFolder = async (filePath: string) => {
    try {
      await revealItemInDir(filePath);
    } catch (error) {
      console.error("Failed to open folder:", error);
      alert(`Failed to open folder: ${error}`);
    }
  };

  const toggleSelection = (path: string) => {
    const current = new Set<string>(selectedPaths());
    if (current.has(path)) {
      current.delete(path);
    } else {
      current.add(path);
    }
    setSelectedPaths(current);
  };

  const toggleSelectAll = () => {
    const current = selectedPaths();
    if (current.size === props.files.length) {
      setSelectedPaths(new Set<string>());
    } else {
      setSelectedPaths(new Set<string>(props.files.map((f) => f.path)));
    }
  };

  const allSelected = createMemo(
    () => props.files.length > 0 && selectedPaths().size === props.files.length
  );

  const someSelected = createMemo(
    () => selectedPaths().size > 0 && selectedPaths().size < props.files.length
  );

  const handleClearAll = () => {
    if (props.files.length === 0) return;
    props.onRemoveFiles?.(props.files.map((f) => f.path));
    setSelectedPaths(new Set<string>());
  };

  const handleClearRenamed = () => {
    const renamedFiles = props.files.filter((f) => f.status === "success");
    if (renamedFiles.length === 0) return;
    props.onRemoveFiles?.(renamedFiles.map((f) => f.path));
    setSelectedPaths(new Set<string>());
  };

  const handleRemoveSelected = () => {
    const selected = selectedPaths();
    if (selected.size === 0) return;
    props.onRemoveFiles?.(Array.from(selected));
    setSelectedPaths(new Set<string>());
  };

  const renamedCount = createMemo(
    () => props.files.filter((f) => f.status === "success").length
  );

  const [selectAllCheckbox, setSelectAllCheckbox] =
    createSignal<HTMLInputElement>();

  createEffect(() => {
    const el = selectAllCheckbox();
    if (el) {
      el.indeterminate = someSelected();
    }
  });

  return (
    <div class="w-full max-w-6xl mx-auto mt-6 bg-base-100 rounded-box shadow flex flex-col max-h-[60vh]">
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
                  <td colspan="5" class="text-center py-8 text-base-content/60">
                    No files selected
                  </td>
                </tr>
              }
            >
              {(file) => (
                <tr class="hover">
                  <td>
                    <input
                      type="checkbox"
                      class="checkbox checkbox-sm"
                      checked={selectedPaths().has(file.path)}
                      onChange={() => toggleSelection(file.path)}
                    />
                  </td>
                  <td>
                    <StatusIcon status={file.status} />
                  </td>
                  <td>
                    <div
                      class="tooltip tooltip-right"
                      data-tip="Show in folder"
                    >
                      <button
                        onClick={() => handleShowInFolder(file.path)}
                        class="btn btn-ghost btn-xs p-1 h-6 w-6 min-h-0"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                  <td class="truncate max-w-lg" title={file.path}>
                    <div class="flex flex-col gap-1">
                      {file.regexMatches && file.regexMatches.length > 0 ? (
                        <RegexHighlightText
                          text={file.name}
                          matches={file.regexMatches}
                          mode="original"
                        />
                      ) : (
                        <DiffText
                          original={file.name}
                          modified={file.newName}
                          mode="original"
                        />
                      )}
                    </div>
                  </td>
                  <td class="truncate max-w-lg flex items-center gap-2">
                    <span
                      classList={{
                        "text-error font-bold": file.hasCollision,
                      }}
                    >
                      {file.newNameRegexMatches ? (
                        <RegexHighlightText
                          text={file.newName}
                          matches={file.newNameRegexMatches}
                          mode="modified"
                        />
                      ) : (
                        <DiffText
                          original={file.name}
                          modified={file.newName}
                          mode="modified"
                        />
                      )}
                    </span>
                    {file.hasCollision && (
                      <div
                        class="tooltip tooltip-left"
                        data-tip="Name collision detected"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="h-5 w-5 text-warning"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clip-rule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FileList;
