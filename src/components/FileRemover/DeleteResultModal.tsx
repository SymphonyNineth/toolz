import { Component, For, Show } from "solid-js";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { SuccessIcon, ErrorIcon, FolderIcon } from "../ui/icons";
import { DeleteResult } from "./types";

interface DeleteResultModalProps {
  result: DeleteResult | null;
  onClose: () => void;
}

const DeleteResultModal: Component<DeleteResultModalProps> = (props) => {
  const successCount = () => props.result?.successful.length ?? 0;
  const failedCount = () => props.result?.failed.length ?? 0;
  const deletedDirsCount = () => props.result?.deletedDirs.length ?? 0;
  const hasFailures = () => failedCount() > 0;
  const isOpen = () => props.result !== null;

  return (
    <Modal isOpen={isOpen()} onClose={props.onClose} maxWidth="lg">
      <div class="p-6">
        {/* Header */}
        <div class="flex items-center gap-3 mb-4">
          <div
            class={`p-3 rounded-full ${hasFailures() ? "bg-warning/10" : "bg-success/10"}`}
          >
            <Show
              when={hasFailures()}
              fallback={<SuccessIcon size="lg" class="text-success" />}
            >
              <ErrorIcon size="lg" class="text-warning" />
            </Show>
          </div>
          <div>
            <h3 class="text-lg font-bold text-base-content">
              {hasFailures() ? "Deletion Completed with Errors" : "Deletion Complete"}
            </h3>
            <p class="text-sm text-base-content/60">
              {hasFailures()
                ? "Some files could not be deleted"
                : "All files were successfully deleted"}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div class="grid grid-cols-3 gap-4 mb-4">
          <div class="bg-success/10 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-success">{successCount()}</div>
            <div class="text-xs text-base-content/60">Files Deleted</div>
          </div>
          <Show when={deletedDirsCount() > 0}>
            <div class="bg-info/10 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-info">{deletedDirsCount()}</div>
              <div class="text-xs text-base-content/60">Empty Dirs Removed</div>
            </div>
          </Show>
          <Show when={hasFailures()}>
            <div class="bg-error/10 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-error">{failedCount()}</div>
              <div class="text-xs text-base-content/60">Failed</div>
            </div>
          </Show>
        </div>

        {/* Deleted directories */}
        <Show when={deletedDirsCount() > 0}>
          <div class="bg-base-200 rounded-lg p-3 mb-4">
            <p class="text-xs text-base-content/60 mb-2 flex items-center gap-1">
              <FolderIcon size="xs" />
              Empty directories removed:
            </p>
            <div class="space-y-1 max-h-24 overflow-y-auto">
              <For each={props.result?.deletedDirs.slice(0, 5)}>
                {(dir) => (
                  <div class="text-sm font-mono truncate text-base-content/80">
                    {dir}
                  </div>
                )}
              </For>
              <Show when={(props.result?.deletedDirs.length ?? 0) > 5}>
                <div class="text-sm text-base-content/50 italic">
                  ... and {(props.result?.deletedDirs.length ?? 0) - 5} more
                </div>
              </Show>
            </div>
          </div>
        </Show>

        {/* Failed files */}
        <Show when={hasFailures()}>
          <div class="bg-error/10 rounded-lg p-3 mb-4">
            <p class="text-xs text-error mb-2">Failed to delete:</p>
            <div class="space-y-2 max-h-32 overflow-y-auto">
              <For each={props.result?.failed.slice(0, 5)}>
                {([path, error]) => (
                  <div class="text-sm">
                    <div class="font-mono truncate text-base-content/80">{path}</div>
                    <div class="text-xs text-error/80">{error}</div>
                  </div>
                )}
              </For>
              <Show when={(props.result?.failed.length ?? 0) > 5}>
                <div class="text-sm text-base-content/50 italic">
                  ... and {(props.result?.failed.length ?? 0) - 5} more errors
                </div>
              </Show>
            </div>
          </div>
        </Show>

        {/* Actions */}
        <div class="flex justify-end">
          <Button variant="primary" onClick={props.onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteResultModal;

