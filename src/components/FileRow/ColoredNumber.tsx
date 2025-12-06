import { Component, createMemo, Show } from "solid-js";

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

export default ColoredNumber;
