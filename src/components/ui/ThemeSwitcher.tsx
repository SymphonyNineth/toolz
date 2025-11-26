import { Component, createEffect, createSignal, For, onMount } from "solid-js";
import { PaletteIcon } from "./icons";

const THEMES = [
  { id: "light", name: "Light" },
  { id: "dark", name: "Dark" },
  // { id: "emerald", name: "Emerald" },
  // { id: "forest", name: "Forest" },
  // { id: "pastel", name: "Pastel" },
  // { id: "black", name: "Black" },
  // { id: "dracula", name: "Dracula" },
  // { id: "business", name: "Business" },
  // { id: "night", name: "Night" },
  // { id: "dim", name: "Dim" },
  // { id: "sunset", name: "Sunset" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

const DEFAULT_THEME: ThemeId = "dark";

const ThemeSwitcher: Component = () => {
  const [theme, setTheme] = createSignal<ThemeId>(DEFAULT_THEME);

  onMount(() => {
    const savedTheme = localStorage.getItem("theme") as ThemeId | null;
    if (savedTheme && THEMES.some((t) => t.id === savedTheme)) {
      setTheme(savedTheme);
    }
  });

  createEffect(() => {
    const currentTheme = theme();
    document.documentElement.setAttribute("data-theme", currentTheme);
    localStorage.setItem("theme", currentTheme);
  });

  const handleThemeSelect = (themeId: ThemeId) => {
    setTheme(themeId);
    // Close dropdown by removing focus
    const elem = document.activeElement as HTMLElement;
    elem?.blur();
  };

  const currentTheme = () => THEMES.find((t) => t.id === theme());

  return (
    <div class="dropdown dropdown-end dropdown-top">
      <div
        tabindex="0"
        role="button"
        class="btn btn-ghost btn-sm gap-2"
        title="Change Theme"
      >
        <PaletteIcon size="sm" />
        <span class="text-xs capitalize">{currentTheme()?.name}</span>
        <svg
          class="w-3 h-3 opacity-60"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
      <ul
        tabindex="0"
        class="dropdown-content menu bg-base-200 rounded-box z-50 w-52 p-2 shadow-lg max-h-80 overflow-y-auto flex-nowrap"
      >
        <For each={THEMES}>
          {(themeOption) => (
            <li>
              <button
                class={`flex items-center gap-3 ${
                  theme() === themeOption.id ? "active" : ""
                }`}
                onClick={() => handleThemeSelect(themeOption.id)}
              >
                <span>{themeOption.name}</span>
                {theme() === themeOption.id && (
                  <svg
                    class="w-4 h-4 ml-auto text-success"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clip-rule="evenodd"
                    />
                  </svg>
                )}
              </button>
            </li>
          )}
        </For>
      </ul>
    </div>
  );
};

export default ThemeSwitcher;
export { THEMES, DEFAULT_THEME };
