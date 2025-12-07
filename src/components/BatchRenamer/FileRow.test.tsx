import { render, screen } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import FileRow from "./FileRow";
import type { FileRowData } from "./types";

vi.mock("@tauri-apps/plugin-opener", () => ({
  revealItemInDir: vi.fn(),
}));

const baseFile: FileRowData = {
  path: "/tmp/file.txt",
  name: "file.txt",
  newName: "file.txt",
  status: "idle",
};

describe("FileRow", () => {
  it("renders diff segments for original name", () => {
    render(() => (
      <table>
        <tbody>
          <FileRow
            file={{
              ...baseFile,
              originalSegments: [
                { segmentType: "unchanged", text: "file" },
                { segmentType: "removed", text: ".old" },
              ],
              modifiedSegments: [{ segmentType: "unchanged", text: "file" }],
              previewType: "diff",
            }}
            isSelected={false}
            onToggleSelection={() => { }}
          />
        </tbody>
      </table>
    ));

    expect(screen.getByText(".old")).toBeInTheDocument();
  });

  it("renders regex group highlighting when previewType is regexGroups", () => {
    render(() => (
      <table>
        <tbody>
          <FileRow
            file={{
              ...baseFile,
              originalSegments: [
                { type: "text", value: "prefix_" },
                { type: "group", id: 1, text: "captured" },
              ],
              modifiedSegments: [{ segmentType: "unchanged", text: "prefix_captured" }],
              previewType: "regexGroups",
            }}
            isSelected={false}
            onToggleSelection={() => { }}
          />
        </tbody>
      </table>
    ));

    expect(screen.getByText("prefix_")).toBeInTheDocument();
    expect(screen.getByText("captured")).toHaveAttribute("title", "Group 1");
  });
});

