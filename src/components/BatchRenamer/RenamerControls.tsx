import { Component, Show, createSignal } from "solid-js";
import Input from "../ui/Input";
import Checkbox from "../ui/Checkbox";
import RegexCheatSheet from "./RegexCheatSheet";

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
}

const RenamerControls: Component<RenamerControlsProps> = (props) => {
    const [showCheatSheet, setShowCheatSheet] = createSignal(false);

    return (
        <>
            <div class="w-full max-w-4xl mx-auto p-6 bg-base-200 rounded-box shadow-lg">
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
                            <div class="mt-2 text-sm text-error">
                                ⚠️ Invalid regex: {props.regexError}
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
                    <Show when={props.regexMode}>
                        <button
                            onClick={() => setShowCheatSheet(true)}
                            class="btn btn-sm btn-outline btn-info"
                        >
                            📖 Regex Cheat Sheet
                        </button>
                    </Show>
                </div>
            </div>

            <RegexCheatSheet
                isOpen={showCheatSheet()}
                onClose={() => setShowCheatSheet(false)}
            />
        </>
    );
};

export default RenamerControls;
