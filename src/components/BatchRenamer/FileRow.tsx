import { Component } from "solid-js";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import DiffText from "./DiffText";
import RegexHighlightText from "./RegexHighlightText";
import StatusIcon from "./StatusIcon";
import { FolderIcon, WarningIcon } from "../ui/icons";
import { RegexMatch } from "./renamingUtils";

export interface FileRowData {
  path: string;
  name: string;
  newName: string;
  status: "idle" | "success" | "error";
  hasCollision?: boolean;
  regexMatches?: RegexMatch[];
  newNameRegexMatches?: RegexMatch[];
}

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
        <input
          type="checkbox"
          class="checkbox checkbox-sm"
          checked={props.isSelected}
          onChange={props.onToggleSelection}
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
          {props.file.regexMatches && props.file.regexMatches.length > 0 ? (
            <RegexHighlightText
              text={props.file.name}
              matches={props.file.regexMatches}
              mode="original"
            />
          ) : (
            <DiffText
              original={props.file.name}
              modified={props.file.newName}
              mode="original"
            />
          )}
        </div>
      </td>
      <td class="truncate max-w-lg flex items-center gap-2">
        <span
          classList={{
            "text-error font-bold": props.file.hasCollision,
          }}
        >
          {props.file.newNameRegexMatches ? (
            <RegexHighlightText
              text={props.file.newName}
              matches={props.file.newNameRegexMatches}
              mode="modified"
            />
          ) : (
            <DiffText
              original={props.file.name}
              modified={props.file.newName}
              mode="modified"
            />
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

