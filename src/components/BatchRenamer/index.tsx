import { createSignal, createMemo } from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import RenamerControls from "./RenamerControls";
import FileList, { FileItem } from "./FileList";
import Button from "../ui/Button";

export default function BatchRenamer() {
    const [selectedPaths, setSelectedPaths] = createSignal<string[]>([]);
    const [findText, setFindText] = createSignal("");
    const [replaceText, setReplaceText] = createSignal("");
    const [caseSensitive, setCaseSensitive] = createSignal(false);

    // Helper to extract filename from path
    const getFileName = (path: string) => {
        // Handle both Windows and Unix separators
        return path.split(/[/\\]/).pop() || path;
    };

    // Helper to get directory from path
    const getDirectory = (path: string) => {
        const separator = path.includes("\\") ? "\\" : "/";
        return path.substring(0, path.lastIndexOf(separator));
    };

    const fileItems = createMemo(() => {
        return selectedPaths().map((path) => {
            const name = getFileName(path);
            let newName = name;

            if (findText()) {
                try {
                    const flags = caseSensitive() ? "g" : "gi";
                    // Escape special regex characters in findText to treat it as literal string
                    const escapedFindText = findText().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(escapedFindText, flags);
                    newName = name.replace(regex, replaceText());
                } catch (e) {
                    // Fallback or ignore invalid regex if we were supporting raw regex
                    console.error("Regex error", e);
                }
            }

            return {
                path,
                name,
                newName,
                status: 'idle',
            } as FileItem;
        });
    });

    async function selectFiles() {
        const selected = await open({
            multiple: true,
            directory: false,
        });

        if (selected) {
            setSelectedPaths(selected as string[]);
        }
    }

    async function handleRename() {
        const filesToRename = fileItems()
            .filter((f) => f.name !== f.newName)
            .map((f) => {
                const dir = getDirectory(f.path);
                const separator = f.path.includes("\\") ? "\\" : "/";
                const newPath = `${dir}${separator}${f.newName}`;
                return [f.path, newPath] as [string, string];
            });

        if (filesToRename.length === 0) return;

        try {
            const result = await invoke<string[]>("batch_rename", { files: filesToRename });
            console.log("Renamed files:", result);

            // Update selected paths to reflect new names so the UI updates
            // We need to map the old paths to new paths in our selectedPaths state
            const newPathsMap = new Map(filesToRename);
            const updatedPaths = selectedPaths().map(path => newPathsMap.get(path) || path);
            setSelectedPaths(updatedPaths);

            // Optional: Clear find/replace or show success message
        } catch (error) {
            console.error("Rename failed:", error);
            alert(`Rename failed: ${error}`);
        }
    }

    return (
        <div class="min-h-screen bg-base-300 p-8">
            <div class="max-w-4xl mx-auto">
                <h2 class="text-3xl font-bold text-center mb-8 text-primary">Batch File Renamer</h2>

                <RenamerControls
                    findText={findText()}
                    setFindText={setFindText}
                    replaceText={replaceText()}
                    setReplaceText={setReplaceText}
                    caseSensitive={caseSensitive()}
                    setCaseSensitive={setCaseSensitive}
                />

                <div class="flex justify-center gap-4 mt-8">
                    <Button
                        onClick={selectFiles}
                        variant="secondary"
                    >
                        Select Files
                    </Button>
                    <Button
                        onClick={handleRename}
                        disabled={fileItems().every(f => f.name === f.newName)}
                        variant="primary"
                    >
                        Rename Files
                    </Button>
                </div>

                <FileList files={fileItems()} />
            </div>
        </div>
    );
}
