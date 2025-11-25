import { Component } from "solid-js";
import { TrashIcon } from "../ui/icons";

const Header: Component = () => {
  return (
    <div class="flex items-center gap-3 mb-8">
      <div class="p-2 rounded-lg bg-error/10">
        <TrashIcon size="lg" class="text-error" />
      </div>
      <div>
        <h2 class="text-2xl font-bold text-base-content">File Remover</h2>
        <p class="text-base-content/60">Delete files matching a pattern</p>
      </div>
    </div>
  );
};

export default Header;

