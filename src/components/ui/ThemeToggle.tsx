import { Component, createEffect, createSignal, onMount } from "solid-js";
import { SunIcon, MoonIcon } from "./icons";

const ThemeToggle: Component = () => {
  const [theme, setTheme] = createSignal<"light" | "dark">("light");

  onMount(() => {
    const savedTheme = localStorage.getItem("theme") as
      | "light"
      | "dark"
      | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  });

  createEffect(() => {
    const currentTheme = theme();
    document.documentElement.setAttribute("data-theme", currentTheme);
    localStorage.setItem("theme", currentTheme);
  });

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <button
      class="btn btn-circle btn-ghost"
      onClick={toggleTheme}
      title="Toggle Theme"
    >
      {theme() === "light" ? <MoonIcon size="lg" /> : <SunIcon size="lg" />}
    </button>
  );
};

export default ThemeToggle;
