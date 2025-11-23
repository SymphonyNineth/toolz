import { render, screen, fireEvent } from '@solidjs/testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FileList, { FileItem } from './FileList';
import * as opener from '@tauri-apps/plugin-opener';

// Mock the opener plugin
vi.mock('@tauri-apps/plugin-opener', () => ({
  revealItemInDir: vi.fn(),
}));

describe('FileList', () => {
  const mockFiles: FileItem[] = [
    {
      path: '/path/to/file1.txt',
      name: 'file1.txt',
      newName: 'new_file1.txt',
      status: 'idle',
    },
    {
      path: '/path/to/file2.png',
      name: 'file2.png',
      newName: 'file2.png',
      status: 'success',
    },
    {
      path: '/path/to/file3.jpg',
      name: 'file3.jpg',
      newName: 'file3_v2.jpg',
      status: 'error',
      hasCollision: true,
    },
  ];

  const mockOnRemoveFiles = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no files are provided', () => {
    render(() => <FileList files={[]} />);
    expect(screen.getByText('No files selected')).toBeInTheDocument();
  });

  it('renders a list of files', () => {
    render(() => <FileList files={mockFiles} />);
    const rows = screen.getAllByRole('row');

    // Check file1
    expect(rows[1]).toHaveTextContent('file1.txt');

    // Check file2
    expect(rows[2]).toHaveTextContent('file2.png');

    // Check file3
    // Use flexible matching for text content as it might be split
    expect(rows[3].textContent?.replace(/\s+/g, '')).toContain('file3.jpg');
  });

  it('displays original and new names', () => {
    render(() => <FileList files={mockFiles} />);
    // Check for original names
    expect(screen.getAllByText('file1.txt')[0]).toBeInTheDocument();
    // Check for new names by inspecting the table rows directly
    const rows = screen.getAllByRole('row');
    // Row 0 is header. Row 1 is file1. Row 2 is file2. Row 3 is file3.

    // File 1: new_file1.txt
    const file1Row = rows[1];
    const file1NewNameCell = file1Row.querySelectorAll('td')[4];
    expect(file1NewNameCell).toHaveTextContent('new_file1.txt');

    // File 3: file3_v2.jpg
    const file3Row = rows[3];
    const file3NewNameCell = file3Row.querySelectorAll('td')[4];
    // Use flexible matching for text content
    expect(file3NewNameCell.textContent?.replace(/\s+/g, '')).toContain('file3_v2.jpg');
  });

  it('displays collision warning', () => {
    render(() => <FileList files={mockFiles} />);
    // The collision warning is an icon with a tooltip.
    // We can check for the tooltip text or the class indicating collision.
    // The new name container has 'text-error font-bold' class when collision exists.
    // We can also check for the tooltip trigger.
    const collisionIcon = screen.getByTitle('/path/to/file3.jpg').parentElement?.querySelector('.text-error');
    expect(collisionIcon).toBeInTheDocument();
  });

  it('calls onRemoveFiles when remove selected is clicked', () => {
    render(() => <FileList files={mockFiles} onRemoveFiles={mockOnRemoveFiles} />);

    // Select first file
    const checkboxes = screen.getAllByRole('checkbox');
    // First checkbox is "Select All", subsequent are file checkboxes
    fireEvent.click(checkboxes[1]); // Select file1

    const removeButton = screen.getByText(/Remove Selected/);
    expect(removeButton).not.toBeDisabled();

    fireEvent.click(removeButton);
    expect(mockOnRemoveFiles).toHaveBeenCalledWith(['/path/to/file1.txt']);
  });

  it('calls onRemoveFiles with multiple paths when bulk remove is triggered', () => {
    render(() => <FileList files={mockFiles} onRemoveFiles={mockOnRemoveFiles} />);

    // Select All
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);

    const removeButton = screen.getByText(/Remove Selected/);
    fireEvent.click(removeButton);

    expect(mockOnRemoveFiles).toHaveBeenCalledWith([
      '/path/to/file1.txt',
      '/path/to/file2.png',
      '/path/to/file3.jpg',
    ]);
  });

  it('calls onRemoveFiles when clear all is clicked', () => {
    render(() => <FileList files={mockFiles} onRemoveFiles={mockOnRemoveFiles} />);

    const clearAllButton = screen.getByText(/Clear All/);
    fireEvent.click(clearAllButton);

    expect(mockOnRemoveFiles).toHaveBeenCalledWith([
      '/path/to/file1.txt',
      '/path/to/file2.png',
      '/path/to/file3.jpg',
    ]);
  });

  it('calls onRemoveFiles when clear renamed is clicked', () => {
    render(() => <FileList files={mockFiles} onRemoveFiles={mockOnRemoveFiles} />);

    const clearRenamedButton = screen.getByText(/Clear Renamed/);
    expect(clearRenamedButton).not.toBeDisabled();
    fireEvent.click(clearRenamedButton);

    // Only file2.png has status 'success'
    expect(mockOnRemoveFiles).toHaveBeenCalledWith(['/path/to/file2.png']);
  });

  it('calls revealItemInDir when show in folder is clicked', () => {
    const { container } = render(() => <FileList files={mockFiles} />);

    // Find the show in folder button for the first file
    // The button is inside a div with data-tip="Show in folder"
    // Since there are multiple, we pick the first one
    const showButton = container.querySelectorAll('[data-tip="Show in folder"] button')[0];
    fireEvent.click(showButton);

    expect(opener.revealItemInDir).toHaveBeenCalledWith('/path/to/file1.txt');
  });

  it('handles indeterminate checkbox state', () => {
    render(() => <FileList files={mockFiles} />);
    const checkboxes = screen.getAllByRole('checkbox');
    const selectAllCheckbox = checkboxes[0] as HTMLInputElement;
    const firstFileCheckbox = checkboxes[1];

    // Initially not indeterminate
    expect(selectAllCheckbox.indeterminate).toBe(false);

    // Select one file
    fireEvent.click(firstFileCheckbox);

    // Should be indeterminate
    expect(selectAllCheckbox.indeterminate).toBe(true);

    // Select all files (by clicking the remaining unchecked ones)
    checkboxes.slice(1).forEach(cb => {
       if (!(cb as HTMLInputElement).checked) fireEvent.click(cb);
    });

    // Should not be indeterminate (checked instead)
    expect(selectAllCheckbox.indeterminate).toBe(false);
    expect(selectAllCheckbox.checked).toBe(true);
  });

  it('disables action buttons correctly', () => {
    // Render with no successfully renamed files
    const noSuccessFiles = mockFiles.map(f => ({ ...f, status: 'idle' as const }));
    render(() => <FileList files={noSuccessFiles} />);

    const clearRenamedButton = screen.getByText(/Clear Renamed/);
    const removeSelectedButton = screen.getByText(/Remove Selected/);

    // Clear Renamed should be disabled because no files have success status
    expect(clearRenamedButton).toBeDisabled();

    // Remove Selected should be disabled because no files are selected
    expect(removeSelectedButton).toBeDisabled();

    // Select a file
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);

    // Remove Selected should now be enabled
    expect(removeSelectedButton).not.toBeDisabled();
  });

  it('renders status icons correctly', () => {
    render(() => <FileList files={mockFiles} />);
    
    const rows = screen.getAllByRole('row');
    
    // File 2 (index 2) is success
    // Status is in the second column (index 1)
    const successCell = rows[2].querySelectorAll('td')[1];
    const successIcon = successCell.querySelector('.text-success');
    expect(successIcon).toBeInTheDocument();

    // File 3 (index 3) is error
    const errorCell = rows[3].querySelectorAll('td')[1];
    const errorIcon = errorCell.querySelector('.text-error');
    expect(errorIcon).toBeInTheDocument();
  });

  it('handles show in folder error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    // Mock rejection
    (opener.revealItemInDir as any).mockRejectedValueOnce(new Error('Open failed'));

    const { container } = render(() => <FileList files={mockFiles} />);
    const showButton = container.querySelectorAll('[data-tip="Show in folder"] button')[0];
    
    fireEvent.click(showButton);

    // Wait for async promise rejection handling
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(consoleSpy).toHaveBeenCalledWith('Failed to open folder:', expect.any(Error));
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to open folder'));

    consoleSpy.mockRestore();
    alertSpy.mockRestore();
  });
});
