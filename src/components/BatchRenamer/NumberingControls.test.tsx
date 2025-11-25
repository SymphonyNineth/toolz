import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import NumberingControls from "./NumberingControls";
import { DEFAULT_NUMBERING_OPTIONS } from "./renamingUtils";

describe("NumberingControls", () => {
  const defaultProps = {
    options: DEFAULT_NUMBERING_OPTIONS,
    onOptionsChange: vi.fn(),
    isExpanded: false,
    onToggle: vi.fn(),
  };

  const renderComponent = (props: Partial<typeof defaultProps> = {}) => {
    return render(() => <NumberingControls {...defaultProps} {...props} />);
  };

  describe("Header", () => {
    it("should render the header with title", () => {
      renderComponent();
      expect(screen.getByText("Numbering & Sequencing")).toBeTruthy();
    });

    it("should show Active badge when numbering is enabled", () => {
      renderComponent({
        options: { ...DEFAULT_NUMBERING_OPTIONS, enabled: true },
      });
      expect(screen.getByText("Active")).toBeTruthy();
    });

    it("should not show Active badge when numbering is disabled", () => {
      renderComponent({
        options: { ...DEFAULT_NUMBERING_OPTIONS, enabled: false },
      });
      expect(screen.queryByText("Active")).toBeNull();
    });

    it("should call onToggle when header is clicked", () => {
      const onToggle = vi.fn();
      renderComponent({ onToggle });

      fireEvent.click(screen.getByText("Numbering & Sequencing"));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe("Enable checkbox", () => {
    it("should toggle enabled state when checkbox is clicked", () => {
      const onOptionsChange = vi.fn();
      renderComponent({
        options: { ...DEFAULT_NUMBERING_OPTIONS, enabled: false },
        onOptionsChange,
        isExpanded: true,
      });

      const checkbox = screen.getAllByRole("checkbox")[0];
      fireEvent.click(checkbox);

      expect(onOptionsChange).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true })
      );
    });
  });

  describe("Content visibility", () => {
    it("should not show content when collapsed", () => {
      renderComponent({ isExpanded: false });
      expect(screen.queryByLabelText("Start Number")).toBeNull();
    });

    it("should show content when expanded", () => {
      renderComponent({
        isExpanded: true,
        options: { ...DEFAULT_NUMBERING_OPTIONS, enabled: true },
      });
      expect(screen.getByLabelText("Start Number")).toBeTruthy();
    });
  });

  describe("Input fields", () => {
    const enabledExpandedProps = {
      isExpanded: true,
      options: { ...DEFAULT_NUMBERING_OPTIONS, enabled: true },
    };

    it("should render start number input", () => {
      renderComponent(enabledExpandedProps);
      const input = screen.getByLabelText("Start Number") as HTMLInputElement;
      expect(input.value).toBe("1");
    });

    it("should render increment input", () => {
      renderComponent(enabledExpandedProps);
      const input = screen.getByLabelText("Increment") as HTMLInputElement;
      expect(input.value).toBe("1");
    });

    it("should render padding input", () => {
      renderComponent(enabledExpandedProps);
      const input = screen.getByLabelText(
        "Padding (digits)"
      ) as HTMLInputElement;
      expect(input.value).toBe("1");
    });

    it("should render separator input", () => {
      renderComponent(enabledExpandedProps);
      const input = screen.getByLabelText("Separator") as HTMLInputElement;
      expect(input.value).toBe("-");
    });

    it("should update start number when input changes", () => {
      const onOptionsChange = vi.fn();
      renderComponent({
        ...enabledExpandedProps,
        onOptionsChange,
      });

      const input = screen.getByLabelText("Start Number");
      fireEvent.input(input, { target: { value: "10" } });

      expect(onOptionsChange).toHaveBeenCalledWith(
        expect.objectContaining({ startNumber: 10 })
      );
    });

    it("should update increment when input changes", () => {
      const onOptionsChange = vi.fn();
      renderComponent({
        ...enabledExpandedProps,
        onOptionsChange,
      });

      const input = screen.getByLabelText("Increment");
      fireEvent.input(input, { target: { value: "5" } });

      expect(onOptionsChange).toHaveBeenCalledWith(
        expect.objectContaining({ increment: 5 })
      );
    });

    it("should update padding when input changes", () => {
      const onOptionsChange = vi.fn();
      renderComponent({
        ...enabledExpandedProps,
        onOptionsChange,
      });

      const input = screen.getByLabelText("Padding (digits)");
      fireEvent.input(input, { target: { value: "3" } });

      expect(onOptionsChange).toHaveBeenCalledWith(
        expect.objectContaining({ padding: 3 })
      );
    });

    it("should update separator when input changes", () => {
      const onOptionsChange = vi.fn();
      renderComponent({
        ...enabledExpandedProps,
        onOptionsChange,
      });

      const input = screen.getByLabelText("Separator");
      fireEvent.input(input, { target: { value: "_" } });

      expect(onOptionsChange).toHaveBeenCalledWith(
        expect.objectContaining({ separator: "_" })
      );
    });
  });

  describe("Position radio buttons", () => {
    const enabledExpandedProps = {
      isExpanded: true,
      options: { ...DEFAULT_NUMBERING_OPTIONS, enabled: true },
    };

    it("should render position options", () => {
      renderComponent(enabledExpandedProps);
      expect(screen.getByLabelText("Start")).toBeTruthy();
      expect(screen.getByLabelText("End")).toBeTruthy();
      expect(screen.getByLabelText("At Index")).toBeTruthy();
    });

    it("should have start position selected by default", () => {
      renderComponent(enabledExpandedProps);
      const startRadio = screen.getByLabelText("Start") as HTMLInputElement;
      expect(startRadio.checked).toBe(true);
    });

    it("should update position when radio is clicked", () => {
      const onOptionsChange = vi.fn();
      renderComponent({
        ...enabledExpandedProps,
        onOptionsChange,
      });

      fireEvent.click(screen.getByLabelText("End"));
      expect(onOptionsChange).toHaveBeenCalledWith(
        expect.objectContaining({ position: "end" })
      );
    });

    it("should show insert index input when At Index is selected", () => {
      renderComponent({
        isExpanded: true,
        options: {
          ...DEFAULT_NUMBERING_OPTIONS,
          enabled: true,
          position: "index",
        },
      });
      expect(screen.getByText("at position:")).toBeTruthy();
    });

    it("should not show insert index input when Start or End is selected", () => {
      renderComponent({
        isExpanded: true,
        options: {
          ...DEFAULT_NUMBERING_OPTIONS,
          enabled: true,
          position: "start",
        },
      });
      expect(screen.queryByText("at position:")).toBeNull();
    });
  });

  describe("Preview", () => {
    it("should show preview when enabled", () => {
      const { container } = renderComponent({
        isExpanded: true,
        options: { ...DEFAULT_NUMBERING_OPTIONS, enabled: true },
      });
      expect(screen.getByText("Sequence:")).toBeTruthy();
      // Should show the color-coded legend (in the preview box)
      const previewBox = container.querySelector(".bg-base-300.rounded-lg");
      expect(previewBox).toBeTruthy();
      expect(previewBox?.textContent).toContain("Start Number");
      expect(previewBox?.textContent).toContain("Increment");
      expect(previewBox?.textContent).toContain("Padding");
      expect(previewBox?.textContent).toContain("Separator");
    });

    it("should not show preview when disabled", () => {
      renderComponent({
        isExpanded: true,
        options: { ...DEFAULT_NUMBERING_OPTIONS, enabled: false },
      });
      expect(screen.queryByText("Sequence:")).toBeNull();
    });

    it("should display separator in preview", () => {
      const { container } = renderComponent({
        isExpanded: true,
        options: {
          ...DEFAULT_NUMBERING_OPTIONS,
          enabled: true,
          separator: "_",
        },
      });
      // Check for separator elements with the seq-separator class
      const separatorElements = container.querySelectorAll(".seq-separator");
      expect(separatorElements.length).toBeGreaterThan(0);
      expect(separatorElements[0].textContent).toBe("_");
    });

    it("should display color-coded padding zeros", () => {
      const { container } = renderComponent({
        isExpanded: true,
        options: { ...DEFAULT_NUMBERING_OPTIONS, enabled: true, padding: 3 },
      });
      // Check for padding elements with the seq-padding class
      const paddingElements = container.querySelectorAll(".seq-padding");
      expect(paddingElements.length).toBeGreaterThan(0);
      // With padding 3 and start 1, first number "001" has 2 padding zeros
      expect(paddingElements[0].textContent).toBe("0");
    });

    it("should display color-coded sequence numbers", () => {
      const { container } = renderComponent({
        isExpanded: true,
        options: {
          ...DEFAULT_NUMBERING_OPTIONS,
          enabled: true,
          startNumber: 10,
          increment: 5,
        },
      });
      // Check for start number elements
      const startNumberElements =
        container.querySelectorAll(".seq-start-number");
      expect(startNumberElements.length).toBeGreaterThan(0);
      // Check for increment indicator
      const incrementElements = container.querySelectorAll(".seq-increment");
      expect(incrementElements.length).toBeGreaterThan(0);
    });
  });

  describe("Disabled state", () => {
    it("should disable inputs when numbering is disabled", () => {
      renderComponent({
        isExpanded: true,
        options: { ...DEFAULT_NUMBERING_OPTIONS, enabled: false },
      });

      const startNumberInput = screen.getByLabelText(
        "Start Number"
      ) as HTMLInputElement;
      const incrementInput = screen.getByLabelText(
        "Increment"
      ) as HTMLInputElement;
      const paddingInput = screen.getByLabelText(
        "Padding (digits)"
      ) as HTMLInputElement;
      const separatorInput = screen.getByLabelText(
        "Separator"
      ) as HTMLInputElement;

      expect(startNumberInput.disabled).toBe(true);
      expect(incrementInput.disabled).toBe(true);
      expect(paddingInput.disabled).toBe(true);
      expect(separatorInput.disabled).toBe(true);
    });

    it("should enable inputs when numbering is enabled", () => {
      renderComponent({
        isExpanded: true,
        options: { ...DEFAULT_NUMBERING_OPTIONS, enabled: true },
      });

      const startNumberInput = screen.getByLabelText(
        "Start Number"
      ) as HTMLInputElement;
      expect(startNumberInput.disabled).toBe(false);
    });
  });
});
