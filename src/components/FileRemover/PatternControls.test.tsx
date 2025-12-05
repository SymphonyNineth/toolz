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
    basePath: "",
    onSelectFolder: vi.fn(),
    onSearch: vi.fn(),
    isSearching: false,
    canSearch: false,
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

    it("renders Select Folder button", () => {
      render(() => <PatternControls {...defaultProps} />);

      expect(screen.getByText("Select Folder")).toBeInTheDocument();
    });

    it("renders Search button", () => {
      render(() => <PatternControls {...defaultProps} />);

      expect(screen.getByText("Search")).toBeInTheDocument();
    });

    it("renders pattern input with correct initial value", () => {
      render(() => <PatternControls {...defaultProps} pattern="test-pattern" />);

      const input = screen.getByPlaceholderText(/enter text to match/i);
      expect(input).toHaveValue("test-pattern");
    });

    it("displays base path when set", () => {
      render(() => (
        <PatternControls {...defaultProps} basePath="/home/user/documents" />
      ));

      expect(screen.getByText("/home/user/documents")).toBeInTheDocument();
    });

    it("shows help text when no folder selected", () => {
      render(() => <PatternControls {...defaultProps} basePath="" />);

      expect(screen.getByText("Choose a folder to search in")).toBeInTheDocument();
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

  describe("Folder Selection and Search", () => {
    it("calls onSelectFolder when Select Folder clicked", async () => {
      const onSelectFolder = vi.fn();
      render(() => (
        <PatternControls {...defaultProps} onSelectFolder={onSelectFolder} />
      ));

      await fireEvent.click(screen.getByText("Select Folder"));
      expect(onSelectFolder).toHaveBeenCalledTimes(1);
    });

    it("calls onSearch when Search clicked and canSearch is true", async () => {
      const onSearch = vi.fn();
      render(() => (
        <PatternControls {...defaultProps} onSearch={onSearch} canSearch={true} />
      ));

      await fireEvent.click(screen.getByText("Search"));
      expect(onSearch).toHaveBeenCalledTimes(1);
    });

    it("disables Search button when canSearch is false", () => {
      render(() => <PatternControls {...defaultProps} canSearch={false} />);

      const searchBtn = screen.getByText("Search").closest("button");
      expect(searchBtn).toBeDisabled();
    });

    it("enables Search button when canSearch is true", () => {
      render(() => <PatternControls {...defaultProps} canSearch={true} />);

      const searchBtn = screen.getByText("Search").closest("button");
      expect(searchBtn).not.toBeDisabled();
    });

    // Note: When searching, the Cancel button is shown instead of Search button
    // The loading/cancel behavior is tested in "Cancel Search Button" describe block

    it("shows warning when pattern entered but no folder selected", () => {
      render(() => (
        <PatternControls {...defaultProps} pattern="test" basePath="" />
      ));

      expect(screen.getByText("Select a folder first to search")).toBeInTheDocument();
    });
  });

  describe("Regex Cheat Sheet", () => {
    it("shows regex cheat sheet toggle when in regex mode", () => {
      render(() => <PatternControls {...defaultProps} patternType="regex" />);

      expect(screen.getByText("Regex Quick Reference")).toBeInTheDocument();
    });

    it("does not show regex cheat sheet when not in regex mode", () => {
      render(() => <PatternControls {...defaultProps} patternType="simple" />);

      expect(screen.queryByText("Regex Quick Reference")).not.toBeInTheDocument();
    });
  });

  describe("Cancel Search Button", () => {
    it("shows Cancel button when searching", () => {
      render(() => (
        <PatternControls {...defaultProps} isSearching={true} canSearch={true} />
      ));

      expect(screen.getByText("Cancel")).toBeInTheDocument();
      expect(screen.queryByText("Search")).not.toBeInTheDocument();
    });

    it("calls onCancelSearch when Cancel is clicked", async () => {
      const onCancelSearch = vi.fn();
      render(() => (
        <PatternControls
          {...defaultProps}
          isSearching={true}
          canSearch={true}
          onCancelSearch={onCancelSearch}
        />
      ));

      const cancelBtn = screen.getByText("Cancel").closest("button");
      await fireEvent.click(cancelBtn!);

      expect(onCancelSearch).toHaveBeenCalledTimes(1);
    });

    it("shows Search button when not searching", () => {
      render(() => (
        <PatternControls {...defaultProps} isSearching={false} canSearch={true} />
      ));

      expect(screen.getByText("Search")).toBeInTheDocument();
      expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
    });

    it("disables pattern input when searching", () => {
      render(() => (
        <PatternControls {...defaultProps} isSearching={true} canSearch={true} />
      ));

      const input = screen.getByPlaceholderText("Enter text to match in file names...");
      expect(input).toBeDisabled();
    });

    it("shows warning variant for cancel button", () => {
      render(() => (
        <PatternControls {...defaultProps} isSearching={true} canSearch={true} />
      ));

      const cancelBtn = screen.getByText("Cancel").closest("button");
      expect(cancelBtn).toHaveClass("btn-warning");
    });
  });
});
