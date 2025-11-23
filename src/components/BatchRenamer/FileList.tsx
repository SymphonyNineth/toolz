import { Component, For } from "solid-js";

export interface FileItem {
    path: string;
    name: string;
    newName: string;
    status: 'idle' | 'success' | 'error';
}

interface FileListProps {
    files: FileItem[];
}

const FileList: Component<FileListProps> = (props) => {
    return (
        <div class="w-full max-w-4xl mx-auto mt-6 overflow-x-auto bg-base-100 rounded-box shadow">
            <table class="table table-zebra w-full">
                <thead>
                    <tr>
                        <th>Original Name</th>
                        <th>New Name</th>
                    </tr>
                </thead>
                <tbody>
                    <For each={props.files} fallback={
                        <tr>
                            <td colspan="2" class="text-center py-8 text-base-content/60">
                                No files selected
                            </td>
                        </tr>
                    }>
                        {(file) => (
                            <tr class="hover">
                                <td class="font-mono text-sm truncate max-w-xs" title={file.path}>
                                    {file.name}
                                </td>
                                <td class="font-mono text-sm truncate max-w-xs">
                                    <span
                                        classList={{
                                            "text-success font-bold": file.name !== file.newName,
                                            "text-base-content": file.name === file.newName
                                        }}
                                    >
                                        {file.newName}
                                    </span>
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
