import { Component, Show, createMemo, For } from "solid-js";
import Input from "../ui/Input";
import Toggle from "../ui/Toggle";
import { NumberingOptions, NumberingPosition } from "./renamingUtils";

/** Helper component to render a number with color-coded parts */
interface ColorCodedNumberProps {
  number: number;
  padding: number;
  showIncrement?: boolean;
}

const ColorCodedNumber: Component<ColorCodedNumberProps> = (props) => {
  const parts = createMemo(() => {
    const numStr = String(props.number);
    const paddedStr = numStr.padStart(props.padding, "0");
    const paddingCount = paddedStr.length - numStr.length;

    const result: { char: string; type: "padding" | "number" | "increment" }[] =
      [];

    // Add padding zeros
    for (let i = 0; i < paddingCount; i++) {
      result.push({ char: "0", type: "padding" });
    }

    // Add number digits
    for (let i = 0; i < numStr.length; i++) {
      result.push({
        char: numStr[i],
        type:
          props.showIncrement && i === numStr.length - 1
            ? "increment"
            : "number",
      });
    }

    return result;
  });

  return (
    <For each={parts()}>
      {(part) => (
        <span
          class={
            part.type === "padding"
              ? "seq-padding"
              : part.type === "increment"
                ? "seq-increment"
                : "seq-start-number"
          }
        >
          {part.char}
        </span>
      )}
    </For>
  );
};

interface NumberingControlsProps {
  options: NumberingOptions;
  onOptionsChange: (options: NumberingOptions) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

const POSITION_OPTIONS: { value: NumberingPosition; label: string }[] = [
  { value: "start", label: "Start" },
  { value: "end", label: "End" },
  { value: "index", label: "At Index" },
];

const NumberingControls: Component<NumberingControlsProps> = (props) => {
  const updateOption = <K extends keyof NumberingOptions>(
    key: K,
    value: NumberingOptions[K]
  ) => {
    props.onOptionsChange({
      ...props.options,
      [key]: value,
    });
  };

  // Handle checkbox change - sync with expansion state
  const handleCheckboxChange = (checked: boolean) => {
    updateOption("enabled", checked);
    // Expand when enabling, collapse when disabling
    if (checked && !props.isExpanded) {
      props.onToggle();
    } else if (!checked && props.isExpanded) {
      props.onToggle();
    }
  };

  // Handle header click - toggle both enabled and expanded
  const handleHeaderClick = () => {
    // Toggle enabled state
    updateOption("enabled", !props.options.enabled);
    // Toggle expansion
    props.onToggle();
  };

  return (
    <div class="bg-base-200 rounded-box shadow-lg overflow-hidden h-full min-h-80">
      {/* Header */}
      <div
        class="w-full px-6 py-4 flex items-center justify-between hover:bg-base-300 transition-colors cursor-pointer"
        onClick={handleHeaderClick}
      >
        <div class="flex items-center gap-3">
          <span class="font-semibold text-lg">Numbering & Sequencing</span>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <Toggle
            checked={props.options.enabled}
            onChange={(e) => handleCheckboxChange(e.currentTarget.checked)}
            size="md"
          />
        </div>
      </div>

      {/* Content */}
      <Show when={props.isExpanded}>
        <div class="px-6 pb-6 pt-2 border-t border-base-300">
          {/* Preview with color coding */}
          <Show when={props.options.enabled}>
            <div class="mb-4 p-3 bg-base-300 rounded-lg">
              <div class="flex flex-wrap items-center gap-x-1 mb-2">
                <span class="text-sm text-base-content/70">Sequence: </span>
                <span class="font-mono font-semibold">
                  <ColorCodedNumber
                    number={props.options.startNumber}
                    padding={props.options.padding}
                  />
                </span>
                <Show when={props.options.separator}>
                  <span class="font-mono font-semibold seq-separator">
                    {props.options.separator}
                  </span>
                </Show>
                <span class="text-base-content/50">,</span>
                <span class="font-mono font-semibold">
                  <ColorCodedNumber
                    number={props.options.startNumber + props.options.increment}
                    padding={props.options.padding}
                    showIncrement
                  />
                </span>
                <Show when={props.options.separator}>
                  <span class="font-mono font-semibold seq-separator">
                    {props.options.separator}
                  </span>
                </Show>
                <span class="text-base-content/50">,</span>
                <span class="font-mono font-semibold">
                  <ColorCodedNumber
                    number={
                      props.options.startNumber + props.options.increment * 2
                    }
                    padding={props.options.padding}
                  />
                </span>
                <Show when={props.options.separator}>
                  <span class="font-mono font-semibold seq-separator">
                    {props.options.separator}
                  </span>
                </Show>
                <span class="text-base-content/50">, ...</span>
              </div>
              {/* Color legend */}
              <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span>
                  <span class="seq-start-number font-semibold">●</span>{" "}
                  <span class="text-base-content/70">Start Number</span>
                </span>
                <span>
                  <span class="seq-increment font-semibold">●</span>{" "}
                  <span class="text-base-content/70">Increment</span>
                </span>
                <span>
                  <span class="seq-padding font-semibold">●</span>{" "}
                  <span class="text-base-content/70">Padding</span>
                </span>
                <span>
                  <span class="seq-separator font-semibold">●</span>{" "}
                  <span class="text-base-content/70">Separator</span>
                </span>
              </div>
            </div>
          </Show>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Start Number */}
            <Input
              id="numbering-start"
              label="Start Number"
              type="number"
              value={props.options.startNumber}
              onInput={(e) =>
                updateOption(
                  "startNumber",
                  parseInt(e.currentTarget.value) || 1
                )
              }
              min={0}
              disabled={!props.options.enabled}
            />

            {/* Increment */}
            <Input
              id="numbering-increment"
              label="Increment"
              type="number"
              value={props.options.increment}
              onInput={(e) =>
                updateOption("increment", parseInt(e.currentTarget.value) || 1)
              }
              min={1}
              disabled={!props.options.enabled}
            />

            {/* Padding */}
            <Input
              id="numbering-padding"
              label="Padding (digits)"
              type="number"
              value={props.options.padding}
              onInput={(e) =>
                updateOption(
                  "padding",
                  Math.max(1, parseInt(e.currentTarget.value) || 1)
                )
              }
              min={1}
              max={10}
              disabled={!props.options.enabled}
            />

            {/* Separator */}
            <Input
              id="numbering-separator"
              label="Separator"
              type="text"
              value={props.options.separator}
              onInput={(e) => updateOption("separator", e.currentTarget.value)}
              placeholder="e.g., -, _, ."
              disabled={!props.options.enabled}
              maxLength={5}
            />
          </div>

          {/* Position */}
          <div class="mt-4">
            <label class="label">
              <span class="label-text font-semibold">Position</span>
            </label>
            <div class="flex flex-wrap items-center gap-4">
              {POSITION_OPTIONS.map((opt) => (
                <label class="label cursor-pointer gap-2">
                  <input
                    type="radio"
                    name="numbering-position"
                    class="radio radio-primary radio-sm"
                    value={opt.value}
                    checked={props.options.position === opt.value}
                    onChange={() => updateOption("position", opt.value)}
                    disabled={!props.options.enabled}
                  />
                  <span class="label-text">{opt.label}</span>
                </label>
              ))}

              {/* Insert Index input - only shown when position is "index" */}
              <Show when={props.options.position === "index"}>
                <div class="flex items-center gap-2">
                  <span class="label-text">at position:</span>
                  <div class="w-24">
                    <Input
                      type="number"
                      size="sm"
                      value={props.options.insertIndex ?? 0}
                      onInput={(e) =>
                        updateOption(
                          "insertIndex",
                          Math.max(0, parseInt(e.currentTarget.value) || 0)
                        )
                      }
                      min={0}
                      disabled={!props.options.enabled}
                    />
                  </div>
                </div>
              </Show>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default NumberingControls;
