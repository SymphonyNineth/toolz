import { createSignal, createMemo, onMount } from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import Header from "./Header";
import PatternControls from "./PatternControls";
import ActionButtons from "./ActionButtons";
import FileRemoverList from "./FileRemoverList";
import DeleteConfirmModal from "./DeleteConfirmModal";
import DeleteResultModal from "./DeleteResultModal";
import { PatternType, FileMatchItem, DeleteResult, DeleteProgress } from "./types";
import { validatePattern, checkDangerousOperation } from "./utils";

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
  const [deleteResult, setDeleteResult] = createSignal<DeleteResult | null>(null);
  const [dangerWarning, setDangerWarning] = createSignal<string | undefined>();

  // Progress state for large deletions
  const [deleteProgress, setDeleteProgress] = createSignal<DeleteProgress | null>(null);

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

      const savedCaseSensitive = localStorage.getItem(STORAGE_KEYS.caseSensitive);
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
      localStorage.setItem(STORAGE_KEYS.includeSubdirs, String(includeSubdirs()));
      localStorage.setItem(STORAGE_KEYS.deleteEmptyDirs, String(deleteEmptyDirs()));
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

  async function searchFilesWithRetry(maxRetries = 2): Promise<any[]> {
    let lastError: Error | null = null;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await invoke<any[]>("search_files_by_pattern", {
          basePath: basePath(),
          pattern: pattern(),
          patternType: patternType(),
          includeSubdirs: includeSubdirs(),
          caseSensitive: caseSensitive(),
        });
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    }

    throw lastError;
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

    try {
      const results = await searchFilesWithRetry();

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

      // For large deletions (>50 files), use batch processing with progress
      if (filesToDelete.length > 50) {
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

  async function handleDeleteWithProgress(filesToDelete: FileMatchItem[]): Promise<DeleteResult> {
    const total = filesToDelete.length;
    const batchSize = 50;
    const results: DeleteResult = { successful: [], failed: [], deletedDirs: [] };

    setDeleteProgress({ current: 0, total });

    for (let i = 0; i < filesToDelete.length; i += batchSize) {
      const batch = filesToDelete.slice(i, i + batchSize).map((f) => f.path);
      const isLastBatch = i + batchSize >= filesToDelete.length;

      const batchResult = await invoke<DeleteResult>("batch_delete", {
        files: batch,
        deleteEmptyDirs: isLastBatch && deleteEmptyDirs(), // Only clean up on last batch
      });

      results.successful.push(...batchResult.successful);
      results.failed.push(...batchResult.failed);
      if (isLastBatch) {
        results.deletedDirs.push(...batchResult.deletedDirs);
      }

      setDeleteProgress({ current: Math.min(i + batchSize, total), total });
    }

    return results;
  }

  return (
    <div class="min-h-screen bg-base-300 p-8">
      <div class="max-w-7xl mx-auto">
        <Header />

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
