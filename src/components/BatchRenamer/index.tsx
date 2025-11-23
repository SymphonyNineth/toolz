import { createSignal, createMemo } from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import RenamerControls from "./RenamerControls";
import FileList, { FileItem } from "./FileList";
import Button from "../ui/Button";
import ThemeToggle from "../ui/ThemeToggle";

export default function BatchRenamer() {
    const [selectedPaths, setSelectedPaths] = createSignal<string[]>([]);
    const [findText, setFindText] = createSignal("");
    const [replaceText, setReplaceText] = createSignal("");
    const [caseSensitive, setCaseSensitive] = createSignal(false);
    const [regexMode, setRegexMode] = createSignal(false);
    const [regexError, setRegexError] = createSignal<string | undefined>(undefined);
    const [statusMap, setStatusMap] = createSignal<Record<string, 'idle' | 'success' | 'error'>>({});

    // Reset status when controls change
    const updateFindText = (text: string) => {
        setFindText(text);
        setStatusMap({});
        setRegexError(undefined);
    };
    const updateReplaceText = (text: string) => { setReplaceText(text); setStatusMap({}); };
    const updateCaseSensitive = (val: boolean) => { setCaseSensitive(val); setStatusMap({}); };
    const updateRegexMode = (val: boolean) => {
        setRegexMode(val);
        setStatusMap({});
        setRegexError(undefined);
    };

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
        const paths = selectedPaths();
        const currentStatus = statusMap();

        // First pass: calculate new names
        const items = paths.map((path) => {
            const name = getFileName(path);
            let newName = name;

            if (findText()) {
                try {
                    let regex: RegExp;

                    if (regexMode()) {
                        // In regex mode, use the pattern directly
                        const flags = caseSensitive() ? "g" : "gi";
                        regex = new RegExp(findText(), flags);
                        // Clear any previous regex error
                        setRegexError(undefined);
                    } else {
                        // In normal mode, escape special characters
                        const flags = caseSensitive() ? "g" : "gi";
                        const escapedFindText = findText().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        regex = new RegExp(escapedFindText, flags);
                    }

                    newName = name.replace(regex, replaceText());
                } catch (e) {
                    if (regexMode()) {
                        // Only show error in regex mode
                        const errorMessage = e instanceof Error ? e.message : String(e);
                        setRegexError(errorMessage);
                    }
                    console.error("Regex error", e);
                }
            }
            return { path, name, newName };
        });

        // Check for collisions
        const newNameCounts = new Map<string, number>();
        items.forEach(item => {
            const fullNewPath = item.path.replace(item.name, item.newName);
            newNameCounts.set(fullNewPath, (newNameCounts.get(fullNewPath) || 0) + 1);
        });

        return items.map(item => {
            const fullNewPath = item.path.replace(item.name, item.newName);
            const hasCollision = newNameCounts.get(fullNewPath)! > 1;

            return {
                ...item,
                status: currentStatus[item.path] || 'idle',
                hasCollision
            } as FileItem & { hasCollision: boolean };
        });
    });

    async function selectFiles() {
        const selected = await open({
            multiple: true,
            directory: false,
        });

        if (selected) {
            setSelectedPaths(selected as string[]);
            setStatusMap({});
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

            const newPathsMap = new Map(filesToRename);
            const newStatusMap: Record<string, 'idle' | 'success' | 'error'> = {};

            const updatedPaths = selectedPaths().map(path => {
                const newPath = newPathsMap.get(path);
                if (newPath) {
                    newStatusMap[newPath] = 'success';
                    return newPath;
                }
                return path;
            });

            setSelectedPaths(updatedPaths);
            setStatusMap(newStatusMap);

        } catch (error) {
            console.error("Rename failed:", error);
            // Mark attempted files as error
            const errorStatusMap: Record<string, 'idle' | 'success' | 'error'> = {};
            filesToRename.forEach(([oldPath]) => {
                errorStatusMap[oldPath] = 'error';
            });
            setStatusMap(errorStatusMap);
            alert(`Rename failed: ${error}`);
        }
    }

    // Check if rename button should be disabled and why
    const renameDisabledReason = createMemo(() => {
        const items = fileItems();

        // Check for regex errors
        if (regexError()) {
            return `Invalid regex: ${regexError()}`;
        }

        // Check if there are any changes
        const hasChanges = items.some(f => f.name !== f.newName);
        if (!hasChanges) {
            return "No changes to apply";
        }

        // Check for collisions
        const hasCollisions = items.some(f => f.hasCollision);
        if (hasCollisions) {
            return "Cannot rename: duplicate file names detected";
        }

        return undefined;
    });

    return (
        <div class="min-h-screen bg-base-300 p-8">
            <div class="max-w-6xl mx-auto">
                <div class="flex justify-between items-center mb-8">
                    <h2 class="text-3xl font-bold text-primary">Batch File Renamer</h2>
                    <ThemeToggle />
                </div>

                <RenamerControls
                    findText={findText()}
                    setFindText={updateFindText}
                    replaceText={replaceText()}
                    setReplaceText={updateReplaceText}
                    caseSensitive={caseSensitive()}
                    setCaseSensitive={updateCaseSensitive}
                    regexMode={regexMode()}
                    setRegexMode={updateRegexMode}
                    regexError={regexError()}
                />

                <div class="flex justify-center gap-4 mt-8">
                    <Button
                        onClick={selectFiles}
                        variant="secondary"
                    >
                        Select Files
                    </Button>
                    <div class="relative inline-block group">
                        <Button
                            onClick={handleRename}
                            disabled={!!renameDisabledReason()}
                            variant="primary"
                        >
                            Rename Files
                        </Button>
                        {renameDisabledReason() && (
                            <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-base-100 text-base-content text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-base-300 z-10">
                                {renameDisabledReason()}
                                <div class="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-base-100"></div>
                            </div>
                        )}
                    </div>
                </div>

                <FileList files={fileItems()} />
            </div>
        </div>
    );
}
