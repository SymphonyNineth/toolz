import { Component } from "solid-js";
import ThemeToggle from "../ui/ThemeToggle";

interface HeaderProps {
  title?: string;
}

/**
 * Header component for the batch renamer.
 * Displays the title and theme toggle.
 */
const Header: Component<HeaderProps> = (props) => {
  return (
    <div class="flex justify-between items-center mb-8">
      <h2 class="text-3xl font-bold text-primary">
        {props.title || "Batch File Renamer"}
      </h2>
      <ThemeToggle />
    </div>
  );
};

export default Header;

