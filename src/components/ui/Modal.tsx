import { Component, JSX, Show } from "solid-js";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: JSX.Element;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "full";
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
  full: "max-w-full",
};

const Modal: Component<ModalProps> = (props) => {
  const handleBackdropClick = () => {
    props.onClose();
  };

  const handleContentClick = (e: MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Show when={props.isOpen}>
      <div
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={handleBackdropClick}
      >
        <div
          class={`bg-base-100 rounded-box shadow-2xl w-full ${
            maxWidthClasses[props.maxWidth || "4xl"]
          } max-h-[90vh] overflow-y-auto`}
          onClick={handleContentClick}
        >
          {props.title && (
            <div class="sticky top-0 bg-base-100 border-b border-base-300 p-6 flex justify-between items-center">
              <h3 class="text-2xl font-bold text-primary">{props.title}</h3>
              <button
                onClick={props.onClose}
                class="btn btn-sm btn-circle btn-ghost"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          )}
          {props.children}
        </div>
      </div>
    </Show>
  );
};

export default Modal;

