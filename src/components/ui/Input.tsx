import { Component, JSX, splitProps } from "solid-js";

interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    bordered?: boolean;
    ghost?: boolean;
    variant?: "primary" | "secondary" | "accent" | "info" | "success" | "warning" | "error";
    size?: "lg" | "md" | "sm" | "xs";
}

const Input: Component<InputProps> = (props) => {
    const [local, others] = splitProps(props, ["label", "error", "bordered", "ghost", "variant", "size", "class"]);

    return (
        <div class="form-control w-full flex flex-col gap-1">
            {local.label && (
                <label class="label" for={others.id}>
                    <span class="label-text font-semibold">{local.label}</span>
                </label>
            )}
            <input
                class={`input ${local.bordered !== false ? "input-bordered" : ""} ${local.ghost ? "input-ghost" : ""} ${local.variant ? `input-${local.variant}` : ""
                    } ${local.size ? `input-${local.size}` : ""} ${local.error ? "input-error" : ""} ${local.class || ""}`}
                {...others}
            />
            {local.error && (
                <label class="label">
                    <span class="label-text-alt text-error">{local.error}</span>
                </label>
            )}
        </div>
    );
};

export default Input;
