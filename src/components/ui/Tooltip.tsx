import { Component, JSX, Show } from "solid-js";

interface TooltipProps {
  content: string | JSX.Element;
  children: JSX.Element;
  position?: "top" | "bottom" | "left" | "right";
  show?: boolean;
}

const positionClasses = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

const arrowClasses = {
  top: "top-full left-1/2 -translate-x-1/2 -mt-1 border-t-base-100 border-x-transparent border-b-transparent",
  bottom:
    "bottom-full left-1/2 -translate-x-1/2 -mb-1 border-b-base-100 border-x-transparent border-t-transparent",
  left: "left-full top-1/2 -translate-y-1/2 -ml-1 border-l-base-100 border-y-transparent border-r-transparent",
  right:
    "right-full top-1/2 -translate-y-1/2 -mr-1 border-r-base-100 border-y-transparent border-l-transparent",
};

/**
 * A tooltip component that shows content on hover.
 * Can be controlled via the `show` prop or will show/hide on hover automatically.
 */
const Tooltip: Component<TooltipProps> = (props) => {
  const position = () => props.position || "top";

  return (
    <div class="relative inline-block group">
      {props.children}
      <Show when={props.show !== false}>
        <div
          class={`absolute ${
            positionClasses[position()]
          } px-3 py-2 bg-base-100 text-base-content text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-base-300 z-10`}
        >
          {props.content}
          <div
            class={`absolute border-4 ${arrowClasses[position()]}`}
          />
        </div>
      </Show>
    </div>
  );
};

export default Tooltip;

