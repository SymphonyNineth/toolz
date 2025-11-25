# Implementation Plan - Phase 4: Polish

## Goal
Refine the user experience and styling by implementing theme support and improving the layout.

## User Review Required
> [!NOTE]
> I will be adding a Theme Toggle button. Please verify if the placement (top-right corner) is acceptable.

## Proposed Changes

### UI Components
#### [NEW] [ThemeToggle.tsx](file:///home/hayk/side-projects/simple-tools/src/components/ui/ThemeToggle.tsx)
- Create a new component to toggle between light and dark themes.
- Persist preference to `localStorage`.
- Apply theme to `html` tag.

### Batch Renamer
#### [MODIFY] [index.tsx](file:///home/hayk/side-projects/simple-tools/src/components/BatchRenamer/index.tsx)
- Add `ThemeToggle` component.
- Increase container width (`max-w-6xl`).
- Improve spacing and hierarchy.
- Initialize theme on mount.

#### [MODIFY] [RenamerControls.tsx](file:///home/hayk/side-projects/simple-tools/src/components/BatchRenamer/RenamerControls.tsx)
- Change layout to `grid` for better responsiveness (side-by-side inputs on larger screens).

#### [MODIFY] [FileList.tsx](file:///home/hayk/side-projects/simple-tools/src/components/BatchRenamer/FileList.tsx)
- Add `max-height` and `overflow-y-auto` to the container to handle large lists with scrolling.
- Improve table styling.

## Verification Plan

### Automated Tests
- None planned for UI changes.

### Manual Verification
- **Theme Toggle**: Click the toggle and verify the theme changes between light and dark. Reload the page to verify persistence.
- **Layout**: Resize the window to verify responsiveness.
- **Scrolling**: Add a large number of files (or mock them) and verify the list scrolls vertically while the header remains visible (if sticky) or the page scrolls naturally.
