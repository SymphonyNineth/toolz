import { render, screen, fireEvent, waitFor } from '@solidjs/testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockInvoke } from '../../setupTests';
import BatchRenamer from './index';
import * as dialog from '@tauri-apps/plugin-dialog';

// Mock the dialog plugin
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
  save: vi.fn(),
  message: vi.fn(),
}));

describe('BatchRenamer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(() => <BatchRenamer />);
    expect(screen.getByText('Batch File Renamer')).toBeInTheDocument();
    expect(screen.getByText('Select Files')).toBeInTheDocument();
  });

  it('handles file selection and renaming', async () => {
    // Mock file selection
    const mockOpen = vi.mocked(dialog.open);
    mockOpen.mockResolvedValue(['/path/to/file1.txt', '/path/to/file2.txt']);

    // Mock rename invoke
    mockInvoke.mockResolvedValue(['file1_new.txt', 'file2.txt']);

    render(() => <BatchRenamer />);

    // Click Select Files
    const selectButton = screen.getByText('Select Files');
    fireEvent.click(selectButton);

    // Wait for files to be displayed
    await waitFor(() => {
      expect(screen.getAllByText('file1.txt')[0]).toBeInTheDocument();
      expect(screen.getAllByText('file2.txt')[0]).toBeInTheDocument();
    });

    // Enter find text
    const findInput = screen.getByLabelText('Find');
    fireEvent.input(findInput, { target: { value: 'file' } });

    // Enter replace text
    const replaceInput = screen.getByLabelText('Replace with');
    fireEvent.input(replaceInput, { target: { value: 'test' } });

    // Click Rename Files
    const renameButton = screen.getByText('Rename Files');
    expect(renameButton).not.toBeDisabled();
    fireEvent.click(renameButton);

    // Verify invoke was called
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('batch_rename', {
        files: [
          ['/path/to/file1.txt', '/path/to/test1.txt'],
          ['/path/to/file2.txt', '/path/to/test2.txt'],
        ],
      });
    });
  });
});
