import { Component } from "solid-js";

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

const Header: Component<HeaderProps> = (props) => {
  return (
    <div class="flex items-center gap-3 mb-8">
      <h2 class="text-2xl font-bold text-base-content">{props.title}</h2>
      {props.subtitle && <p class="text-base-content/60">{props.subtitle}</p>}
    </div>
  );
};

export default Header;
