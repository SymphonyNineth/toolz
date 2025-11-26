import { Component, Show, createSignal, createEffect } from "solid-js";
import Input from "../ui/Input";
import Checkbox from "../ui/Checkbox";
import Tooltip from "../ui/Tooltip";
import Button from "../ui/Button";
import RegexCheatSheet from "../ui/RegexCheatSheet";
import { FolderOpenIcon, SearchIcon, ErrorIcon } from "../ui/icons";
import { PatternType } from "./types";
import { validatePattern } from "./utils";

interface PatternControlsProps {
  pattern: string;
  setPattern: (value: string) => void;
  patternType: PatternType;
  setPatternType: (value: PatternType) => void;
  caseSensitive: boolean;
  setCaseSensitive: (value: boolean) => void;
  includeSubdirs: boolean;
  setIncludeSubdirs: (value: boolean) => void;
  deleteEmptyDirs: boolean;
  setDeleteEmptyDirs: (value: boolean) => void;
  patternError?: string;
  // New props for inline folder selection and search
  basePath: string;
  onSelectFolder: () => void;
  onSearch: () => void;
  isSearching: boolean;
  canSearch: boolean;
}

const PatternControls: Component<PatternControlsProps> = (props) => {
  const [cheatSheetExpanded, setCheatSheetExpanded] = createSignal(false);
  const [localValidationError, setLocalValidationError] = createSignal<
    string | undefined
  >();

  // Real-time validation
  createEffect(() => {
    const pattern = props.pattern;
    const patternType = props.patternType;

    if (!pattern.trim()) {
      setLocalValidationError(undefined);
      return;
    }

    const error = validatePattern(pattern, patternType);
    setLocalValidationError(error);
  });

  // Auto-collapse cheat sheet when not in regex mode
  createEffect(() => {
    if (props.patternType !== "regex") {
      setCheatSheetExpanded(false);
    }
  });

  const patternPlaceholder = () => {
    switch (props.patternType) {
      case "simple":
        return "Enter text to match in file names...";
      case "extension":
        return ".tmp, .log, .bak";
      case "regex":
        return "Enter regex pattern (e.g., \\d+ for numbers)...";
    }
  };

  const patternHelp = () => {
    switch (props.patternType) {
      case "simple":
        return "Match files containing this text in their name";
      case "extension":
        return "Comma-separated list of extensions (with or without dots)";
      case "regex":
        return "Regular expression pattern for advanced matching";
    }
  };

  // Combined error (real-time or from search)
  const displayError = () => props.patternError || localValidationError();

  // Pattern is valid if no error (but empty pattern is considered neutral)
  const hasValidationError = () => !!displayError();

  // Handle Enter key to trigger search
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && props.canSearch && !hasValidationError()) {
      props.onSearch();
    }
  };

  return (
    <div class="w-full">
      <div class="p-6 bg-base-200 rounded-box shadow-lg">
        {/* Folder Selection - Prominent at the top */}
        <div class="mb-6">
          <div class="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={props.onSelectFolder}
              class="gap-2"
            >
              <FolderOpenIcon size="sm" />
              Select Folder
            </Button>
            <Show when={props.basePath}>
              <div class="flex-1 min-w-0">
                <div class="px-3 py-2 bg-base-100 rounded-lg border border-base-300">
                  <span
                    class="text-sm text-base-content/70 truncate block"
                    title={props.basePath}
                  >
                    {props.basePath}
                  </span>
                </div>
              </div>
            </Show>
            <Show when={!props.basePath}>
              <span class="text-sm text-base-content/50">
                Choose a folder to search in
              </span>
            </Show>
          </div>
        </div>

        {/* Pattern Type Selector */}
        <div class="mb-4">
          <label class="label">
            <span class="label-text font-semibold">Pattern Type</span>
          </label>
          <div class="join w-full">
            <button
              class={`btn join-item flex-1 ${
                props.patternType === "simple" ? "btn-active" : ""
              }`}
              onClick={() => props.setPatternType("simple")}
            >
              Simple
            </button>
            <button
              class={`btn join-item flex-1 ${
                props.patternType === "extension" ? "btn-active" : ""
              }`}
              onClick={() => props.setPatternType("extension")}
            >
              Extension
            </button>
            <button
              class={`btn join-item flex-1 ${
                props.patternType === "regex" ? "btn-active" : ""
              }`}
              onClick={() => props.setPatternType("regex")}
            >
              Regex
            </button>
          </div>
        </div>

        {/* Pattern Input with integrated Search */}
        <div class="mb-4">
          <label class="label">
            <span class="label-text font-semibold">Pattern</span>
            <Tooltip content={patternHelp()}>
              <span class="label-text-alt cursor-help text-base-content/50">
                ⓘ
              </span>
            </Tooltip>
          </label>
          <div class="flex gap-2">
            <div class="flex-1">
              <Input
                type="text"
                value={props.pattern}
                onInput={(e) => props.setPattern(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                placeholder={patternPlaceholder()}
                class={`w-full ${hasValidationError() ? "input-error" : ""}`}
              />
            </div>
            <Button
              variant="primary"
              onClick={props.onSearch}
              disabled={!props.canSearch || hasValidationError()}
              loading={props.isSearching}
              class="gap-2 min-w-[120px]"
            >
              <SearchIcon size="sm" />
              Search
            </Button>
          </div>
          <Show when={displayError()}>
            <div class="flex items-center gap-1 mt-2 text-error text-sm">
              <ErrorIcon size="xs" />
              <span>{displayError()}</span>
            </div>
          </Show>
          <Show when={!props.basePath && props.pattern.trim()}>
            <div class="text-sm text-warning mt-2">
              Select a folder first to search
            </div>
          </Show>
        </div>

        {/* Options */}
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          <Checkbox
            checked={props.caseSensitive}
            onChange={(e) => props.setCaseSensitive(e.currentTarget.checked)}
            label="Case Sensitive"
          />
          <Checkbox
            checked={props.includeSubdirs}
            onChange={(e) => props.setIncludeSubdirs(e.currentTarget.checked)}
            label="Include Subdirectories"
          />
          <Checkbox
            checked={props.deleteEmptyDirs}
            onChange={(e) => props.setDeleteEmptyDirs(e.currentTarget.checked)}
            label="Delete Empty Directories"
          />
        </div>

        {/* Regex Cheat Sheet - visible when regex mode is enabled */}
        <Show when={props.patternType === "regex"}>
          <div class="mt-6 pt-4 border-t border-base-content/10">
            <RegexCheatSheet
              isExpanded={cheatSheetExpanded()}
              onToggle={() => setCheatSheetExpanded(!cheatSheetExpanded())}
              tipText="Use \d+ to match numbers, \w+ for words, .* for any characters"
            />
          </div>
        </Show>
      </div>
    </div>
  );
};

export default PatternControls;
