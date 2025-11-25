import { Component, Show } from "solid-js";
import Button from "../ui/Button";
import { FolderOpenIcon, SearchIcon, TrashIcon } from "../ui/icons";

interface ActionButtonsProps {
  basePath: string;
  onSelectFolder: () => void;
  onSearch: () => void;
  onDelete: () => void;
  onClearList: () => void;
  isSearching: boolean;
  selectedCount: number;
  totalCount: number;
  canSearch: boolean;
}

const ActionButtons: Component<ActionButtonsProps> = (props) => {
  return (
    <div class="flex flex-wrap items-center gap-4 my-6">
      {/* Folder Selection */}
      <div class="flex items-center gap-2">
        <Button variant="secondary" onClick={props.onSelectFolder}>
          <FolderOpenIcon size="sm" class="mr-2" />
          Select Folder
        </Button>
        <Show when={props.basePath}>
          <span class="text-sm text-base-content/60 max-w-xs truncate">
            {props.basePath}
          </span>
        </Show>
      </div>

      {/* Search */}
      <Button
        variant="primary"
        onClick={props.onSearch}
        disabled={!props.canSearch}
        loading={props.isSearching}
      >
        <SearchIcon size="sm" class="mr-2" />
        Search
      </Button>

      {/* Spacer */}
      <div class="flex-1" />

      {/* Clear List */}
      <Show when={props.totalCount > 0}>
        <Button variant="ghost" onClick={props.onClearList}>
          Clear List
        </Button>
      </Show>

      {/* Delete */}
      <Button
        variant="error"
        onClick={props.onDelete}
        disabled={props.selectedCount === 0}
      >
        <TrashIcon size="sm" class="mr-2" />
        Delete {props.selectedCount > 0 ? `(${props.selectedCount})` : ""}
      </Button>
    </div>
  );
};

export default ActionButtons;

