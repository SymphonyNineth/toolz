import { Component } from "solid-js";
import Input from "../ui/Input";
import Checkbox from "../ui/Checkbox";

interface RenamerControlsProps {
    findText: string;
    setFindText: (text: string) => void;
    replaceText: string;
    setReplaceText: (text: string) => void;
    caseSensitive: boolean;
    setCaseSensitive: (sensitive: boolean) => void;
}

const RenamerControls: Component<RenamerControlsProps> = (props) => {
    return (
        <div class="flex flex-col gap-4 w-full max-w-2xl mx-auto p-4 bg-base-200 rounded-box shadow-lg">
            <Input
                id="find-text"
                label="Find"
                value={props.findText}
                onInput={(e) => props.setFindText(e.currentTarget.value)}
                placeholder="Text to find..."
            />

            <Input
                id="replace-text"
                label="Replace with"
                value={props.replaceText}
                onInput={(e) => props.setReplaceText(e.currentTarget.value)}
                placeholder="Replacement text..."
            />

            <Checkbox
                label="Case Sensitive"
                checked={props.caseSensitive}
                onChange={(e) => props.setCaseSensitive(e.currentTarget.checked)}
            />
        </div>
    );
};

export default RenamerControls;
