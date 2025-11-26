import { createSignal, createMemo, onMount, Show } from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke, Channel } from "@tauri-apps/api/core";
import PatternControls from "./PatternControls";
import ActionButtons from "./ActionButtons";
import FileRemoverList from "./FileRemoverList";
import DeleteConfirmModal from "./DeleteConfirmModal";
import DeleteResultModal from "./DeleteResultModal";
import ProgressBar from "../ui/ProgressBar";
import {
  PatternType,
  FileMatchItem,
  DeleteResult,
  DeleteProgress,
  SearchProgressEvent,
  SearchProgressState,
  StreamingDeleteProgress,
} from "./types";
import { validatePattern, checkDangerousOperation } from "./utils";
import Header from "../ui/Header";

// localStorage keys for preferences
const STORAGE_KEYS = {
  patternType: "fileRemover.patternType",
  includeSubdirs: "fileRemover.includeSubdirs",
  deleteEmptyDirs: "fileRemover.deleteEmptyDirs",
  caseSensitive: "fileRemover.caseSensitive",
};

export default function FileRemover() {
  // Pattern state
  const [pattern, setPattern] = createSignal("");
  const [patternType, setPatternType] = createSignal<PatternType>("simple");
  const [caseSensitive, setCaseSensitive] = createSignal(false);
  const [includeSubdirs, setIncludeSubdirs] = createSignal(true);
  const [deleteEmptyDirs, setDeleteEmptyDirs] = createSignal(false);
  const [patternError, setPatternError] = createSignal<string | undefined>();

  // File state
  const [files, setFiles] = createSignal<FileMatchItem[]>([]);
  const [basePath, setBasePath] = createSignal<string>("");
  const [isSearching, setIsSearching] = createSignal(false);
  const [isDeleting, setIsDeleting] = createSignal(false);

  // Modal state
  const [showDeleteModal, setShowDeleteModal] = createSignal(false);
  const [deleteResult, setDeleteResult] = createSignal<DeleteResult | null>(
    null
  );
  const [dangerWarning, setDangerWarning] = createSignal<string | undefined>();

  // Progress state for large deletions
  const [deleteProgress, setDeleteProgress] =
    createSignal<DeleteProgress | null>(null);

  // Search progress state for streaming feedback
  const [searchProgress, setSearchProgress] = createSignal<SearchProgressState>(
    {
      phase: "idle",
      filesFound: 0,
    }
  );

  // Computed
  const selectedFiles = createMemo(() => files().filter((f) => f.selected));
  const selectedCount = createMemo(() => selectedFiles().length);
  const canSearch = createMemo(() => !!basePath() && !!pattern().trim());

  // Load preferences from localStorage on mount
  onMount(() => {
    try {
      const savedType = localStorage.getItem(STORAGE_KEYS.patternType);
      if (savedType && ["simple", "extension", "regex"].includes(savedType)) {
        setPatternType(savedType as PatternType);
      }

      const savedSubdirs = localStorage.getItem(STORAGE_KEYS.includeSubdirs);
      if (savedSubdirs !== null) {
        setIncludeSubdirs(savedSubdirs === "true");
      }

      const savedEmptyDirs = localStorage.getItem(STORAGE_KEYS.deleteEmptyDirs);
      if (savedEmptyDirs !== null) {
        setDeleteEmptyDirs(savedEmptyDirs === "true");
      }

      const savedCaseSensitive = localStorage.getItem(
        STORAGE_KEYS.caseSensitive
      );
      if (savedCaseSensitive !== null) {
        setCaseSensitive(savedCaseSensitive === "true");
      }
    } catch {
      // localStorage not available, ignore
    }
  });

  // Save preferences when they change
  function savePreferences() {
    try {
      localStorage.setItem(STORAGE_KEYS.patternType, patternType());
      localStorage.setItem(
        STORAGE_KEYS.includeSubdirs,
        String(includeSubdirs())
      );
      localStorage.setItem(
        STORAGE_KEYS.deleteEmptyDirs,
        String(deleteEmptyDirs())
      );
      localStorage.setItem(STORAGE_KEYS.caseSensitive, String(caseSensitive()));
    } catch {
      // localStorage not available, ignore
    }
  }

  // Wrapped setters that save preferences
  function handleSetPatternType(value: PatternType) {
    setPatternType(value);
    savePreferences();
  }

  function handleSetIncludeSubdirs(value: boolean) {
    setIncludeSubdirs(value);
    savePreferences();
  }

  function handleSetDeleteEmptyDirs(value: boolean) {
    setDeleteEmptyDirs(value);
    savePreferences();
  }

  function handleSetCaseSensitive(value: boolean) {
    setCaseSensitive(value);
    savePreferences();
  }

  // Actions
  async function selectFolder() {
    const selected = await open({
      multiple: false,
      directory: true,
    });

    if (selected && typeof selected === "string") {
      setBasePath(selected);
    }
  }

  async function searchFiles() {
    if (!canSearch()) return;

    // Validate pattern first
    const validationError = validatePattern(pattern(), patternType());
    if (validationError) {
      setPatternError(validationError);
      return;
    }

    setIsSearching(true);
    setPatternError(undefined);
    setSearchProgress({ phase: "scanning", filesFound: 0 });

    try {
      // Create a channel for receiving progress events
      const progressChannel = new Channel<SearchProgressEvent>();

      progressChannel.onmessage = (event: SearchProgressEvent) => {
        switch (event.type) {
          case "started":
            setSearchProgress({ phase: "scanning", filesFound: 0 });
            break;
          case "scanning":
            setSearchProgress({
              phase: "scanning",
              currentDir: event.currentDir,
              filesFound: event.filesFound,
            });
            break;
          case "matching":
            setSearchProgress({
              phase: "matching",
              filesFound: event.totalFiles,
              totalFiles: event.totalFiles,
            });
            break;
          case "completed":
            setSearchProgress({
              phase: "completed",
              filesFound: event.matchesFound,
              matchesFound: event.matchesFound,
            });
            break;
        }
      };

      const results = await invoke<any[]>("search_files_with_progress", {
        basePath: basePath(),
        pattern: pattern(),
        patternType: patternType(),
        includeSubdirs: includeSubdirs(),
        caseSensitive: caseSensitive(),
        onProgress: progressChannel,
      });

      setFiles(
        results.map((r) => ({
          path: r.path,
          name: r.name,
          matchRanges: r.match_ranges,
          size: r.size,
          isDirectory: r.is_directory,
          selected: true,
        }))
      );
    } catch (error) {
      setPatternError(String(error));
      setFiles([]);
    } finally {
      setIsSearching(false);
      // Reset progress after a short delay to allow user to see "completed"
      setTimeout(() => {
        setSearchProgress({ phase: "idle", filesFound: 0 });
      }, 500);
    }
  }

  function toggleSelect(path: string) {
    setFiles((prev) =>
      prev.map((f) => (f.path === path ? { ...f, selected: !f.selected } : f))
    );
  }

  function selectAll() {
    setFiles((prev) => prev.map((f) => ({ ...f, selected: true })));
  }

  function deselectAll() {
    setFiles((prev) => prev.map((f) => ({ ...f, selected: false })));
  }

  function invertSelection() {
    setFiles((prev) => prev.map((f) => ({ ...f, selected: !f.selected })));
  }

  function removeFromList(paths: string[]) {
    const pathSet = new Set(paths);
    setFiles((prev) => prev.filter((f) => !pathSet.has(f.path)));
  }

  function clearList() {
    setFiles([]);
  }

  function handleDeleteClick() {
    // Check for dangerous operations
    const warning = checkDangerousOperation(selectedFiles(), basePath());
    setDangerWarning(warning);
    setShowDeleteModal(true);
  }

  async function handleDelete() {
    const filesToDelete = selectedFiles();
    if (filesToDelete.length === 0) return;

    setIsDeleting(true);
    setDeleteProgress(null);

    try {
      let result: DeleteResult;

      // Use streaming progress for any deletion with more than 10 files
      // This provides better UX feedback during deletion
      if (filesToDelete.length > 10) {
        result = await handleDeleteWithProgress(filesToDelete);
      } else {
        result = await invoke<DeleteResult>("batch_delete", {
          files: filesToDelete.map((f) => f.path),
          deleteEmptyDirs: deleteEmptyDirs(),
        });
      }

      // Remove successfully deleted files from the list
      const successSet = new Set(result.successful);
      setFiles((prev) => prev.filter((f) => !successSet.has(f.path)));

      // Close delete confirm modal and show result modal
      setShowDeleteModal(false);
      setDeleteResult(result);
    } catch (error) {
      setShowDeleteModal(false);
      setDeleteResult({
        successful: [],
        failed: [[basePath(), String(error)]],
        deletedDirs: [],
      });
    } finally {
      setIsDeleting(false);
      setDeleteProgress(null);
    }
  }

  async function handleDeleteWithProgress(
    filesToDelete: FileMatchItem[]
  ): Promise<DeleteResult> {
    const total = filesToDelete.length;
    setDeleteProgress({ current: 0, total });

    // Create a channel for receiving progress events
    const progressChannel = new Channel<StreamingDeleteProgress>();

    progressChannel.onmessage = (event: StreamingDeleteProgress) => {
      switch (event.type) {
        case "started":
          setDeleteProgress({ current: 0, total: event.totalFiles });
          break;
        case "progress":
          setDeleteProgress({ current: event.current, total: event.total });
          break;
        case "completed":
          setDeleteProgress({ current: total, total });
          break;
      }
    };

    const result = await invoke<DeleteResult>("batch_delete_with_progress", {
      files: filesToDelete.map((f) => f.path),
      deleteEmptyDirs: deleteEmptyDirs(),
      onProgress: progressChannel,
    });

    return result;
  }

  // Helper function to get progress label text
  function getSearchProgressLabel(): string {
    const progress = searchProgress();
    switch (progress.phase) {
      case "scanning":
        if (progress.currentDir) {
          // Extract just the folder name from the path for cleaner display
          const parts = progress.currentDir.split(/[/\\]/);
          const folderName = parts[parts.length - 1] || progress.currentDir;
          return `Scanning: ${folderName}... (${progress.filesFound.toLocaleString()} files found)`;
        }
        return `Scanning directories... (${progress.filesFound.toLocaleString()} files found)`;
      case "matching":
        return "Matching patterns...";
      case "completed":
        return `Found ${
          progress.matchesFound?.toLocaleString() ?? 0
        } matching files`;
      default:
        return "";
    }
  }

  return (
    <div class="min-h-screen bg-base-300 p-8">
      <div class="max-w-7xl mx-auto">
        <Header
          title="File Remover"
          subtitle="Delete files matching a pattrn"
        />

        <div class="space-y-6 mt-4">
          <PatternControls
            pattern={pattern()}
            setPattern={setPattern}
            patternType={patternType()}
            setPatternType={handleSetPatternType}
            caseSensitive={caseSensitive()}
            setCaseSensitive={handleSetCaseSensitive}
            includeSubdirs={includeSubdirs()}
            setIncludeSubdirs={handleSetIncludeSubdirs}
            deleteEmptyDirs={deleteEmptyDirs()}
            setDeleteEmptyDirs={handleSetDeleteEmptyDirs}
            patternError={patternError()}
            basePath={basePath()}
            onSelectFolder={selectFolder}
            onSearch={searchFiles}
            isSearching={isSearching()}
            canSearch={canSearch()}
          />

          {/* Search Progress */}
          <Show when={isSearching() && searchProgress().phase !== "idle"}>
            <div class="bg-base-200 rounded-box p-4 shadow-lg">
              <ProgressBar
                label={getSearchProgressLabel()}
                current={searchProgress().filesFound}
                total={searchProgress().totalFiles}
                showCount={searchProgress().phase === "matching"}
                showPercentage={searchProgress().phase === "matching"}
                indeterminate={searchProgress().phase === "scanning"}
                variant="primary"
              />
            </div>
          </Show>

          <ActionButtons
            onDelete={handleDeleteClick}
            onClearList={clearList}
            selectedCount={selectedCount()}
            totalCount={files().length}
          />

          <FileRemoverList
            files={files()}
            onToggleSelect={toggleSelect}
            onSelectAll={selectAll}
            onDeselectAll={deselectAll}
            onInvertSelection={invertSelection}
            onRemoveFromList={removeFromList}
          />
        </div>

        <DeleteConfirmModal
          isOpen={showDeleteModal()}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          files={selectedFiles()}
          isDeleting={isDeleting()}
          dangerWarning={dangerWarning()}
          progress={deleteProgress()}
        />

        <DeleteResultModal
          result={deleteResult()}
          onClose={() => setDeleteResult(null)}
        />
      </div>
    </div>
  );
}
