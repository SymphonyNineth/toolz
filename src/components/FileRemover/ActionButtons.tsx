import { Component } from "solid-js";
import Button from "../ui/Button";
import { TrashIcon } from "../ui/icons";

interface ActionButtonsProps {
  onDelete: () => void;
  onClearList: () => void;
  selectedCount: number;
  totalCount: number;
}

const ActionButtons: Component<ActionButtonsProps> = (props) => {
  return (
    <div class="flex justify-center my-6">
      <div class="inline-flex items-center gap-3 px-4 py-2 bg-base-100 rounded-full text-sm shadow-sm border border-base-300">
        <span class="text-base-content/70">
          <span class="font-semibold text-base-content">
            {props.totalCount}
          </span>{" "}
          files found
        </span>
        <span class="w-px h-4 bg-base-300" />
        <span class="text-warning font-medium">
          {props.selectedCount} selected for deletion
        </span>
        <span class="w-px h-4 bg-base-300" />
        <Button
          variant="ghost"
          size="sm"
          onClick={props.onClearList}
          disabled={props.totalCount === 0}
        >
          Clear List
        </Button>
        <Button
          variant="error"
          size="sm"
          onClick={props.onDelete}
          disabled={props.selectedCount === 0}
          class="gap-2"
        >
          <TrashIcon size="sm" />
          Delete {props.selectedCount > 0 ? `(${props.selectedCount})` : ""}
        </Button>
      </div>
    </div>
  );
};

export default ActionButtons;
