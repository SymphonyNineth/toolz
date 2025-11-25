import { Component } from "solid-js";

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

/**
 * Header component for the batch renamer.
 * Displays the title and optional subtitle.
 */
const Header: Component<HeaderProps> = (props) => {
  return (
    <div class="flex items-center gap-3 mb-8">
      <div class="p-2 rounded-lg bg-primary/10">
        <svg
          class="w-7 h-7 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      </div>
      <div>
        <h2 class="text-2xl font-bold text-base-content">
          {props.title || "Batch File Renamer"}
        </h2>
        {props.subtitle && (
          <p class="text-base-content/60">{props.subtitle}</p>
        )}
      </div>
    </div>
  );
};

export default Header;
