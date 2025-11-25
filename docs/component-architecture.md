# Component Architecture

This document describes the frontend component architecture after the refactoring effort.

## Directory Structure

```
src/
├── components/
│   ├── BatchRenamer/           # Main feature components
│   │   ├── index.tsx           # Main BatchRenamer container
│   │   ├── ActionButtons.tsx   # File/folder selection & rename buttons
│   │   ├── DiffText.tsx        # Diff highlighting for text changes
│   │   ├── FileList.tsx        # File list table with selection
│   │   ├── FileRow.tsx         # Individual file row component
│   │   ├── Header.tsx          # Page header with theme toggle
│   │   ├── NumberingControls.tsx # Numbering & sequencing options panel
│   │   ├── RegexCheatSheet.tsx # Regex reference modal (legacy)
│   │   ├── RegexCheatSheetInline.tsx # Inline collapsible regex reference
│   │   ├── RegexHighlightText.tsx # Regex match highlighting
│   │   ├── RenamerControls.tsx # Find/replace input controls
│   │   ├── StatusIcon.tsx      # Success/error status icons
│   │   └── renamingUtils.ts    # Renaming logic utilities
│   └── ui/                     # Reusable UI components
│       ├── Button.tsx          # DaisyUI button wrapper
│       ├── Checkbox.tsx        # DaisyUI checkbox wrapper
│       ├── icons/              # SVG icon components
│       │   └── index.tsx       # All icons exported from here
│       ├── Input.tsx           # DaisyUI input wrapper
│       ├── Modal.tsx           # Reusable modal dialog
│       ├── ThemeToggle.tsx     # Light/dark theme toggle
│       └── Tooltip.tsx         # Hover tooltip component
├── hooks/
│   └── useFileSelection.ts     # File selection state management
├── utils/
│   ├── diff.ts                 # Diff computation algorithm
│   └── path.ts                 # Cross-platform path utilities
└── App.tsx                     # Root application component
```

## Component Hierarchy

```
App
└── BatchRenamer
    ├── Header
    │   └── ThemeToggle
    │       ├── SunIcon
    │       └── MoonIcon
    ├── RenamerControls
    │   ├── Input (x2)
    │   ├── Checkbox (x3)
    │   └── RegexCheatSheetInline (when regex mode enabled)
    │       ├── ChevronDownIcon / ChevronRightIcon
    │       └── Collapsible content panel
    ├── NumberingControls
    │   ├── ChevronDownIcon / ChevronRightIcon
    │   ├── Checkbox (enable toggle - synced with expansion)
    │   ├── Input (x4: start, increment, padding, separator)
    │   └── Radio buttons (position: start/end/index)
    ├── ActionButtons
    │   ├── Button (x3) with icons (FilesIcon, FolderOpenIcon, RefreshIcon)
    │   ├── Tooltip
    │   └── Summary bar (file counts)
    └── FileList
        └── FileRow (foreach file)
            ├── StatusIcon
            │   ├── SuccessIcon
            │   └── ErrorIcon
            ├── FolderIcon
            ├── DiffText / RegexHighlightText
            └── WarningIcon
```

## Reusable UI Components

### Icons (`src/components/ui/icons/`)

All SVG icons are centralized with consistent sizing and styling:

- `SuccessIcon` - Checkmark for successful operations
- `ErrorIcon` - X icon for errors
- `WarningIcon` - Triangle warning for collisions
- `FolderIcon` - Folder for "show in finder" action
- `FolderOpenIcon` - Open folder for select folders button
- `FilesIcon` - Document icon for select files button
- `RefreshIcon` - Refresh arrows for rename button
- `SunIcon` - Light theme indicator
- `MoonIcon` - Dark theme indicator
- `CloseIcon` - Modal close button
- `ChevronDownIcon` - Expanded state indicator
- `ChevronRightIcon` - Collapsed state indicator

Usage:

```tsx
import { SuccessIcon, ErrorIcon, ChevronDownIcon } from "../ui/icons";

<SuccessIcon size="md" class="text-success" />
<ErrorIcon size="lg" class="text-error" />
<ChevronDownIcon size="sm" />
```

Sizes: `xs`, `sm`, `md` (default), `lg`, `xl`

### Modal (`src/components/ui/Modal.tsx`)

Reusable modal dialog with backdrop click-to-close:

```tsx
<Modal isOpen={isOpen()} onClose={handleClose} title="Dialog Title" maxWidth="lg">
  <div class="p-6">Modal content here</div>
</Modal>
```

Props:
- `isOpen: boolean` - Controls visibility
- `onClose: () => void` - Close callback
- `title?: string` - Optional header title
- `maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "full"`

### Tooltip (`src/components/ui/Tooltip.tsx`)

Hover tooltip with configurable position:

```tsx
<Tooltip content="Tooltip message" position="top">
  <Button>Hover me</Button>
</Tooltip>
```

Props:
- `content: string | JSX.Element` - Tooltip content
- `position?: "top" | "bottom" | "left" | "right"` - Position (default: "top")
- `show?: boolean` - Control visibility (default: shows on hover)

## Custom Hooks

### useFileSelection (`src/hooks/useFileSelection.ts`)

Manages selection state for file lists with support for:
- Individual file selection toggle
- Select all / deselect all
- Indeterminate checkbox state

```tsx
const {
  selectedPaths,
  toggleSelection,
  toggleSelectAll,
  allSelected,
  someSelected,
  clearSelection,
  setSelectAllCheckbox,
} = useFileSelection(() => props.files);
```

## Utility Functions

### Path Utilities (`src/utils/path.ts`)

Cross-platform path manipulation:

- `getFileName(path)` - Extract filename from path
- `getDirectory(path)` - Extract directory from path
- `getPathSeparator(path)` - Get the separator used ("/" or "\\")
- `joinPath(directory, filename)` - Join path parts

### Diff Utilities (`src/utils/diff.ts`)

- `computeDiff(original, modified)` - Character-level diff using LCS algorithm

## Design Principles

1. **Single Responsibility**: Each component does one thing well
2. **Reusability**: UI components are generic and reusable
3. **Separation of Concerns**: Logic (hooks/utils) separated from presentation
4. **DaisyUI Integration**: Components wrap DaisyUI for consistent styling
5. **Type Safety**: Full TypeScript interfaces for all props

