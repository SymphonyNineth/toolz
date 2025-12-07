import {
  createSignal,
  createMemo,
  createEffect,
  Show,
  onCleanup,
  batch,
  on,
} from "solid-js";
import { open, confirm } from "@tauri-apps/plugin-dialog";
import { invoke, Channel } from "@tauri-apps/api/core";
import { nanoid } from "nanoid";
import RenamerControls from "./RenamerControls";
import NumberingControls from "./NumberingControls";
import FileList, { FileItem } from "./FileList";
import Header from "../ui/Header";
import ActionButtons from "./ActionButtons";
import ProgressBar from "../ui/ProgressBar";
import {
  applyNumbering,
  getNumberingInfo,
  NumberingOptions,
  DEFAULT_NUMBERING_OPTIONS,
} from "./renamingUtils";
import { getDirectory, joinPath } from "../../utils/path";
import { debounce } from "../../utils/debounce.util";
import {
  ListProgressEvent,
  ListProgressState,
  RenameProgressEvent,
  RenameProgressState,
  FilePreviewResult,
  DiffOptions,
} from "./types";

/**
 * Maximum recommended file count before showing a warning.
 * Beyond this, performance may degrade significantly.
 */
const MAX_RECOMMENDED_FILES = 10000;

/**
 * Absolute maximum file count to prevent memory exhaustion.
 * Users cannot load more than this.
 */
const ABSOLUTE_MAX_FILES = 1_000_000;

export default function BatchRenamer() {
  // Backend-managed files currently loaded into the session
  const [filePaths, setFilePaths] = createSignal<string[]>([]);
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

  // Backend file previews - computed by backend compute_previews command
  const [filePreviews, setFilePreviews] = createSignal<FilePreviewResult[]>([]);
  const [debouncedInputs, setDebouncedInputs] = createSignal({
    find: "",
    replace: "",
  });

  const updateDebouncedInputs = debounce(
    (next: { find: string; replace: string }) => setDebouncedInputs(next),
    300
  );

  createEffect(
    on(
      [findText, replaceText],
      ([find, replace]) => {
        updateDebouncedInputs({ find, replace });
      },
      { defer: true }
    )
  );

  // Compute previews from backend when inputs change
  createEffect(() => {
    const files = filePaths();
    const { find, replace } = debouncedInputs();
    const caseSens = caseSensitive();
    const regex = regexMode();
    const firstOnly = replaceFirstOnly();
    const inclExt = includeExt();

    if (files.length === 0) {
      setFilePreviews([]);
      return;
    }

    const options: DiffOptions = {
      find,
      replace,
      caseSensitive: caseSens,
      regexMode: regex,
      replaceFirstOnly: firstOnly,
      includeExt: inclExt,
    };

    invoke<FilePreviewResult[]>("compute_previews", { files, options })
      .then((results) => {
        console.log("[DEBUG] Computed preview results:", results);
        setFilePreviews(results);
        setRegexError(undefined);
      })
      .catch((error) => {
        console.error("[DEBUG] Failed to compute previews:", error);
        if (regex && String(error).includes("regex")) {
          setRegexError(String(error));
        }
        setFilePreviews([]);
      });
  });

  // Track active operation IDs for cancellation
  let activeListOperationId: string | null = null;
  let activeRenameOperationId: string | null = null;

  /**
   * Clears all file-related state to release memory.
   * Called on cancellation and component unmount.
   */
  const clearAllState = () => {
    batch(() => {
      setFilePaths([]);
      setStatusMap({});
      setListProgress({ phase: "idle", filesFound: 0 });
      setRenameProgress({ phase: "idle", current: 0, total: 0 });
    });
  };

  // Cancel any active operations when component unmounts
  onCleanup(() => {
    if (activeListOperationId) {
      invoke("cancel_operation", { operationId: activeListOperationId }).catch(
        () => {}
      );
    }
    if (activeRenameOperationId) {
      invoke("cancel_operation", {
        operationId: activeRenameOperationId,
      }).catch(() => {});
    }
    // Clear state to release memory
    clearAllState();
  });

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
    const previews = filePreviews();
    const currentStatus = statusMap();
    const numOptions = numberingOptions();

    // Merge backend previews with numbering and status
    return previews.map((preview, index) => {
      // Apply numbering after backend find/replace
      const numberingInfo = getNumberingInfo(
        preview.newName,
        index,
        numOptions
      );
      const finalNewName = applyNumbering(preview.newName, index, numOptions);

      return {
        path: preview.path,
        name: preview.name,
        newName: finalNewName,
        nameAfterReplace: preview.newName,
        status: currentStatus[preview.path] || "idle",
        hasCollision: preview.hasCollision,
        numberingInfo,
        // Pass backend segments for rendering
        originalSegments: preview.originalSegments,
        modifiedSegments: preview.modifiedSegments,
        previewType: preview.type,
      } as FileItem;
    });
  });

  async function selectFiles() {
    const selected = await open({
      multiple: true,
      directory: false,
    });

    if (selected) {
      const newPaths = Array.isArray(selected) ? selected : [selected];
      const allPaths = [...filePaths(), ...newPaths];
      const uniquePaths = Array.from(new Set(allPaths));
      setFilePaths(uniquePaths);
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
        let wasCancelled = false;
        let hitFileLimit = false;

        setIsScanning(true);
        setListProgress({ phase: "scanning", filesFound: 0 });

        for (const folder of folders) {
          // Generate operation ID for this folder scan
          const operationId = nanoid();
          activeListOperationId = operationId;

          // Create a channel for receiving progress events
          const progressChannel = new Channel<ListProgressEvent>();

          progressChannel.onmessage = (event: ListProgressEvent) => {
            switch (event.type) {
              case "started":
                setListProgress({ phase: "scanning", filesFound: 0 });
                break;
              case "scanning": {
                const currentTotal = allFiles.length + event.filesFound;
                setListProgress({
                  phase: "scanning",
                  currentDir: event.currentDir,
                  filesFound: currentTotal,
                });
                // Check if we're approaching file limits during scan
                if (currentTotal > ABSOLUTE_MAX_FILES && !hitFileLimit) {
                  hitFileLimit = true;
                  // Cancel the operation if we hit the absolute limit
                  invoke("cancel_operation", { operationId }).catch(() => {});
                }
                break;
              }
              case "completed":
                // Progress will be updated with actual files count
                break;
              case "cancelled":
                wasCancelled = true;
                setListProgress({
                  phase: "cancelled",
                  filesFound: allFiles.length,
                });
                break;
            }
          };

          const files = await invoke<string[]>("list_files_with_progress", {
            dirPath: folder,
            operationId,
            onProgress: progressChannel,
          });

          activeListOperationId = null;

          // Stop processing if cancelled
          if (wasCancelled) {
            break;
          }

          // Check file limit
          const potentialTotal = allFiles.length + files.length;
          if (potentialTotal > ABSOLUTE_MAX_FILES) {
            const allowedCount = ABSOLUTE_MAX_FILES - allFiles.length;
            if (allowedCount > 0) {
              allFiles.push(...files.slice(0, allowedCount));
            }
            hitFileLimit = true;
            break;
          }

          allFiles.push(...files);
        }

        // Show warning if we hit the file limit
        if (hitFileLimit) {
          alert(
            `Maximum file limit of ${ABSOLUTE_MAX_FILES.toLocaleString()} reached. Some files were not added to prevent memory issues.`
          );
        }

        // Only update if not cancelled
        if (!wasCancelled) {
          // Check if we're adding a lot of files and warn the user
          const existingCount = filePaths().length;
          const newTotal = existingCount + allFiles.length;

          if (
            newTotal > MAX_RECOMMENDED_FILES &&
            existingCount <= MAX_RECOMMENDED_FILES
          ) {
            const shouldContinue = await confirm(
              `You are about to load ${newTotal.toLocaleString()} files. Loading more than ${MAX_RECOMMENDED_FILES.toLocaleString()} files may cause performance issues. Continue?`,
              { title: "Large File Count Warning", kind: "warning" }
            );
            if (!shouldContinue) {
              setListProgress({ phase: "idle", filesFound: 0 });
              setIsScanning(false);
              return;
            }
          }

          const existingPaths = filePaths();
          const existingSet = new Set(existingPaths);
          const newPaths: string[] = [];

          for (const file of allFiles) {
            if (!existingSet.has(file)) {
              existingSet.add(file);
              newPaths.push(file);
            }
          }

          // Only update if we have new files
          if (newPaths.length > 0) {
            const combined = existingPaths.concat(newPaths);
            setFilePaths(combined);
            setStatusMap({});
          }

          const finalCount = existingPaths.length + newPaths.length;
          setListProgress({
            phase: "completed",
            filesFound: finalCount,
            totalFiles: finalCount,
          });
        } else {
          // Clear state on cancellation to release memory
          clearAllState();
        }
      } catch (error) {
        console.error("Failed to list files:", error);
        // Check if it's a stack overflow or memory error
        const errorStr = String(error);
        if (
          errorStr.includes("Maximum call stack") ||
          errorStr.includes("memory")
        ) {
          alert(
            `Failed to list files: The directory contains too many files. Try selecting a smaller folder or use the file remover to search for specific files.`
          );
          clearAllState();
        } else {
          alert(`Failed to list files: ${error}`);
        }
      } finally {
        activeListOperationId = null;
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
    let wasCancelled = false;

    try {
      let result: string[];

      // Use streaming progress for larger rename operations
      if (filesToRename.length > 10) {
        // Generate operation ID for cancellation support
        const operationId = nanoid();
        activeRenameOperationId = operationId;

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
            case "cancelled":
              wasCancelled = true;
              setRenameProgress({
                phase: "cancelled",
                current: 0,
                total: 0,
              });
              break;
          }
        };

        result = await invoke<string[]>("batch_rename_with_progress", {
          files: filesToRename,
          operationId,
          onProgress: progressChannel,
        });

        activeRenameOperationId = null;
      } else {
        result = await invoke<string[]>("batch_rename", {
          files: filesToRename,
        });
      }

      // Only update state if not cancelled
      if (!wasCancelled) {
        console.log("Renamed files:", result);

        const newPathsMap = new Map(filesToRename);
        const newStatusMap: Record<string, "idle" | "success" | "error"> = {};

        const updatedPaths = filePaths().map((path) => {
          const newPath = newPathsMap.get(path);
          if (newPath) {
            newStatusMap[newPath] = "success";
            return newPath;
          }
          return path;
        });

        setFilePaths(updatedPaths);
        setStatusMap(newStatusMap);
      }
    } catch (error) {
      console.error("Rename failed:", error);
      const errorStatusMap: Record<string, "idle" | "success" | "error"> = {};
      filesToRename.forEach(([oldPath]) => {
        errorStatusMap[oldPath] = "error";
      });
      setStatusMap(errorStatusMap);
      alert(`Rename failed: ${error}`);
    } finally {
      activeRenameOperationId = null;
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
    const newPaths = filePaths().filter((path) => !pathsSet.has(path));
    setFilePaths(newPaths);

    const newStatusMap = { ...statusMap() };
    pathsToRemove.forEach((path) => {
      delete newStatusMap[path];
    });
    setStatusMap(newStatusMap);
  };

  /**
   * Cancels the active folder scan operation.
   */
  const handleCancelScan = () => {
    if (activeListOperationId) {
      invoke("cancel_operation", { operationId: activeListOperationId }).catch(
        () => {}
      );
      activeListOperationId = null;
    }
  };

  /**
   * Cancels the active rename operation.
   */
  const handleCancelRename = () => {
    if (activeRenameOperationId) {
      invoke("cancel_operation", {
        operationId: activeRenameOperationId,
      }).catch(() => {});
      activeRenameOperationId = null;
    }
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
          onCancelScan={handleCancelScan}
          onCancelRename={handleCancelRename}
          renameDisabledReason={renameDisabledReason()}
          filesToRenameCount={filesToRenameCount()}
          totalFilesCount={filePaths().length}
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
              variant="primary"
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
              variant="primary"
            />
          </div>
        </Show>

        <FileList files={fileItems()} onRemoveFiles={handleRemoveFiles} />
      </div>
    </div>
  );
}
