import { Component, For, Show } from "solid-js";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { WarningIcon, TrashIcon } from "../ui/icons";
import { FileMatchItem } from "./types";
import { formatFileSize } from "./utils";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  files: FileMatchItem[];
  isDeleting: boolean;
}

const DeleteConfirmModal: Component<DeleteConfirmModalProps> = (props) => {
  const totalSize = () => props.files.reduce((sum, f) => sum + f.size, 0);

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} maxWidth="lg">
      <div class="p-6">
        {/* Warning Header */}
        <div class="flex items-center gap-3 mb-4">
          <div class="p-3 rounded-full bg-error/10">
            <WarningIcon size="lg" class="text-error" />
          </div>
          <div>
            <h3 class="text-lg font-bold text-base-content">Confirm Deletion</h3>
            <p class="text-sm text-base-content/60">
              This action cannot be undone
            </p>
          </div>
        </div>

        {/* Warning Message */}
        <div class="alert alert-warning mb-4">
          <WarningIcon size="sm" />
          <span>
            You are about to permanently delete{" "}
            <strong>{props.files.length}</strong> files (
            {formatFileSize(totalSize())}) from your disk.
          </span>
        </div>

        {/* File Preview */}
        <div class="bg-base-200 rounded-lg p-3 mb-4 max-h-48 overflow-y-auto">
          <p class="text-xs text-base-content/60 mb-2">Files to be deleted:</p>
          <div class="space-y-1">
            <For each={props.files.slice(0, 10)}>
              {(file) => (
                <div class="text-sm font-mono truncate text-base-content/80">
                  {file.path}
                </div>
              )}
            </For>
            <Show when={props.files.length > 10}>
              <div class="text-sm text-base-content/50 italic">
                ... and {props.files.length - 10} more files
              </div>
            </Show>
          </div>
        </div>

        {/* Actions */}
        <div class="flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={props.onClose}
            disabled={props.isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="error"
            onClick={props.onConfirm}
            loading={props.isDeleting}
          >
            <TrashIcon size="sm" class="mr-2" />
            Delete Files
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteConfirmModal;

