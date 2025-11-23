import { Component, For } from "solid-js";

export interface FileItem {
    path: string;
    name: string;
    newName: string;
    status: 'idle' | 'success' | 'error';
    hasCollision?: boolean;
}

interface FileListProps {
    files: FileItem[];
}

const StatusIcon = (props: { status: FileItem['status'] }) => {
    return (
        <div class="w-6 h-6 flex items-center justify-center">
            {props.status === 'success' && (
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-success" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
            )}
            {props.status === 'error' && (
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-error" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
            )}
        </div>
    );
};

const FileList: Component<FileListProps> = (props) => {
    return (
        <div class="w-full max-w-4xl mx-auto mt-6 overflow-x-auto bg-base-100 rounded-box shadow">
            <table class="table table-zebra w-full">
                <thead>
                    <tr>
                        <th class="w-10"></th>
                        <th>Original Name</th>
                        <th>New Name</th>
                    </tr>
                </thead>
                <tbody>
                    <For each={props.files} fallback={
                        <tr>
                            <td colspan="3" class="text-center py-8 text-base-content/60">
                                No files selected
                            </td>
                        </tr>
                    }>
                        {(file) => (
                            <tr class="hover">
                                <td>
                                    <StatusIcon status={file.status} />
                                </td>
                                <td class="font-mono text-sm truncate max-w-xs" title={file.path}>
                                    {file.name}
                                </td>
                                <td class="font-mono text-sm truncate max-w-xs flex items-center gap-2">
                                    <span
                                        classList={{
                                            "text-success font-bold": file.name !== file.newName && !file.hasCollision,
                                            "text-error font-bold": file.hasCollision,
                                            "text-base-content": file.name === file.newName
                                        }}
                                    >
                                        {file.newName}
                                    </span>
                                    {file.hasCollision && (
                                        <div class="tooltip tooltip-left" data-tip="Name collision detected">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-warning" viewBox="0 0 20 20" fill="currentColor">
                                                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                                            </svg>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        )}
                    </For>
                </tbody>
            </table>
        </div>
    );
};

export default FileList;
