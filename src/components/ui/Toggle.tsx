import { Component, JSX, splitProps } from "solid-js";

interface ToggleProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  variant?:
  | "primary"
  | "secondary"
  | "accent"
  | "success"
  | "warning"
  | "error";
  size?: "lg" | "md" | "sm" | "xs";
}

const Toggle: Component<ToggleProps> = (props) => {
  const [local, others] = splitProps(props, [
    "label",
    "variant",
    "size",
    "class",
  ]);

  return (
    <div class="form-control">
      <label class="label cursor-pointer justify-start gap-4">
        <input
          type="checkbox"
          class={`toggle ${local.variant ? `toggle-${local.variant}` : "toggle-primary"
            } ${local.size ? `toggle-${local.size}` : ""} ${local.class || ""}`}
          {...others}
        />
        {local.label && <span class="label-text">{local.label}</span>}
      </label>
    </div>
  );
};

export default Toggle;
