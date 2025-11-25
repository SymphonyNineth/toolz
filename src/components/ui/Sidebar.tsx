import { Component, For, JSX } from "solid-js";
import ThemeToggle from "./ThemeToggle";

export interface ToolItem {
  id: string;
  name: string;
  icon: JSX.Element;
  description?: string;
}

interface SidebarProps {
  tools: ToolItem[];
  activeTool: string;
  onToolSelect: (toolId: string) => void;
}

/**
 * Sidebar navigation component for selecting different tools.
 * Displays a list of available tools with icons and provides navigation.
 */
const Sidebar: Component<SidebarProps> = (props) => {
  return (
    <aside class="w-64 min-h-screen bg-base-200 border-r border-base-300 flex flex-col">
      {/* App Header */}
      <div class="p-4 border-b border-base-300">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-gradient-to-br from-primary to-secondary">
            <svg
              class="w-6 h-6 text-primary-content"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
          </div>
          <div>
            <h1 class="text-lg font-bold text-base-content">Simple Tools</h1>
            <p class="text-xs text-base-content/60">File utilities</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav class="flex-1 p-3">
        <div class="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-2 px-2">
          Tools
        </div>
        <ul class="menu menu-sm gap-1">
          <For each={props.tools}>
            {(tool) => (
              <li>
                <button
                  class={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    props.activeTool === tool.id
                      ? "bg-primary text-primary-content shadow-md"
                      : "hover:bg-base-300 text-base-content"
                  }`}
                  onClick={() => props.onToolSelect(tool.id)}
                >
                  <span
                    class={`p-1.5 rounded-md ${
                      props.activeTool === tool.id
                        ? "bg-primary-content/20"
                        : "bg-base-300"
                    }`}
                  >
                    {tool.icon}
                  </span>
                  <div class="flex flex-col items-start">
                    <span class="font-medium text-sm">{tool.name}</span>
                    {tool.description && (
                      <span
                        class={`text-xs ${
                          props.activeTool === tool.id
                            ? "text-primary-content/70"
                            : "text-base-content/50"
                        }`}
                      >
                        {tool.description}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            )}
          </For>
        </ul>
      </nav>

      {/* Footer */}
      <div class="p-4 border-t border-base-300">
        <div class="flex items-center justify-between">
          <span class="text-xs text-base-content/50">Theme</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

