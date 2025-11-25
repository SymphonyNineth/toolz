import { Component, Show } from "solid-js";
import Button from "../ui/Button";
import Tooltip from "../ui/Tooltip";
import { FilesIcon, FolderOpenIcon, RefreshIcon } from "../ui/icons";

interface ActionButtonsProps {
  onSelectFiles: () => void;
  onSelectFolders: () => void;
  onRename: () => void;
  renameDisabledReason?: string;
  filesToRenameCount?: number;
  totalFilesCount?: number;
  isScanning?: boolean;
  isRenaming?: boolean;
}

/**
 * Action buttons for the batch renamer.
 * Includes file/folder selection and rename button with tooltip.
 */
const ActionButtons: Component<ActionButtonsProps> = (props) => {
  const isRenameReady = () =>
    !props.renameDisabledReason && (props.filesToRenameCount ?? 0) > 0;
  
  const isOperationInProgress = () => props.isScanning || props.isRenaming;

  return (
    <div class="mt-8 space-y-4">
      {/* Summary bar when files are selected */}
      <Show when={(props.totalFilesCount ?? 0) > 0}>
        <div class="flex justify-center">
          <div class="inline-flex items-center gap-3 px-4 py-2 bg-base-100 rounded-full text-sm shadow-sm border border-base-300">
            <span class="text-base-content/70">
              <span class="font-semibold text-base-content">
                {props.totalFilesCount}
              </span>{" "}
              files selected
            </span>
            <Show when={(props.filesToRenameCount ?? 0) > 0}>
              <span class="w-px h-4 bg-base-300" />
              <span class="text-success font-medium">
                {props.filesToRenameCount} will be renamed
              </span>
            </Show>
          </div>
        </div>
      </Show>

      {/* Action buttons */}
      <div class="flex justify-center gap-3">
        <Button
          onClick={props.onSelectFiles}
          variant="secondary"
          class="gap-2"
          disabled={isOperationInProgress()}
        >
          <FilesIcon size="sm" />
          Select Files
        </Button>
        <Button
          onClick={props.onSelectFolders}
          variant="secondary"
          class="gap-2"
          disabled={isOperationInProgress()}
          loading={props.isScanning}
        >
          <FolderOpenIcon size="sm" />
          {props.isScanning ? "Scanning..." : "Select Folders"}
        </Button>
        <Tooltip
          content={props.renameDisabledReason || ""}
          show={!!props.renameDisabledReason && !isOperationInProgress()}
        >
          <Button
            onClick={props.onRename}
            disabled={!!props.renameDisabledReason || isOperationInProgress()}
            loading={props.isRenaming}
            variant={isRenameReady() ? "success" : "primary"}
            class="gap-2"
          >
            <RefreshIcon size="sm" />
            {props.isRenaming ? "Renaming..." : "Rename Files"}
            <Show when={isRenameReady() && !props.isRenaming}>
              <span class="badge badge-sm badge-neutral ml-1">
                {props.filesToRenameCount}
              </span>
            </Show>
          </Button>
        </Tooltip>
      </div>
    </div>
  );
};

export default ActionButtons;
