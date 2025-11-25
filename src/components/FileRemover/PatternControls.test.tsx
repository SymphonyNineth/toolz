import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import "@testing-library/jest-dom";
import PatternControls from "./PatternControls";
import { PatternType } from "./types";

describe("PatternControls", () => {
  const defaultProps = {
    pattern: "",
    setPattern: vi.fn(),
    patternType: "simple" as PatternType,
    setPatternType: vi.fn(),
    caseSensitive: false,
    setCaseSensitive: vi.fn(),
    includeSubdirs: true,
    setIncludeSubdirs: vi.fn(),
    deleteEmptyDirs: false,
    setDeleteEmptyDirs: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders pattern type buttons", () => {
      render(() => <PatternControls {...defaultProps} />);

      expect(screen.getByText("Simple")).toBeInTheDocument();
      expect(screen.getByText("Extension")).toBeInTheDocument();
      expect(screen.getByText("Regex")).toBeInTheDocument();
    });

    it("renders all checkboxes", () => {
      render(() => <PatternControls {...defaultProps} />);

      expect(screen.getByLabelText("Case Sensitive")).toBeInTheDocument();
      expect(screen.getByLabelText("Include Subdirectories")).toBeInTheDocument();
      expect(screen.getByLabelText("Delete Empty Directories")).toBeInTheDocument();
    });

    it("renders the card title", () => {
      render(() => <PatternControls {...defaultProps} />);

      expect(screen.getByText("Pattern Settings")).toBeInTheDocument();
    });

    it("renders pattern input with correct initial value", () => {
      render(() => <PatternControls {...defaultProps} pattern="test-pattern" />);

      const input = screen.getByPlaceholderText(/enter text to match/i);
      expect(input).toHaveValue("test-pattern");
    });
  });

  describe("Pattern Type Selection", () => {
    it("calls setPatternType when type button clicked", async () => {
      const setPatternType = vi.fn();
      render(() => (
        <PatternControls {...defaultProps} setPatternType={setPatternType} />
      ));

      await fireEvent.click(screen.getByText("Extension"));
      expect(setPatternType).toHaveBeenCalledWith("extension");
    });

    it("calls setPatternType for Regex button", async () => {
      const setPatternType = vi.fn();
      render(() => (
        <PatternControls {...defaultProps} setPatternType={setPatternType} />
      ));

      await fireEvent.click(screen.getByText("Regex"));
      expect(setPatternType).toHaveBeenCalledWith("regex");
    });

    it("calls setPatternType for Simple button", async () => {
      const setPatternType = vi.fn();
      render(() => (
        <PatternControls
          {...defaultProps}
          patternType="regex"
          setPatternType={setPatternType}
        />
      ));

      await fireEvent.click(screen.getByText("Simple"));
      expect(setPatternType).toHaveBeenCalledWith("simple");
    });

    it("highlights active pattern type button", () => {
      render(() => <PatternControls {...defaultProps} patternType="extension" />);

      const extensionBtn = screen.getByText("Extension");
      expect(extensionBtn).toHaveClass("btn-active");
    });
  });

  describe("Placeholders", () => {
    it("shows correct placeholder for simple pattern type", () => {
      render(() => <PatternControls {...defaultProps} patternType="simple" />);

      expect(
        screen.getByPlaceholderText(/enter text to match/i)
      ).toBeInTheDocument();
    });

    it("shows correct placeholder for extension pattern type", () => {
      render(() => <PatternControls {...defaultProps} patternType="extension" />);

      expect(screen.getByPlaceholderText(/\.tmp, \.log/)).toBeInTheDocument();
    });

    it("shows correct placeholder for regex pattern type", () => {
      render(() => <PatternControls {...defaultProps} patternType="regex" />);

      expect(
        screen.getByPlaceholderText(/enter regex pattern/i)
      ).toBeInTheDocument();
    });
  });

  describe("Error Display", () => {
    it("shows error message when patternError is set", () => {
      render(() => (
        <PatternControls {...defaultProps} patternError="Invalid regex" />
      ));

      expect(screen.getByText("Invalid regex")).toBeInTheDocument();
    });

    it("does not show error message when patternError is undefined", () => {
      render(() => <PatternControls {...defaultProps} />);

      expect(screen.queryByText("Invalid regex")).not.toBeInTheDocument();
    });

    it("applies error styling to input when patternError exists", () => {
      render(() => (
        <PatternControls {...defaultProps} patternError="Some error" />
      ));

      const input = screen.getByPlaceholderText(/enter text to match/i);
      expect(input.closest(".input")).toHaveClass("input-error");
    });
  });

  describe("Checkbox Interactions", () => {
    it("toggles Case Sensitive checkbox correctly", async () => {
      const setCaseSensitive = vi.fn();
      render(() => (
        <PatternControls {...defaultProps} setCaseSensitive={setCaseSensitive} />
      ));

      const checkbox = screen.getByLabelText("Case Sensitive");
      await fireEvent.click(checkbox);
      expect(setCaseSensitive).toHaveBeenCalledWith(true);
    });

    it("toggles Include Subdirectories checkbox correctly", async () => {
      const setIncludeSubdirs = vi.fn();
      render(() => (
        <PatternControls {...defaultProps} setIncludeSubdirs={setIncludeSubdirs} />
      ));

      const checkbox = screen.getByLabelText("Include Subdirectories");
      await fireEvent.click(checkbox);
      // Default is true, so clicking toggles to false
      expect(setIncludeSubdirs).toHaveBeenCalledWith(false);
    });

    it("toggles Delete Empty Directories checkbox correctly", async () => {
      const setDeleteEmptyDirs = vi.fn();
      render(() => (
        <PatternControls {...defaultProps} setDeleteEmptyDirs={setDeleteEmptyDirs} />
      ));

      const checkbox = screen.getByLabelText("Delete Empty Directories");
      await fireEvent.click(checkbox);
      expect(setDeleteEmptyDirs).toHaveBeenCalledWith(true);
    });

    it("reflects checked state from props for Case Sensitive", () => {
      render(() => <PatternControls {...defaultProps} caseSensitive={true} />);

      const checkbox = screen.getByLabelText("Case Sensitive");
      expect(checkbox).toBeChecked();
    });

    it("reflects checked state from props for Include Subdirectories", () => {
      render(() => <PatternControls {...defaultProps} includeSubdirs={false} />);

      const checkbox = screen.getByLabelText("Include Subdirectories");
      expect(checkbox).not.toBeChecked();
    });

    it("reflects checked state from props for Delete Empty Directories", () => {
      render(() => <PatternControls {...defaultProps} deleteEmptyDirs={true} />);

      const checkbox = screen.getByLabelText("Delete Empty Directories");
      expect(checkbox).toBeChecked();
    });
  });

  describe("Pattern Input", () => {
    it("calls setPattern when typing in pattern input", async () => {
      const setPattern = vi.fn();
      render(() => (
        <PatternControls {...defaultProps} setPattern={setPattern} />
      ));

      const input = screen.getByPlaceholderText(/enter text to match/i);
      await fireEvent.input(input, { target: { value: "new pattern" } });
      expect(setPattern).toHaveBeenCalledWith("new pattern");
    });

    it("handles empty string input", async () => {
      const setPattern = vi.fn();
      render(() => (
        <PatternControls {...defaultProps} pattern="existing" setPattern={setPattern} />
      ));

      const input = screen.getByPlaceholderText(/enter text to match/i);
      await fireEvent.input(input, { target: { value: "" } });
      expect(setPattern).toHaveBeenCalledWith("");
    });

    it("handles special characters in pattern input", async () => {
      const setPattern = vi.fn();
      render(() => (
        <PatternControls {...defaultProps} setPattern={setPattern} />
      ));

      const input = screen.getByPlaceholderText(/enter text to match/i);
      const specialChars = ".*+?^${}()|[]\\";
      await fireEvent.input(input, { target: { value: specialChars } });
      expect(setPattern).toHaveBeenCalledWith(specialChars);
    });
  });

  describe("Tooltip", () => {
    it("renders help tooltip indicator", () => {
      render(() => <PatternControls {...defaultProps} />);

      expect(screen.getByText("ⓘ")).toBeInTheDocument();
    });
  });
});

