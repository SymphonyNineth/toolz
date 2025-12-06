import { Component, Show, For, createMemo } from "solid-js";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import StatusIcon from "./StatusIcon";
import Checkbox from "../ui/Checkbox";
import { FolderIcon, WarningIcon } from "../ui/icons";
import { NumberingInfo } from "./renamingUtils";
import { DiffSegment, RegexSegment } from "./types";

export interface FileRowData {
  path: string;
  name: string;
  newName: string;
  /** Name after find/replace but before numbering - used for diff display */
  nameAfterReplace?: string;
  status: "idle" | "success" | "error";
  hasCollision?: boolean;
  numberingInfo?: NumberingInfo;
  /** Backend-computed segments for original name (diff or regex highlights) */
  originalSegments?: DiffSegment[] | RegexSegment[];
  /** Backend-computed segments for modified name (always DiffSegment) */
  modifiedSegments?: DiffSegment[];
  /** Type of preview: "diff" or "regexGroups" */
  previewType?: "diff" | "regexGroups";
}

interface FileRowProps {
  file: FileRowData;
  isSelected: boolean;
  onToggleSelection: () => void;
}

/** Component to render the colored number with padding distinction */
interface ColoredNumberProps {
  formattedNumber: string;
}

const ColoredNumber: Component<ColoredNumberProps> = (props) => {
  const parts = createMemo(() => {
    const numStr = props.formattedNumber;
    // Find where padding ends (first non-zero, or last char if all zeros)
    let paddingEnd = 0;
    for (let i = 0; i < numStr.length - 1; i++) {
      if (numStr[i] === "0") {
        paddingEnd = i + 1;
      } else {
        break;
      }
    }

    return {
      padding: numStr.substring(0, paddingEnd),
      number: numStr.substring(paddingEnd),
    };
  });

  return (
    <>
      <Show when={parts().padding}>
        <span class="seq-padding">{parts().padding}</span>
      </Show>
      <span class="seq-start-number">{parts().number}</span>
    </>
  );
};

/** Helper component to render original name with "removed" parts highlighted in red */
interface OriginalNameWithDiffProps {
  segments: DiffSegment[];
}

const OriginalNameWithDiff: Component<OriginalNameWithDiffProps> = (props) => {
  return (
    <span class="font-mono text-sm">
      <For each={props.segments}>
        {(segment: DiffSegment) => {
          if (segment.segmentType === "removed") {
            return (
              <span class="bg-error/20 text-error line-through">
                {segment.text}
              </span>
            );
          } else if (segment.segmentType === "unchanged") {
            return <span>{segment.text}</span>;
          }
          // Don't show 'added' segments in the original name
          return null;
        }}
      </For>
    </span>
  );
};

/** Helper component to render new name with "added" parts highlighted in green */
interface NewNameWithDiffProps {
  segments: DiffSegment[];
}

const NewNameWithDiff: Component<NewNameWithDiffProps> = (props) => {
  return (
    <span class="font-mono text-sm">
      <For each={props.segments}>
        {(segment: DiffSegment) => {
          if (segment.segmentType === "added") {
            return (
              <span class="bg-success/20 text-success font-semibold">
                {segment.text}
              </span>
            );
          } else if (segment.segmentType === "unchanged") {
            return <span>{segment.text}</span>;
          }
          // Don't show 'removed' segments in the new name
          return null;
        }}
      </For>
    </span>
  );
};

/** Component to render new name with color-coded numbering AND diff highlighting */
interface NumberedFileNameProps {
  originalName: string;
  nameAfterReplace: string;
  newName: string;
  numberingInfo: NumberingInfo;
}

const NumberedFileName: Component<NumberedFileNameProps> = (props) => {
  const parts = createMemo(() => {
    const { newName, nameAfterReplace, originalName } = props;
    const { formattedNumber, separator, position, insertIndex } =
      props.numberingInfo;

    // Extract extension from new name
    const lastDotIndex = newName.lastIndexOf(".");
    const hasExtension = lastDotIndex > 0;
    const baseName = hasExtension
      ? newName.substring(0, lastDotIndex)
      : newName;
    const extension = hasExtension ? newName.substring(lastDotIndex) : "";

    // Extract extension from nameAfterReplace (the name before numbering was applied)
    const afterReplaceLastDot = nameAfterReplace.lastIndexOf(".");
    const afterReplaceHasExt = afterReplaceLastDot > 0;
    const afterReplaceBase = afterReplaceHasExt
      ? nameAfterReplace.substring(0, afterReplaceLastDot)
      : nameAfterReplace;

    // Extract extension from original name for diff comparison
    const originalLastDot = originalName.lastIndexOf(".");
    const originalHasExt = originalLastDot > 0;
    const originalBase = originalHasExt
      ? originalName.substring(0, originalLastDot)
      : originalName;

    // Extract the text parts (without numbering) from the new basename
    let textBefore = "";
    let textAfter = "";
    const numberLen = formattedNumber.length;
    const sepLen = separator.length;

    switch (position) {
      case "start":
        // [NUMBER][SEP][rest]
        textAfter = baseName.substring(numberLen + sepLen);
        break;
      case "end":
        // [rest][SEP][NUMBER]
        textBefore = baseName.substring(
          0,
          baseName.length - numberLen - sepLen
        );
        break;
      case "index":
        if (insertIndex === 0) {
          textAfter = baseName.substring(numberLen + sepLen);
        } else if (insertIndex >= afterReplaceBase.length) {
          textBefore = baseName.substring(
            0,
            baseName.length - numberLen - sepLen
          );
        } else {
          // In the middle with separators on both sides
          textBefore = baseName.substring(0, insertIndex);
          textAfter = baseName.substring(
            insertIndex + sepLen + numberLen + sepLen
          );
        }
        break;
    }

    // For diff comparison, we need to compare against original (without extension)
    // textBefore + textAfter should equal afterReplaceBase (the replaced text without numbering)
    // We compare afterReplaceBase against originalBase for highlighting

    return {
      textBefore,
      textAfter,
      extension,
      originalBase,
      afterReplaceBase,
      position,
    };
  });

  // Compute original text parts to compare for diff highlighting
  const originalParts = createMemo(() => {
    const { position, originalBase, afterReplaceBase } = parts();
    const { insertIndex } = props.numberingInfo;

    // For start position: all of originalBase maps to textAfter
    // For end position: all of originalBase maps to textBefore
    // For index position: split originalBase at insertIndex

    switch (position) {
      case "start":
        return { originalBefore: "", originalAfter: originalBase };
      case "end":
        return { originalBefore: originalBase, originalAfter: "" };
      case "index":
        if (insertIndex === 0) {
          return { originalBefore: "", originalAfter: originalBase };
        } else if (insertIndex >= afterReplaceBase.length) {
          return { originalBefore: originalBase, originalAfter: "" };
        } else {
          return {
            originalBefore: originalBase.substring(
              0,
              Math.min(insertIndex, originalBase.length)
            ),
            originalAfter: originalBase.substring(
              Math.min(insertIndex, originalBase.length)
            ),
          };
        }
      default:
        return { originalBefore: "", originalAfter: originalBase };
    }
  });

  return (
    <span class="font-mono text-sm">
      <Show when={parts().textBefore}>
        <span>{parts().textBefore}</span>
      </Show>
      <Show
        when={props.numberingInfo.position !== "start" && parts().textBefore}
      >
        <span class="seq-separator">{props.numberingInfo.separator}</span>
      </Show>
      <ColoredNumber formattedNumber={props.numberingInfo.formattedNumber} />
      <Show
        when={
          props.numberingInfo.separator &&
          (props.numberingInfo.position !== "end" || parts().textAfter)
        }
      >
        <span class="seq-separator">{props.numberingInfo.separator}</span>
      </Show>
      <Show when={parts().textAfter}>
        <span>{parts().textAfter}</span>
      </Show>
      <span>{parts().extension}</span>
    </span>
  );
};

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
            <OriginalNameWithDiff segments={props.file.originalSegments as DiffSegment[]} />
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
              <NewNameWithDiff segments={props.file.modifiedSegments as DiffSegment[]} />
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
