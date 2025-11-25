import { createSignal, createMemo, createEffect, Accessor } from "solid-js";

export interface FileSelectionItem {
  path: string;
}

export interface UseFileSelectionResult<T extends FileSelectionItem> {
  /** Currently selected file paths */
  selectedPaths: Accessor<Set<string>>;
  /** Toggle selection for a single file */
  toggleSelection: (path: string) => void;
  /** Toggle selection for all files */
  toggleSelectAll: () => void;
  /** Whether all files are selected */
  allSelected: Accessor<boolean>;
  /** Whether some (but not all) files are selected */
  someSelected: Accessor<boolean>;
  /** Clear all selections */
  clearSelection: () => void;
  /** Select specific paths */
  selectPaths: (paths: string[]) => void;
  /** Ref callback for the "select all" checkbox to handle indeterminate state */
  setSelectAllCheckbox: (el: HTMLInputElement) => void;
}

/**
 * Hook for managing file selection state in a list.
 * Handles select all, individual selection, and indeterminate checkbox state.
 *
 * @param files - Accessor for the array of file items (must have a `path` property)
 * @returns Selection state and handlers
 */
export function useFileSelection<T extends FileSelectionItem>(
  files: Accessor<T[]>
): UseFileSelectionResult<T> {
  const [selectedPaths, setSelectedPaths] = createSignal<Set<string>>(
    new Set()
  );
  const [selectAllCheckbox, setSelectAllCheckbox] =
    createSignal<HTMLInputElement>();

  const toggleSelection = (path: string) => {
    const current = new Set<string>(selectedPaths());
    if (current.has(path)) {
      current.delete(path);
    } else {
      current.add(path);
    }
    setSelectedPaths(current);
  };

  const toggleSelectAll = () => {
    const current = selectedPaths();
    if (current.size === files().length) {
      setSelectedPaths(new Set<string>());
    } else {
      setSelectedPaths(new Set<string>(files().map((f) => f.path)));
    }
  };

  const allSelected = createMemo(
    () => files().length > 0 && selectedPaths().size === files().length
  );

  const someSelected = createMemo(
    () => selectedPaths().size > 0 && selectedPaths().size < files().length
  );

  const clearSelection = () => {
    setSelectedPaths(new Set<string>());
  };

  const selectPaths = (paths: string[]) => {
    setSelectedPaths(new Set<string>(paths));
  };

  // Handle indeterminate state for the select-all checkbox
  createEffect(() => {
    const el = selectAllCheckbox();
    if (el) {
      el.indeterminate = someSelected();
    }
  });

  return {
    selectedPaths,
    toggleSelection,
    toggleSelectAll,
    allSelected,
    someSelected,
    clearSelection,
    selectPaths,
    setSelectAllCheckbox,
  };
}

