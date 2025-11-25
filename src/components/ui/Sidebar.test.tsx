import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@solidjs/testing-library";
import Sidebar, { ToolItem } from "./Sidebar";

describe("Sidebar", () => {
  const mockTools: ToolItem[] = [
    {
      id: "tool-1",
      name: "Tool One",
      icon: <span data-testid="icon-1">📁</span>,
      description: "First tool description",
    },
    {
      id: "tool-2",
      name: "Tool Two",
      icon: <span data-testid="icon-2">🗑️</span>,
      description: "Second tool description",
    },
  ];

  const defaultProps = {
    tools: mockTools,
    activeTool: "tool-1",
    onToolSelect: vi.fn(),
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the app title", () => {
      render(() => <Sidebar {...defaultProps} />);
      expect(screen.getByText("Simple Tools")).toBeInTheDocument();
    });

    it("renders all tools", () => {
      render(() => <Sidebar {...defaultProps} />);
      expect(screen.getByText("Tool One")).toBeInTheDocument();
      expect(screen.getByText("Tool Two")).toBeInTheDocument();
    });

    it("renders tool descriptions", () => {
      render(() => <Sidebar {...defaultProps} />);
      expect(screen.getByText("First tool description")).toBeInTheDocument();
      expect(screen.getByText("Second tool description")).toBeInTheDocument();
    });

    it("renders tool icons", () => {
      render(() => <Sidebar {...defaultProps} />);
      expect(screen.getByTestId("icon-1")).toBeInTheDocument();
      expect(screen.getByTestId("icon-2")).toBeInTheDocument();
    });

    it("renders the tools section header", () => {
      render(() => <Sidebar {...defaultProps} />);
      expect(screen.getByText("Tools")).toBeInTheDocument();
    });
  });

  describe("Active State", () => {
    it("highlights the active tool", () => {
      render(() => <Sidebar {...defaultProps} activeTool="tool-1" />);
      const toolOneButton = screen.getByText("Tool One").closest("button");
      expect(toolOneButton).toHaveClass("bg-primary");
    });

    it("does not highlight inactive tools", () => {
      render(() => <Sidebar {...defaultProps} activeTool="tool-1" />);
      const toolTwoButton = screen.getByText("Tool Two").closest("button");
      expect(toolTwoButton).not.toHaveClass("bg-primary");
    });
  });

  describe("Interactions", () => {
    it("calls onToolSelect when a tool is clicked", async () => {
      const onToolSelect = vi.fn();
      render(() => <Sidebar {...defaultProps} onToolSelect={onToolSelect} />);

      await fireEvent.click(screen.getByText("Tool Two"));
      expect(onToolSelect).toHaveBeenCalledWith("tool-2");
    });

    it("calls onToolSelect with correct tool id", async () => {
      const onToolSelect = vi.fn();
      render(() => <Sidebar {...defaultProps} onToolSelect={onToolSelect} />);

      await fireEvent.click(screen.getByText("Tool One"));
      expect(onToolSelect).toHaveBeenCalledWith("tool-1");

      await fireEvent.click(screen.getByText("Tool Two"));
      expect(onToolSelect).toHaveBeenCalledWith("tool-2");
    });
  });

  describe("Without Descriptions", () => {
    it("renders tools without descriptions", () => {
      const toolsWithoutDesc: ToolItem[] = [
        {
          id: "simple-tool",
          name: "Simple Tool",
          icon: <span>🔧</span>,
        },
      ];

      render(() => (
        <Sidebar
          tools={toolsWithoutDesc}
          activeTool="simple-tool"
          onToolSelect={vi.fn()}
        />
      ));

      expect(screen.getByText("Simple Tool")).toBeInTheDocument();
    });
  });
});

