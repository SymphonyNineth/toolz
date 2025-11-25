import { Component, For, Show, createSignal } from "solid-js";
import { ChevronDownIcon, ChevronRightIcon } from "../ui/icons";

interface PatternItem {
  pattern: string;
  description: string;
}

interface ExampleItem {
  title: string;
  find: string;
  replace: string;
  example: string;
}

const quickPatterns: PatternItem[] = [
  { pattern: "\\d+", description: "One or more digits" },
  { pattern: "\\w+", description: "One or more word chars" },
  { pattern: "\\s+", description: "One or more spaces" },
  { pattern: "^", description: "Start of string" },
  { pattern: "$", description: "End of string" },
  { pattern: "(.+)", description: "Capture group → $1" },
  { pattern: "[abc]", description: "Any of a, b, c" },
  { pattern: ".*", description: "Any characters" },
];

const allPatterns: PatternItem[] = [
  { pattern: ".", description: "Any single character" },
  { pattern: "\\d", description: "Any digit (0-9)" },
  { pattern: "\\D", description: "Any non-digit" },
  { pattern: "\\w", description: "Word char (a-z, A-Z, 0-9, _)" },
  { pattern: "\\W", description: "Any non-word character" },
  { pattern: "\\s", description: "Any whitespace" },
  { pattern: "\\S", description: "Any non-whitespace" },
  { pattern: "^", description: "Start of string" },
  { pattern: "$", description: "End of string" },
  { pattern: "[abc]", description: "Any char in set" },
  { pattern: "[^abc]", description: "Any char NOT in set" },
  { pattern: "[a-z]", description: "Range a to z" },
  { pattern: "*", description: "0 or more" },
  { pattern: "+", description: "1 or more" },
  { pattern: "?", description: "0 or 1" },
  { pattern: "{n}", description: "Exactly n times" },
  { pattern: "{n,m}", description: "n to m times" },
  { pattern: "(group)", description: "Capture → $1, $2" },
  { pattern: "(?:group)", description: "Non-capturing group" },
  { pattern: "a|b", description: "a OR b" },
];

const quickExamples: ExampleItem[] = [
  {
    title: "Remove numbers",
    find: "\\d+",
    replace: "",
    example: "file123.txt → file.txt",
  },
  {
    title: "Spaces → underscores",
    find: "\\s+",
    replace: "_",
    example: "my file.txt → my_file.txt",
  },
  {
    title: "Swap parts",
    find: "^(.+)_old$",
    replace: "$1_new",
    example: "report_old → report_new",
  },
];

interface RegexCheatSheetInlineProps {
  isExpanded: boolean;
  onToggle: () => void;
}

const RegexCheatSheetInline: Component<RegexCheatSheetInlineProps> = (props) => {
  const [showAllPatterns, setShowAllPatterns] = createSignal(false);

  return (
    <div class="w-full border border-base-300 rounded-box overflow-hidden bg-base-100 transition-all duration-300">
      {/* Header - Always visible */}
      <button
        onClick={props.onToggle}
        class="w-full flex items-center justify-between p-3 hover:bg-base-200 transition-colors text-left"
      >
        <div class="flex items-center gap-2">
          <span class="text-lg">📖</span>
          <span class="font-medium text-sm">Regex Quick Reference</span>
        </div>
        <Show when={props.isExpanded} fallback={<ChevronRightIcon size="sm" />}>
          <ChevronDownIcon size="sm" />
        </Show>
      </button>

      {/* Expandable Content */}
      <Show when={props.isExpanded}>
        <div class="border-t border-base-300 p-4 space-y-4">
          {/* Quick Patterns */}
          <div>
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-xs font-semibold uppercase tracking-wide text-base-content/60">
                Common Patterns
              </h4>
              <button
                onClick={() => setShowAllPatterns(!showAllPatterns())}
                class="text-xs text-primary hover:underline"
              >
                {showAllPatterns() ? "Show less" : "Show all"}
              </button>
            </div>
            <div class="grid grid-cols-2 gap-1.5">
              <For each={showAllPatterns() ? allPatterns : quickPatterns}>
                {(item) => (
                  <div class="flex items-center gap-2 text-xs p-1.5 rounded bg-base-200 hover:bg-base-300 transition-colors">
                    <code class="font-mono font-bold text-accent min-w-[60px] text-xs">
                      {item.pattern}
                    </code>
                    <span class="text-base-content/80 truncate text-xs">{item.description}</span>
                  </div>
                )}
              </For>
            </div>
          </div>

          {/* Quick Examples */}
          <div>
            <h4 class="text-xs font-semibold uppercase tracking-wide text-base-content/60 mb-2">
              Quick Examples
            </h4>
            <div class="space-y-2">
              <For each={quickExamples}>
                {(ex) => (
                  <div class="p-2 bg-base-200 rounded text-xs">
                    <div class="font-medium text-base-content/90 mb-1">{ex.title}</div>
                    <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      <span>
                        <span class="text-base-content/60">Find: </span>
                        <code class="font-mono text-accent">{ex.find}</code>
                      </span>
                      <span>
                        <span class="text-base-content/60">Replace: </span>
                        <code class="font-mono text-secondary">{ex.replace || "(empty)"}</code>
                      </span>
                    </div>
                    <div class="text-info mt-1 text-xs">{ex.example}</div>
                  </div>
                )}
              </For>
            </div>
          </div>

          {/* Tips */}
          <div class="text-xs text-base-content/60 border-t border-base-300 pt-3">
            <span class="font-medium">Tip:</span> Use{" "}
            <code class="font-mono bg-base-200 px-1 rounded">$1</code>,{" "}
            <code class="font-mono bg-base-200 px-1 rounded">$2</code> in replacement to reference capture groups
          </div>
        </div>
      </Show>
    </div>
  );
};

export default RegexCheatSheetInline;

