import { Component, For, Show } from "solid-js";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { WarningIcon, TrashIcon } from "../ui/icons";
import { FileMatchItem, DeleteProgress } from "./types";
import { formatFileSize } from "./utils";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  files: FileMatchItem[];
  isDeleting: boolean;
  dangerWarning?: string;
  progress: DeleteProgress | null;
}

const DeleteConfirmModal: Component<DeleteConfirmModalProps> = (props) => {
  const totalSize = () => props.files.reduce((sum, f) => sum + f.size, 0);
  const progressPercent = () => {
    if (!props.progress) return 0;
    return Math.round((props.progress.current / props.progress.total) * 100);
  };

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

        {/* Danger Warning for risky operations */}
        <Show when={props.dangerWarning}>
          <div class="alert alert-error mb-4">
            <WarningIcon size="sm" />
            <span>{props.dangerWarning}</span>
          </div>
        </Show>

        {/* Standard Warning Message */}
        <div class="alert alert-warning mb-4">
          <WarningIcon size="sm" />
          <span>
            You are about to permanently delete{" "}
            <strong>{props.files.length}</strong> files (
            {formatFileSize(totalSize())}) from your disk.
          </span>
        </div>

        {/* Progress indicator for large deletions */}
        <Show when={props.progress}>
          <div class="mb-4">
            <div class="flex justify-between text-sm text-base-content/60 mb-1">
              <span>Deleting files...</span>
              <span>
                {props.progress?.current} / {props.progress?.total} ({progressPercent()}%)
              </span>
            </div>
            <progress
              class="progress progress-error w-full"
              value={props.progress?.current}
              max={props.progress?.total}
            />
          </div>
        </Show>

        {/* File Preview */}
        <Show when={!props.progress}>
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
        </Show>

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
            disabled={props.isDeleting}
          >
            <Show when={!props.isDeleting}>
              <TrashIcon size="sm" class="mr-2" />
            </Show>
            {props.isDeleting ? "Deleting..." : "Delete Files"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteConfirmModal;

