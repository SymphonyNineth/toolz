import { Component, Show, createMemo } from "solid-js";
import Input from "../ui/Input";
import Checkbox from "../ui/Checkbox";
import { ChevronDownIcon, ChevronRightIcon } from "../ui/icons";
import { NumberingOptions, NumberingPosition } from "./renamingUtils";

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

const SEPARATOR_PRESETS = ["-", "_", " ", ".", ""];

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

  const previewNumber = createMemo(() => {
    const { startNumber, padding } = props.options;
    return String(startNumber).padStart(padding, "0");
  });

  const nextNumber = createMemo(() => {
    const { startNumber, increment, padding } = props.options;
    return String(startNumber + increment).padStart(padding, "0");
  });

  return (
    <div class="bg-base-200 rounded-box shadow-lg overflow-hidden">
      {/* Header */}
      <button
        type="button"
        class="w-full px-6 py-4 flex items-center justify-between hover:bg-base-300 transition-colors"
        onClick={props.onToggle}
      >
        <div class="flex items-center gap-3">
          <span class="text-base-content/70">
            {props.isExpanded ? (
              <ChevronDownIcon size="sm" />
            ) : (
              <ChevronRightIcon size="sm" />
            )}
          </span>
          <span class="font-semibold">Numbering & Sequencing</span>
          <Show when={props.options.enabled}>
            <span class="badge badge-primary badge-sm">Active</span>
          </Show>
        </div>
        <div
          class="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={props.options.enabled}
            onChange={(e) => updateOption("enabled", e.currentTarget.checked)}
            size="sm"
          />
        </div>
      </button>

      {/* Content */}
      <Show when={props.isExpanded}>
        <div class="px-6 pb-6 pt-2 border-t border-base-300">
          {/* Preview */}
          <Show when={props.options.enabled}>
            <div class="mb-4 p-3 bg-base-300 rounded-lg">
              <span class="text-sm text-base-content/70">Preview: </span>
              <span class="font-mono text-primary">
                {previewNumber()}, {nextNumber()}, ...
              </span>
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
            <div class="form-control w-full">
              <label class="label" for="numbering-separator">
                <span class="label-text font-semibold">Separator</span>
              </label>
              <div class="flex gap-2">
                <input
                  id="numbering-separator"
                  type="text"
                  class="input input-bordered flex-1"
                  value={props.options.separator}
                  onInput={(e) =>
                    updateOption("separator", e.currentTarget.value)
                  }
                  placeholder="e.g., -, _, ."
                  disabled={!props.options.enabled}
                  maxLength={5}
                />
                <div class="dropdown dropdown-end">
                  <button
                    type="button"
                    tabIndex={0}
                    class="btn btn-square btn-outline"
                    disabled={!props.options.enabled}
                  >
                    ⌄
                  </button>
                  <ul
                    tabIndex={0}
                    class="dropdown-content menu bg-base-100 rounded-box z-10 w-32 p-2 shadow"
                  >
                    {SEPARATOR_PRESETS.map((sep) => (
                      <li>
                        <button
                          type="button"
                          onClick={() => updateOption("separator", sep)}
                          class="font-mono"
                        >
                          {sep === ""
                            ? "(none)"
                            : sep === " "
                            ? "space"
                            : `"${sep}"`}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
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
                  <input
                    type="number"
                    class="input input-bordered input-sm w-20"
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
              </Show>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default NumberingControls;
