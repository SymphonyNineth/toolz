import { Component, Show } from "solid-js";
import Input from "../ui/Input";
import Checkbox from "../ui/Checkbox";
import Tooltip from "../ui/Tooltip";
import { ErrorIcon } from "../ui/icons";
import { PatternType } from "./types";

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
}

const PatternControls: Component<PatternControlsProps> = (props) => {
  const patternPlaceholder = () => {
    switch (props.patternType) {
      case "simple":
        return "Enter text to match in file names...";
      case "extension":
        return ".tmp, .log, .bak";
      case "regex":
        return "Enter regex pattern...";
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

  return (
    <div class="card bg-base-100 shadow-lg">
      <div class="card-body">
        <h3 class="card-title text-lg mb-4">Pattern Settings</h3>

        {/* Pattern Type Selector */}
        <div class="mb-4">
          <label class="label">
            <span class="label-text font-medium">Pattern Type</span>
          </label>
          <div class="join flex gap-2">
            <button
              class={`btn join-item ${props.patternType === "simple" ? "btn-active" : ""}`}
              onClick={() => props.setPatternType("simple")}
            >
              Simple
            </button>
            <button
              class={`btn join-item ${props.patternType === "extension" ? "btn-active" : ""}`}
              onClick={() => props.setPatternType("extension")}
            >
              Extension
            </button>
            <button
              class={`btn join-item ${props.patternType === "regex" ? "btn-active" : ""}`}
              onClick={() => props.setPatternType("regex")}
            >
              Regex
            </button>
          </div>
        </div>

        {/* Pattern Input */}
        <div class="mb-4">
          <label class="label">
            <span class="label-text font-medium">Pattern</span>
            <Tooltip content={patternHelp()}>
              <span class="label-text-alt cursor-help">ⓘ</span>
            </Tooltip>
          </label>
          <Input
            type="text"
            value={props.pattern}
            onInput={(e) => props.setPattern(e.currentTarget.value)}
            placeholder={patternPlaceholder()}
            class={`w-full ${props.patternError ? "input-error" : ""}`}
          />
          <Show when={props.patternError}>
            <div class="flex items-center gap-1 mt-1 text-error text-sm">
              <ErrorIcon size="xs" />
              <span>{props.patternError}</span>
            </div>
          </Show>
        </div>

        {/* Options */}
        <div class="grid grid-cols-2 gap-4">
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
      </div>
    </div>
  );
};

export default PatternControls;

