import { createSignal, createMemo } from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import Header from "./Header";
import PatternControls from "./PatternControls";
import ActionButtons from "./ActionButtons";
import FileRemoverList from "./FileRemoverList";
import DeleteConfirmModal from "./DeleteConfirmModal";
import { PatternType, FileMatchItem, DeleteResult } from "./types";

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

  // Computed
  const selectedFiles = createMemo(() => files().filter((f) => f.selected));
  const selectedCount = createMemo(() => selectedFiles().length);
  const canSearch = createMemo(() => !!basePath() && !!pattern().trim());

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

  async function handleDelete() {
    const filesToDelete = selectedFiles().map((f) => f.path);
    if (filesToDelete.length === 0) return;

    setIsDeleting(true);

    try {
      const result = await invoke<DeleteResult>("batch_delete", {
        files: filesToDelete,
        deleteEmptyDirs: deleteEmptyDirs(),
      });

      // Remove successfully deleted files from the list
      const successSet = new Set(result.successful);
      setFiles((prev) => prev.filter((f) => !successSet.has(f.path)));

      // Show results
      if (result.failed.length > 0) {
        const failedMsg = result.failed
          .slice(0, 3)
          .map(([path, err]) => `${path}: ${err}`)
          .join("\n");
        alert(
          `Deleted ${result.successful.length} files.\n` +
            `Failed to delete ${result.failed.length} files:\n${failedMsg}`
        );
      }

      setShowDeleteModal(false);
    } catch (error) {
      alert(`Delete failed: ${error}`);
    } finally {
      setIsDeleting(false);
    }
  }

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

          <ActionButtons
            basePath={basePath()}
            onSelectFolder={selectFolder}
            onSearch={searchFiles}
            onDelete={() => setShowDeleteModal(true)}
            onClearList={clearList}
            isSearching={isSearching()}
            selectedCount={selectedCount()}
            totalCount={files().length}
            canSearch={canSearch()}
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
        />
      </div>
    </div>
  );
}
