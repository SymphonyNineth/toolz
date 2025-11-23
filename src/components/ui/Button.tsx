import { Component, JSX, splitProps } from "solid-js";

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "accent" | "ghost" | "link" | "info" | "success" | "warning" | "error";
    size?: "lg" | "md" | "sm" | "xs";
    outline?: boolean;
    loading?: boolean;
}

const Button: Component<ButtonProps> = (props) => {
    const [local, others] = splitProps(props, ["variant", "size", "outline", "loading", "class", "children"]);

    return (
        <button
            class={`btn ${local.variant ? `btn-${local.variant}` : ""} ${local.size ? `btn-${local.size}` : ""} ${local.outline ? "btn-outline" : ""
                } ${local.class || ""}`}
            classList={{ "loading": local.loading }}
            {...others}
        >
            {local.children}
        </button>
    );
};

export default Button;
