import { createSignal, Match, Switch } from "solid-js";
import "./App.css";
import BatchRenamer from "./components/BatchRenamer";
import FileRemover from "./components/FileRemover";
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
        <Switch
          fallback={<div class="p-8">Select a tool from the sidebar</div>}
        >
          <Match when={activeTool() === "batch-renamer"}>
            <BatchRenamer />
          </Match>
          <Match when={activeTool() === "file-remover"}>
            <FileRemover />
          </Match>
        </Switch>
      </main>
    </div>
  );
}

export default App;
