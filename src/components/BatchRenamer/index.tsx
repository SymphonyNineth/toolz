import { createSignal, createMemo } from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import RenamerControls from "./RenamerControls";
import NumberingControls from "./NumberingControls";
import FileList, { FileItem } from "./FileList";
import Header from "./Header";
import ActionButtons from "./ActionButtons";
import {
  calculateNewName,
  getRegexMatches,
  getReplacementSegments,
  applyNumbering,
  NumberingOptions,
  DEFAULT_NUMBERING_OPTIONS,
} from "./renamingUtils";
import { getFileName, getDirectory, joinPath } from "../../utils/path";

export default function BatchRenamer() {
  const [selectedPaths, setSelectedPaths] = createSignal<string[]>([]);
  const [findText, setFindText] = createSignal("");
  const [replaceText, setReplaceText] = createSignal("");
  const [caseSensitive, setCaseSensitive] = createSignal(false);
  const [regexMode, setRegexMode] = createSignal(false);
  const [replaceFirstOnly, setReplaceFirstOnly] = createSignal(false);
  const [includeExt, setIncludeExt] = createSignal(false);
  const [regexError, setRegexError] = createSignal<string | undefined>(
    undefined
  );
  const [statusMap, setStatusMap] = createSignal<
    Record<string, "idle" | "success" | "error">
  >({});
  const [numberingOptions, setNumberingOptions] =
    createSignal<NumberingOptions>(DEFAULT_NUMBERING_OPTIONS);
  const [numberingExpanded, setNumberingExpanded] = createSignal(false);

  // Reset status when controls change
  const updateFindText = (text: string) => {
    setFindText(text);
    setStatusMap({});
    setRegexError(undefined);
  };

  const updateReplaceText = (text: string) => {
    setReplaceText(text);
    setStatusMap({});
  };

  const updateCaseSensitive = (val: boolean) => {
    setCaseSensitive(val);
    setStatusMap({});
  };

  const updateRegexMode = (val: boolean) => {
    setRegexMode(val);
    setStatusMap({});
    setRegexError(undefined);
  };

  const updateReplaceFirstOnly = (val: boolean) => {
    setReplaceFirstOnly(val);
    setStatusMap({});
  };

  const updateIncludeExt = (val: boolean) => {
    setIncludeExt(val);
    setStatusMap({});
  };

  const updateNumberingOptions = (options: NumberingOptions) => {
    setNumberingOptions(options);
    setStatusMap({});
  };

  const fileItems = createMemo(() => {
    const paths = selectedPaths();
    const currentStatus = statusMap();
    const numOptions = numberingOptions();

    // First pass: calculate new names
    const items = paths.map((path, index) => {
      const name = getFileName(path);
      let newName = name;

      const result = calculateNewName(
        name,
        findText(),
        replaceText(),
        caseSensitive(),
        regexMode(),
        replaceFirstOnly(),
        includeExt()
      );

      newName = result.newName;

      if (result.error) {
        if (regexMode()) {
          setRegexError(result.error);
        }
        console.error("Renaming error", result.error);
      } else if (regexMode()) {
        setRegexError(undefined);
      }

      // Apply numbering after find/replace
      newName = applyNumbering(newName, index, numOptions);

      let regexMatches;
      let newNameRegexMatches;
      if (!result.error && regexMode() && findText()) {
        try {
          const flags = caseSensitive()
            ? replaceFirstOnly()
              ? ""
              : "g"
            : replaceFirstOnly()
              ? "i"
              : "gi";
          const regex = new RegExp(findText(), flags);

          let targetText = name;
          if (!includeExt()) {
            const lastDotIndex = name.lastIndexOf(".");
            if (lastDotIndex > 0) {
              targetText = name.substring(0, lastDotIndex);
            }
          }

          regexMatches = getRegexMatches(targetText, regex);

          const replacementResult = getReplacementSegments(
            targetText,
            regex,
            replaceText()
          );
          newNameRegexMatches = replacementResult.segments;
        } catch {
          // Ignore errors, they are handled above
        }
      }

      return { path, name, newName, regexMatches, newNameRegexMatches };
    });

    // Check for collisions
    const newNameCounts = new Map<string, number>();
    items.forEach((item) => {
      const fullNewPath = item.path.replace(item.name, item.newName);
      newNameCounts.set(fullNewPath, (newNameCounts.get(fullNewPath) || 0) + 1);
    });

    return items.map((item) => {
      const fullNewPath = item.path.replace(item.name, item.newName);
      const hasCollision = newNameCounts.get(fullNewPath)! > 1;

      return {
        ...item,
        status: currentStatus[item.path] || "idle",
        hasCollision,
      } as FileItem & { hasCollision: boolean };
    });
  });

  async function selectFiles() {
    const selected = await open({
      multiple: true,
      directory: false,
    });

    if (selected) {
      const newPaths = Array.isArray(selected) ? selected : [selected];
      const allPaths = [...selectedPaths(), ...newPaths];
      const uniquePaths = Array.from(new Set(allPaths));
      setSelectedPaths(uniquePaths);
      setStatusMap({});
    }
  }

  async function selectFolders() {
    const selected = await open({
      multiple: true,
      directory: true,
    });

    if (selected) {
      try {
        const folders = Array.isArray(selected) ? selected : [selected];
        const allFiles: string[] = [];

        for (const folder of folders) {
          const files = await invoke<string[]>("list_files_recursively", {
            dirPath: folder,
          });
          allFiles.push(...files);
        }

        const allPaths = [...selectedPaths(), ...allFiles];
        const uniquePaths = Array.from(new Set(allPaths));
        setSelectedPaths(uniquePaths);
        setStatusMap({});
      } catch (error) {
        console.error("Failed to list files:", error);
        alert(`Failed to list files: ${error}`);
      }
    }
  }

  async function handleRename() {
    const filesToRename = fileItems()
      .filter((f) => f.name !== f.newName)
      .map((f) => {
        const dir = getDirectory(f.path);
        const newPath = joinPath(dir, f.newName);
        return [f.path, newPath] as [string, string];
      });

    if (filesToRename.length === 0) return;

    try {
      const result = await invoke<string[]>("batch_rename", {
        files: filesToRename,
      });
      console.log("Renamed files:", result);

      const newPathsMap = new Map(filesToRename);
      const newStatusMap: Record<string, "idle" | "success" | "error"> = {};

      const updatedPaths = selectedPaths().map((path) => {
        const newPath = newPathsMap.get(path);
        if (newPath) {
          newStatusMap[newPath] = "success";
          return newPath;
        }
        return path;
      });

      setSelectedPaths(updatedPaths);
      setStatusMap(newStatusMap);
    } catch (error) {
      console.error("Rename failed:", error);
      const errorStatusMap: Record<string, "idle" | "success" | "error"> = {};
      filesToRename.forEach(([oldPath]) => {
        errorStatusMap[oldPath] = "error";
      });
      setStatusMap(errorStatusMap);
      alert(`Rename failed: ${error}`);
    }
  }

  const filesToRenameCount = createMemo(
    () => fileItems().filter((f) => f.name !== f.newName).length
  );

  const renameDisabledReason = createMemo(() => {
    const items = fileItems();

    if (regexError()) {
      return `Invalid regex: ${regexError()}`;
    }

    const hasChanges = items.some((f) => f.name !== f.newName);
    if (!hasChanges) {
      return "No changes to apply";
    }

    const hasCollisions = items.some((f) => f.hasCollision);
    if (hasCollisions) {
      return "Cannot rename: duplicate file names detected";
    }

    return undefined;
  });

  const handleRemoveFiles = (pathsToRemove: string[]) => {
    const pathsSet = new Set(pathsToRemove);
    const newPaths = selectedPaths().filter((path) => !pathsSet.has(path));
    setSelectedPaths(newPaths);

    const newStatusMap = { ...statusMap() };
    pathsToRemove.forEach((path) => {
      delete newStatusMap[path];
    });
    setStatusMap(newStatusMap);
  };

  return (
    <div class="min-h-screen bg-base-300 p-8">
      <div class="max-w-7xl mx-auto">
        <Header />

        <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-4">
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
            replaceFirstOnly={replaceFirstOnly()}
            setReplaceFirstOnly={updateReplaceFirstOnly}
            includeExt={includeExt()}
            setIncludeExt={updateIncludeExt}
          />

          <NumberingControls
            options={numberingOptions()}
            onOptionsChange={updateNumberingOptions}
            isExpanded={numberingExpanded()}
            onToggle={() => setNumberingExpanded(!numberingExpanded())}
          />
        </div>

        <ActionButtons
          onSelectFiles={selectFiles}
          onSelectFolders={selectFolders}
          onRename={handleRename}
          renameDisabledReason={renameDisabledReason()}
          filesToRenameCount={filesToRenameCount()}
          totalFilesCount={selectedPaths().length}
        />

        <FileList files={fileItems()} onRemoveFiles={handleRemoveFiles} />
      </div>
    </div>
  );
}
