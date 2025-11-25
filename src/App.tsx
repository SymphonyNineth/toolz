import { createSignal, Match, Switch } from "solid-js";
import "./App.css";
import BatchRenamer from "./components/BatchRenamer";
import Sidebar, { ToolItem } from "./components/ui/Sidebar";
import { RenameIcon, TrashIcon } from "./components/ui/icons";

// Define available tools
const tools: ToolItem[] = [
  {
    id: "batch-renamer",
    name: "Batch Renamer",
    icon: <RenameIcon size="sm" />,
    description: "Rename multiple files",
  },
  {
    id: "file-remover",
    name: "File Remover",
    icon: <TrashIcon size="sm" />,
    description: "Delete files by pattern",
  },
];

function App() {
  const [activeTool, setActiveTool] = createSignal("batch-renamer");

  return (
    <div class="flex min-h-screen bg-base-300">
      <Sidebar
        tools={tools}
        activeTool={activeTool()}
        onToolSelect={setActiveTool}
      />
      <main class="flex-1 overflow-auto">
        <Switch fallback={<div class="p-8">Select a tool from the sidebar</div>}>
          <Match when={activeTool() === "batch-renamer"}>
            <BatchRenamer />
          </Match>
          <Match when={activeTool() === "file-remover"}>
            <FileRemoverPlaceholder />
          </Match>
        </Switch>
      </main>
    </div>
  );
}

// Placeholder component for File Remover (to be implemented)
function FileRemoverPlaceholder() {
  return (
    <div class="min-h-screen bg-base-300 p-8">
      <div class="max-w-7xl mx-auto">
        <div class="flex items-center gap-3 mb-8">
          <div class="p-2 rounded-lg bg-error/10">
            <TrashIcon size="lg" class="text-error" />
          </div>
          <div>
            <h2 class="text-2xl font-bold text-base-content">File Remover</h2>
            <p class="text-base-content/60">Delete files matching a pattern</p>
          </div>
        </div>
        
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body items-center text-center py-16">
            <div class="p-4 rounded-full bg-base-200 mb-4">
              <svg
                class="w-16 h-16 text-base-content/30"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-base-content mb-2">
              Coming Soon
            </h3>
            <p class="text-base-content/60 max-w-md">
              The File Remover tool will allow you to select files by pattern 
              (name matching, extension, regex) and delete them in bulk with 
              preview and confirmation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
