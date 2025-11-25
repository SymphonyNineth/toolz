import { Component } from "solid-js";
import { SuccessIcon, ErrorIcon } from "../ui/icons";

export type FileStatus = "idle" | "success" | "error";

interface StatusIconProps {
  status: FileStatus;
}

/**
 * Displays a status icon based on the file operation result.
 * Shows success (checkmark) or error (X) icons.
 */
const StatusIcon: Component<StatusIconProps> = (props) => {
  return (
    <div class="w-6 h-6 flex items-center justify-center">
      {props.status === "success" && (
        <SuccessIcon size="md" class="text-success" />
      )}
      {props.status === "error" && <ErrorIcon size="md" class="text-error" />}
    </div>
  );
};

export default StatusIcon;

