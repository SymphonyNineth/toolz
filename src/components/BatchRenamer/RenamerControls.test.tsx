import { render, screen, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RenamerControls from "./RenamerControls";
import "@testing-library/jest-dom";

describe("RenamerControls", () => {
  const defaultProps = {
    findText: "",
    setFindText: vi.fn(),
    replaceText: "",
    setReplaceText: vi.fn(),
    caseSensitive: false,
    setCaseSensitive: vi.fn(),
    regexMode: false,
    setRegexMode: vi.fn(),
    regexError: undefined,
    replaceFirstOnly: false,
    setReplaceFirstOnly: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render Find and Replace inputs", () => {
      render(() => <RenamerControls {...defaultProps} />);

      expect(screen.getByLabelText("Find")).toBeInTheDocument();
      expect(screen.getByLabelText("Replace with")).toBeInTheDocument();
    });

    it("should render Case Sensitive and Regex Mode checkboxes", () => {
      render(() => <RenamerControls {...defaultProps} />);

      expect(screen.getByLabelText("Case Sensitive")).toBeInTheDocument();
      expect(screen.getByLabelText("Regex Mode")).toBeInTheDocument();
      expect(screen.getByLabelText("Replace First Only")).toBeInTheDocument();
    });

    it("should display initial values from props", () => {
      render(() => (
        <RenamerControls
          {...defaultProps}
          findText="initial find"
          replaceText="initial replace"
          caseSensitive={true}
          regexMode={true}
        />
      ));

      expect(screen.getByLabelText("Find")).toHaveValue("initial find");
      expect(screen.getByLabelText("Replace with")).toHaveValue("initial replace");
      expect(screen.getByLabelText("Case Sensitive")).toBeChecked();
      expect(screen.getByLabelText("Regex Mode")).toBeChecked();
      expect(screen.getByLabelText("Replace First Only")).not.toBeChecked();
    });
  });

  describe("Interactions", () => {
    it("should call setFindText when typing in Find input", () => {
      render(() => <RenamerControls {...defaultProps} />);

      const input = screen.getByLabelText("Find");
      fireEvent.input(input, { target: { value: "new find text" } });

      expect(defaultProps.setFindText).toHaveBeenCalledWith("new find text");
    });

    it("should call setReplaceText when typing in Replace input", () => {
      render(() => <RenamerControls {...defaultProps} />);

      const input = screen.getByLabelText("Replace with");
      fireEvent.input(input, { target: { value: "new replace text" } });

      expect(defaultProps.setReplaceText).toHaveBeenCalledWith("new replace text");
    });

    it("should call setCaseSensitive when toggling checkbox", () => {
      render(() => <RenamerControls {...defaultProps} />);

      const checkbox = screen.getByLabelText("Case Sensitive");
      fireEvent.click(checkbox);

      expect(defaultProps.setCaseSensitive).toHaveBeenCalledWith(true);
    });

    it("should call setRegexMode when toggling checkbox", () => {
      render(() => <RenamerControls {...defaultProps} />);

      const checkbox = screen.getByLabelText("Regex Mode");
      fireEvent.click(checkbox);

      expect(defaultProps.setRegexMode).toHaveBeenCalledWith(true);
    });

    it("should call setReplaceFirstOnly when toggling checkbox", () => {
      render(() => <RenamerControls {...defaultProps} />);

      const checkbox = screen.getByLabelText("Replace First Only");
      fireEvent.click(checkbox);

      expect(defaultProps.setReplaceFirstOnly).toHaveBeenCalledWith(true);
    });
  });

  describe("Validation & Feedback", () => {
    it("should display regex error message when provided", () => {
      render(() => (
        <RenamerControls
          {...defaultProps}
          regexError="Invalid group"
        />
      ));

      expect(screen.getByText(/Invalid regex: Invalid group/)).toBeInTheDocument();
    });

    it("should not display error message when regexError is undefined", () => {
      render(() => <RenamerControls {...defaultProps} />);

      const errorMsg = screen.queryByText(/Invalid regex:/);
      expect(errorMsg).not.toBeInTheDocument();
    });

    it("should display different error messages based on regexError prop", () => {
      const { unmount } = render(() => (
        <RenamerControls
          {...defaultProps}
          regexError="Unterminated group"
        />
      ));

      expect(screen.getByText(/Invalid regex: Unterminated group/)).toBeInTheDocument();

      unmount();

      render(() => (
        <RenamerControls
          {...defaultProps}
          regexError="Invalid escape sequence"
        />
      ));

      expect(screen.getByText(/Invalid regex: Invalid escape sequence/)).toBeInTheDocument();
    });
  });

  describe("Regex Mode Features", () => {
    it("should show regex quick reference panel when regex mode is enabled", () => {
      render(() => (
        <RenamerControls
          {...defaultProps}
          regexMode={true}
        />
      ));

      expect(screen.getByText("Regex Quick Reference")).toBeInTheDocument();
    });

    it("should not show regex quick reference panel when regex mode is disabled", () => {
      render(() => <RenamerControls {...defaultProps} regexMode={false} />);

      expect(screen.queryByText("Regex Quick Reference")).not.toBeInTheDocument();
    });

    it("should show regex-specific placeholder in Find input when regex mode enabled", () => {
      render(() => (
        <RenamerControls
          {...defaultProps}
          regexMode={true}
        />
      ));

      const findInput = screen.getByLabelText("Find");
      expect(findInput).toHaveAttribute("placeholder", "Regex pattern...");
    });

    it("should show text placeholder in Find input when regex mode disabled", () => {
      render(() => (
        <RenamerControls
          {...defaultProps}
          regexMode={false}
        />
      ));

      const findInput = screen.getByLabelText("Find");
      expect(findInput).toHaveAttribute("placeholder", "Text to find...");
    });

    it("should show regex-specific placeholder in Replace input when regex mode enabled", () => {
      render(() => (
        <RenamerControls
          {...defaultProps}
          regexMode={true}
        />
      ));

      const replaceInput = screen.getByLabelText("Replace with");
      expect(replaceInput).toHaveAttribute("placeholder", "Use $1, $2 for groups...");
    });

    it("should show text placeholder in Replace input when regex mode disabled", () => {
      render(() => (
        <RenamerControls
          {...defaultProps}
          regexMode={false}
        />
      ));

      const replaceInput = screen.getByLabelText("Replace with");
      expect(replaceInput).toHaveAttribute("placeholder", "Replacement text...");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty string input", () => {
      render(() => <RenamerControls {...defaultProps} />);

      const findInput = screen.getByLabelText("Find");
      fireEvent.input(findInput, { target: { value: "" } });

      expect(defaultProps.setFindText).toHaveBeenCalledWith("");
    });

    it("should handle special characters in find input", () => {
      render(() => <RenamerControls {...defaultProps} />);

      const findInput = screen.getByLabelText("Find");
      const specialChars = ".*+?^${}()|[]\\";
      fireEvent.input(findInput, { target: { value: specialChars } });

      expect(defaultProps.setFindText).toHaveBeenCalledWith(specialChars);
    });

    it("should handle unicode characters in inputs", () => {
      render(() => <RenamerControls {...defaultProps} />);

      const findInput = screen.getByLabelText("Find");
      const unicodeText = "Hello 世界 🌍";
      fireEvent.input(findInput, { target: { value: unicodeText } });

      expect(defaultProps.setFindText).toHaveBeenCalledWith(unicodeText);
    });

    it("should toggle case sensitive from false to true", () => {
      render(() => <RenamerControls {...defaultProps} caseSensitive={false} />);

      const checkbox = screen.getByLabelText("Case Sensitive");
      fireEvent.click(checkbox);

      expect(defaultProps.setCaseSensitive).toHaveBeenCalledWith(true);
    });

    it("should toggle case sensitive from true to false", () => {
      render(() => <RenamerControls {...defaultProps} caseSensitive={true} />);

      const checkbox = screen.getByLabelText("Case Sensitive");
      fireEvent.click(checkbox);

      expect(defaultProps.setCaseSensitive).toHaveBeenCalledWith(false);
    });

    it("should toggle regex mode from false to true", () => {
      render(() => <RenamerControls {...defaultProps} regexMode={false} />);

      const checkbox = screen.getByLabelText("Regex Mode");
      fireEvent.click(checkbox);

      expect(defaultProps.setRegexMode).toHaveBeenCalledWith(true);
    });

    it("should toggle regex mode from true to false", () => {
      render(() => <RenamerControls {...defaultProps} regexMode={true} />);

      const checkbox = screen.getByLabelText("Regex Mode");
      fireEvent.click(checkbox);

      expect(defaultProps.setRegexMode).toHaveBeenCalledWith(false);
    });

    it("should handle multiple rapid input changes", () => {
      render(() => <RenamerControls {...defaultProps} />);

      const findInput = screen.getByLabelText("Find");

      fireEvent.input(findInput, { target: { value: "a" } });
      fireEvent.input(findInput, { target: { value: "ab" } });
      fireEvent.input(findInput, { target: { value: "abc" } });

      expect(defaultProps.setFindText).toHaveBeenCalledTimes(3);
      expect(defaultProps.setFindText).toHaveBeenNthCalledWith(1, "a");
      expect(defaultProps.setFindText).toHaveBeenNthCalledWith(2, "ab");
      expect(defaultProps.setFindText).toHaveBeenNthCalledWith(3, "abc");
    });

    it("should handle very long input strings", () => {
      render(() => <RenamerControls {...defaultProps} />);

      const findInput = screen.getByLabelText("Find");
      const longString = "a".repeat(1000);
      fireEvent.input(findInput, { target: { value: longString } });

      expect(defaultProps.setFindText).toHaveBeenCalledWith(longString);
    });
  });
});
