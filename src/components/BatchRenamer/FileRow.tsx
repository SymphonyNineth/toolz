import { Component, Show } from "solid-js";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import StatusIcon from "./StatusIcon";
import Checkbox from "../ui/Checkbox";
import { FolderIcon, WarningIcon } from "../ui/icons";
import { DiffSegment, FileRowData, RegexSegment } from "./types";
import OriginalNameWithDiff from "../FileRow/OriginalNameWithDiff";
import OriginalNameWithRegex from "../FileRow/OriginalNameWithRegex";
import NewNameWithDiff from "../FileRow/NewNameWithDiff";
import NumberedFileName from "../FileRow/NumberedFileName";

interface FileRowProps {
  file: FileRowData;
  isSelected: boolean;
  onToggleSelection: () => void;
}

/**
 * A single row in the file list table.
 * Displays file status, original name, and new name with diff highlighting.
 */
const FileRow: Component<FileRowProps> = (props) => {
  const handleShowInFolder = async () => {
    try {
      await revealItemInDir(props.file.path);
    } catch (error) {
      console.error("Failed to open folder:", error);
      alert(`Failed to open folder: ${error}`);
    }
  };

  return (
    <tr class="hover">
      <td>
        <Checkbox
          checked={props.isSelected}
          onChange={props.onToggleSelection}
          size="sm"
        />
      </td>
      <td>
        <StatusIcon status={props.file.status} />
      </td>
      <td>
        <div class="tooltip tooltip-right" data-tip="Show in folder">
          <button
            onClick={handleShowInFolder}
            class="btn btn-ghost btn-xs p-1 h-6 w-6 min-h-0"
          >
            <FolderIcon size="sm" />
          </button>
        </div>
      </td>
      <td class="truncate max-w-lg" title={props.file.path}>
        <div class="flex flex-col gap-1">
          <Show
            when={props.file.originalSegments && props.file.originalSegments.length > 0}
            fallback={<span class="font-mono text-sm">{props.file.name}</span>}
          >
            <Show
              when={props.file.previewType === "regexGroups"}
              fallback={<OriginalNameWithDiff segments={props.file.originalSegments as DiffSegment[]} />}
            >
              <OriginalNameWithRegex segments={props.file.originalSegments as RegexSegment[]} />
            </Show>
          </Show>
        </div>
      </td>
      <td class="truncate max-w-lg flex items-center gap-2">
        <span
          classList={{
            "text-error font-bold": props.file.hasCollision,
          }}
        >
          {props.file.numberingInfo?.enabled ? (
            <NumberedFileName
              originalName={props.file.name}
              nameAfterReplace={props.file.nameAfterReplace || props.file.name}
              newName={props.file.newName}
              numberingInfo={props.file.numberingInfo}
            />
          ) : (
            <Show
              when={props.file.modifiedSegments && props.file.modifiedSegments.length > 0}
              fallback={<span class="font-mono text-sm">{props.file.newName || props.file.name}</span>}
            >
              <NewNameWithDiff segments={props.file.modifiedSegments ?? []} />
            </Show>
          )}
        </span>
        {props.file.hasCollision && (
          <div class="tooltip tooltip-left" data-tip="Name collision detected">
            <WarningIcon size="md" class="text-warning" />
          </div>
        )}
      </td>
    </tr>
  );
};

export default FileRow;
