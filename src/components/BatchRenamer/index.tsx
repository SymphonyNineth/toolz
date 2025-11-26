import { createSignal, createMemo, Show } from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke, Channel } from "@tauri-apps/api/core";
import RenamerControls from "./RenamerControls";
import NumberingControls from "./NumberingControls";
import FileList, { FileItem } from "./FileList";
import Header from "../ui/Header";
import ActionButtons from "./ActionButtons";
import ProgressBar from "../ui/ProgressBar";
import {
  calculateNewName,
  getRegexMatches,
  getReplacementSegments,
  applyNumbering,
  getNumberingInfo,
  NumberingOptions,
  DEFAULT_NUMBERING_OPTIONS,
} from "./renamingUtils";
import { getFileName, getDirectory, joinPath } from "../../utils/path";
import {
  ListProgressEvent,
  ListProgressState,
  RenameProgressEvent,
  RenameProgressState,
} from "./types";

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

  // Progress states
  const [isScanning, setIsScanning] = createSignal(false);
  const [isRenaming, setIsRenaming] = createSignal(false);
  const [listProgress, setListProgress] = createSignal<ListProgressState>({
    phase: "idle",
    filesFound: 0,
  });
  const [renameProgress, setRenameProgress] = createSignal<RenameProgressState>(
    {
      phase: "idle",
      current: 0,
      total: 0,
    }
  );

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

      // Store name after find/replace (before numbering) for diff display
      const nameAfterReplace = newName;

      // Get numbering info before applying (for color-coded preview)
      const numberingInfo = getNumberingInfo(newName, index, numOptions);

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

      return {
        path,
        name,
        newName,
        nameAfterReplace,
        regexMatches,
        newNameRegexMatches,
        numberingInfo,
      };
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

        setIsScanning(true);
        setListProgress({ phase: "scanning", filesFound: 0 });

        for (const folder of folders) {
          // Create a channel for receiving progress events
          const progressChannel = new Channel<ListProgressEvent>();

          progressChannel.onmessage = (event: ListProgressEvent) => {
            switch (event.type) {
              case "started":
                setListProgress({ phase: "scanning", filesFound: 0 });
                break;
              case "scanning":
                setListProgress({
                  phase: "scanning",
                  currentDir: event.currentDir,
                  filesFound: allFiles.length + event.filesFound,
                });
                break;
              case "completed":
                // Progress will be updated with actual files count
                break;
            }
          };

          const files = await invoke<string[]>("list_files_with_progress", {
            dirPath: folder,
            onProgress: progressChannel,
          });
          allFiles.push(...files);
        }

        setListProgress({
          phase: "completed",
          filesFound: allFiles.length,
          totalFiles: allFiles.length,
        });

        const allPaths = [...selectedPaths(), ...allFiles];
        const uniquePaths = Array.from(new Set(allPaths));
        setSelectedPaths(uniquePaths);
        setStatusMap({});
      } catch (error) {
        console.error("Failed to list files:", error);
        alert(`Failed to list files: ${error}`);
      } finally {
        setIsScanning(false);
        // Reset progress after a short delay
        setTimeout(() => {
          setListProgress({ phase: "idle", filesFound: 0 });
        }, 500);
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

    setIsRenaming(true);

    try {
      let result: string[];

      // Use streaming progress for larger rename operations
      if (filesToRename.length > 10) {
        setRenameProgress({
          phase: "renaming",
          current: 0,
          total: filesToRename.length,
        });

        const progressChannel = new Channel<RenameProgressEvent>();

        progressChannel.onmessage = (event: RenameProgressEvent) => {
          switch (event.type) {
            case "started":
              setRenameProgress({
                phase: "renaming",
                current: 0,
                total: event.totalFiles,
              });
              break;
            case "progress":
              setRenameProgress({
                phase: "renaming",
                current: event.current,
                total: event.total,
                currentPath: event.currentPath,
              });
              break;
            case "completed":
              setRenameProgress({
                phase: "completed",
                current: event.successful,
                total: event.successful + event.failed,
              });
              break;
          }
        };

        result = await invoke<string[]>("batch_rename_with_progress", {
          files: filesToRename,
          onProgress: progressChannel,
        });
      } else {
        result = await invoke<string[]>("batch_rename", {
          files: filesToRename,
        });
      }

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
    } finally {
      setIsRenaming(false);
      // Reset progress after a short delay
      setTimeout(() => {
        setRenameProgress({ phase: "idle", current: 0, total: 0 });
      }, 500);
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

  // Helper function to get list progress label
  function getListProgressLabel(): string {
    const progress = listProgress();
    switch (progress.phase) {
      case "scanning":
        if (progress.currentDir) {
          const parts = progress.currentDir.split(/[/\\]/);
          const folderName = parts[parts.length - 1] || progress.currentDir;
          return `Scanning: ${folderName}... (${progress.filesFound.toLocaleString()} files found)`;
        }
        return `Scanning directories... (${progress.filesFound.toLocaleString()} files found)`;
      case "completed":
        return `Found ${
          progress.totalFiles?.toLocaleString() ??
          progress.filesFound.toLocaleString()
        } files`;
      default:
        return "";
    }
  }

  // Helper function to get rename progress label
  function getRenameProgressLabel(): string {
    const progress = renameProgress();
    switch (progress.phase) {
      case "renaming":
        return "Renaming files...";
      case "completed":
        return `Renamed ${progress.current.toLocaleString()} files`;
      default:
        return "";
    }
  }

  return (
    <div class="min-h-screen bg-base-300 p-8">
      <div class="max-w-7xl mx-auto">
        <Header title="File Renamer" subtitle="Rename files in bulk" />

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
          isScanning={isScanning()}
          isRenaming={isRenaming()}
        />

        {/* Folder Scanning Progress */}
        <Show when={isScanning() && listProgress().phase !== "idle"}>
          <div class="bg-base-200 rounded-box p-4 shadow-lg mt-4">
            <ProgressBar
              label={getListProgressLabel()}
              current={listProgress().filesFound}
              showCount={false}
              indeterminate={true}
              variant="secondary"
            />
          </div>
        </Show>

        {/* Rename Progress */}
        <Show when={isRenaming() && renameProgress().phase !== "idle"}>
          <div class="bg-base-200 rounded-box p-4 shadow-lg mt-4">
            <ProgressBar
              label={getRenameProgressLabel()}
              current={renameProgress().current}
              total={renameProgress().total}
              showCount={true}
              showPercentage={true}
              indeterminate={false}
              variant="accent"
            />
          </div>
        </Show>

        <FileList files={fileItems()} onRemoveFiles={handleRemoveFiles} />
      </div>
    </div>
  );
}
