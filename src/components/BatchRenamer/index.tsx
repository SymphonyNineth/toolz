import { createSignal } from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";

export default function BatchRenamer() {
    const [files, setFiles] = createSignal<string[]>([]);

    async function selectFiles() {
        const selected = await open({
            multiple: true,
            directory: false,
        });

        if (selected) {
            // The selected value can be string[] or null (if cancelled)
            // If multiple is true, it returns string[]
            setFiles(selected as string[]);
        }
    }

    return (
        <div class="batch-renamer">
            <h2>Batch File Renamer</h2>
            <div class="controls">
                <button onClick={selectFiles}>Select Files</button>
            </div>
            <div class="file-list">
                <p>Selected Files: {files().length}</p>
                <ul>
                    {files().map((file) => (
                        <li>{file}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
