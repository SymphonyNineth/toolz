import { createSignal, createMemo } from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import Header from "./Header";
import PatternControls from "./PatternControls";
import { PatternType, FileMatchItem } from "./types";
// import ActionButtons from "./ActionButtons";
// import FileRemoverList from "./FileRemoverList";
// import DeleteConfirmModal from "./DeleteConfirmModal";

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
  const [_isDeleting, setIsDeleting] = createSignal(false);

  // Modal state
  const [_showDeleteModal, setShowDeleteModal] = createSignal(false);

  // Computed
  const selectedFiles = createMemo(() => files().filter((f) => f.selected));
  const selectedCount = createMemo(() => selectedFiles().length);
  const totalSize = createMemo(() =>
    selectedFiles().reduce((sum, f) => sum + f.size, 0)
  );

  // Actions
  async function selectFolder() {
    const selected = await open({
      multiple: false,
      directory: true,
    });

    if (selected && typeof selected === "string") {
      setBasePath(selected);
      if (pattern()) {
        await searchFiles();
      }
    }
  }

  async function searchFiles() {
    if (!basePath() || !pattern()) return;

    setIsSearching(true);
    setPatternError(undefined);

    try {
      const results = await invoke<any[]>("search_files_by_pattern", {
        basePath: basePath(),
        pattern: pattern(),
        patternType: patternType(),
        includeSubdirs: includeSubdirs(),
        caseSensitive: caseSensitive(),
      });

      setFiles(
        results.map((r) => ({
          path: r.path,
          name: r.name,
          matchRanges: r.match_ranges,
          size: r.size,
          isDirectory: r.is_directory,
          selected: true, // Select all by default
        }))
      );
    } catch (error) {
      setPatternError(String(error));
      setFiles([]);
    } finally {
      setIsSearching(false);
    }
  }

  // Toggle selection for a single file
  function toggleFileSelection(path: string) {
    setFiles((prev) =>
      prev.map((f) => (f.path === path ? { ...f, selected: !f.selected } : f))
    );
  }

  // Select/deselect all files
  function toggleAllFiles(selected: boolean) {
    setFiles((prev) => prev.map((f) => ({ ...f, selected })));
  }

  // Delete selected files
  async function deleteSelectedFiles() {
    const filesToDelete = selectedFiles().map((f) => f.path);
    if (filesToDelete.length === 0) return;

    setIsDeleting(true);

    try {
      await invoke("delete_files", {
        files: filesToDelete,
        deleteEmptyDirs: deleteEmptyDirs(),
      });

      // Remove deleted files from list
      const deletedPaths = new Set(filesToDelete);
      setFiles((prev) => prev.filter((f) => !deletedPaths.has(f.path)));
      setShowDeleteModal(false);
    } catch (error) {
      console.error("Delete failed:", error);
      setPatternError(`Delete failed: ${String(error)}`);
    } finally {
      setIsDeleting(false);
    }
  }

  // Expose these for future components
  const _actions = {
    selectFolder,
    searchFiles,
    toggleFileSelection,
    toggleAllFiles,
    deleteSelectedFiles,
  };

  const _state = {
    files,
    basePath,
    isSearching,
    selectedCount,
    totalSize,
  };

  return (
    <div class="min-h-screen bg-base-300 p-8">
      <div class="max-w-7xl mx-auto">
        <Header />

        <div class="grid grid-cols-1 gap-6 mt-4">
          <PatternControls
            pattern={pattern()}
            setPattern={setPattern}
            patternType={patternType()}
            setPatternType={setPatternType}
            caseSensitive={caseSensitive()}
            setCaseSensitive={setCaseSensitive}
            includeSubdirs={includeSubdirs()}
            setIncludeSubdirs={setIncludeSubdirs}
            deleteEmptyDirs={deleteEmptyDirs()}
            setDeleteEmptyDirs={setDeleteEmptyDirs}
            patternError={patternError()}
          />

          {/* TODO: ActionButtons */}
          {/* TODO: FileRemoverList */}
          {/* TODO: DeleteConfirmModal */}
        </div>
      </div>
    </div>
  );
}

