import { Component, Show } from "solid-js";

export interface ProgressBarProps {
  /** Current progress value (0 to total or 0-100 if total not provided) */
  progress?: number;
  /** Total items for calculating percentage (optional, for showing "X of Y") */
  total?: number;
  /** Current item count (optional, overrides progress for display) */
  current?: number;
  /** Description text (e.g., "Scanning files...") */
  label?: string;
  /** Whether to show percentage text */
  showPercentage?: boolean;
  /** Whether to show count text (e.g., "150 / 300") */
  showCount?: boolean;
  /** For operations where total is unknown - shows animated pulsing state */
  indeterminate?: boolean;
  /** Color variant */
  variant?: "primary" | "secondary" | "accent" | "info" | "success" | "warning" | "error";
  /** Size variant */
  size?: "xs" | "sm" | "md" | "lg";
  /** Additional class names */
  class?: string;
}

const ProgressBar: Component<ProgressBarProps> = (props) => {
  const percentage = () => {
    if (props.indeterminate) return undefined;
    if (props.total && props.total > 0) {
      const current = props.current ?? props.progress ?? 0;
      return Math.min(100, Math.round((current / props.total) * 100));
    }
    return Math.min(100, Math.round(props.progress ?? 0));
  };

  const currentValue = () => props.current ?? props.progress ?? 0;

  const sizeClass = () => {
    switch (props.size) {
      case "xs":
        return "progress-xs";
      case "sm":
        return "progress-sm";
      case "lg":
        return "progress-lg";
      default:
        return "";
    }
  };

  const variantClass = () => {
    if (props.variant) {
      return `progress-${props.variant}`;
    }
    return "progress-primary";
  };

  return (
    <div class={`w-full ${props.class || ""}`}>
      {/* Label and stats row */}
      <Show when={props.label || props.showPercentage || props.showCount}>
        <div class="flex justify-between items-center mb-1">
          <Show when={props.label}>
            <span class="text-sm text-base-content/70">{props.label}</span>
          </Show>
          <div class="flex gap-2 text-sm text-base-content/60 ml-auto">
            <Show when={props.showCount && props.total && !props.indeterminate}>
              <span>
                {currentValue().toLocaleString()} / {props.total?.toLocaleString()}
              </span>
            </Show>
            <Show when={props.showPercentage && !props.indeterminate}>
              <span>{percentage()}%</span>
            </Show>
          </div>
        </div>
      </Show>

      {/* Progress bar - render two versions to properly omit value for indeterminate */}
      <Show when={props.indeterminate}>
        <progress
          class={`progress ${variantClass()} ${sizeClass()} w-full transition-all duration-300 ease-out animate-pulse`}
          max={props.total ?? 100}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={props.total ?? 100}
          aria-label={props.label || "Progress"}
        />
      </Show>
      <Show when={!props.indeterminate}>
        <progress
          class={`progress ${variantClass()} ${sizeClass()} w-full transition-all duration-300 ease-out`}
          value={currentValue()}
          max={props.total ?? 100}
          role="progressbar"
          aria-valuenow={currentValue()}
          aria-valuemin={0}
          aria-valuemax={props.total ?? 100}
          aria-label={props.label || "Progress"}
        />
      </Show>
    </div>
  );
};

export default ProgressBar;

