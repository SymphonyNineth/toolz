import { Component } from "solid-js";
import Button from "../ui/Button";
import Tooltip from "../ui/Tooltip";

interface ActionButtonsProps {
  onSelectFiles: () => void;
  onSelectFolders: () => void;
  onRename: () => void;
  renameDisabledReason?: string;
}

/**
 * Action buttons for the batch renamer.
 * Includes file/folder selection and rename button with tooltip.
 */
const ActionButtons: Component<ActionButtonsProps> = (props) => {
  return (
    <div class="flex justify-center gap-4 mt-8">
      <Button onClick={props.onSelectFiles} variant="secondary">
        Select Files
      </Button>
      <Button onClick={props.onSelectFolders} variant="secondary">
        Select Folders
      </Button>
      <Tooltip
        content={props.renameDisabledReason || ""}
        show={!!props.renameDisabledReason}
      >
        <Button
          onClick={props.onRename}
          disabled={!!props.renameDisabledReason}
          variant="primary"
        >
          Rename Files
        </Button>
      </Tooltip>
    </div>
  );
};

export default ActionButtons;

