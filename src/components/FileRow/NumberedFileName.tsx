import { Component, createMemo, Show } from "solid-js";
import { NumberingInfo } from "../BatchRenamer/renamingUtils";
import ColoredNumber from "./ColoredNumber";

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

export default NumberedFileName;
