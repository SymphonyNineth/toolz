import { Component, Show, createSignal, createEffect } from "solid-js";
import Input from "../ui/Input";
import Checkbox from "../ui/Checkbox";
import RegexCheatSheetInline from "./RegexCheatSheetInline";

interface RenamerControlsProps {
  findText: string;
  setFindText: (text: string) => void;
  replaceText: string;
  setReplaceText: (text: string) => void;
  caseSensitive: boolean;
  setCaseSensitive: (sensitive: boolean) => void;
  regexMode: boolean;
  setRegexMode: (mode: boolean) => void;
  regexError?: string;
  replaceFirstOnly: boolean;
  setReplaceFirstOnly: (firstOnly: boolean) => void;
}

const RenamerControls: Component<RenamerControlsProps> = (props) => {
  const [cheatSheetExpanded, setCheatSheetExpanded] = createSignal(false);

  // Auto-collapse cheat sheet when regex mode is disabled
  createEffect(() => {
    if (!props.regexMode) {
      setCheatSheetExpanded(false);
    }
  });

  return (
    <div class="w-full h-full">
      <div class="p-6 bg-base-200 rounded-box shadow-lg h-full flex flex-col">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Input
              id="find-text"
              label="Find"
              value={props.findText}
              onInput={(e) => props.setFindText(e.currentTarget.value)}
              placeholder={props.regexMode ? "Regex pattern..." : "Text to find..."}
            />
            <Show when={props.regexError}>
              <div class="mt-2 text-sm text-error flex items-center gap-1">
                <span>⚠️</span>
                <span>Invalid regex: {props.regexError}</span>
              </div>
            </Show>
          </div>

          <Input
            id="replace-text"
            label="Replace with"
            value={props.replaceText}
            onInput={(e) => props.setReplaceText(e.currentTarget.value)}
            placeholder={props.regexMode ? "Use $1, $2 for groups..." : "Replacement text..."}
          />
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-4">
          <Checkbox
            label="Case Sensitive"
            checked={props.caseSensitive}
            onChange={(e) => props.setCaseSensitive(e.currentTarget.checked)}
          />
          <Checkbox
            label="Regex Mode"
            checked={props.regexMode}
            onChange={(e) => props.setRegexMode(e.currentTarget.checked)}
          />
          <Checkbox
            label="Replace First Only"
            checked={props.replaceFirstOnly}
            onChange={(e) => props.setReplaceFirstOnly(e.currentTarget.checked)}
          />
        </div>

        {/* Inline Regex Cheat Sheet - visible when regex mode is enabled */}
        <Show when={props.regexMode}>
          <div class="mt-6 pt-4 border-t border-base-content/10">
            <RegexCheatSheetInline
              isExpanded={cheatSheetExpanded()}
              onToggle={() => setCheatSheetExpanded(!cheatSheetExpanded())}
            />
          </div>
        </Show>
      </div>
    </div>
  );
};

export default RenamerControls;
