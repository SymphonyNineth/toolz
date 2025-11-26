import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@solidjs/testing-library";
import ThemeSwitcher, { THEMES, DEFAULT_THEME } from "./ThemeSwitcher";

describe("ThemeSwitcher", () => {
  const mockLocalStorage = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      clear: () => {
        store = {};
      },
    };
  })();

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockLocalStorage.clear();
    Object.defineProperty(window, "localStorage", {
      value: mockLocalStorage,
      writable: true,
    });
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => {
    cleanup();
  });

  describe("Rendering", () => {
    it("renders the theme switcher button with title", () => {
      render(() => <ThemeSwitcher />);
      expect(screen.getByTitle("Change Theme")).toBeInTheDocument();
    });

    it("displays the current theme name in the dropdown trigger", () => {
      render(() => <ThemeSwitcher />);
      const expectedTheme = THEMES.find((t) => t.id === DEFAULT_THEME);
      // Theme name appears twice: in the button and in the dropdown
      const themeNameElements = screen.getAllByText(expectedTheme!.name);
      expect(themeNameElements.length).toBeGreaterThanOrEqual(1);
    });

    it("renders the dropdown menu with all theme options", () => {
      render(() => <ThemeSwitcher />);
      // All themes should be in the dropdown (some might appear twice due to selected state)
      THEMES.forEach((theme) => {
        const elements = screen.getAllByText(theme.name);
        expect(elements.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("renders the dropdown with proper classes", () => {
      render(() => <ThemeSwitcher />);
      const dropdown = document.querySelector(".dropdown");
      expect(dropdown).toBeInTheDocument();
      expect(dropdown).toHaveClass("dropdown-end");
      expect(dropdown).toHaveClass("dropdown-top");
    });
  });

  describe("Theme Selection", () => {
    it("changes theme when a theme option is clicked", async () => {
      render(() => <ThemeSwitcher />);

      // Click on the "Dark" theme option
      const darkThemeButtons = screen.getAllByText("Dark");
      await fireEvent.click(darkThemeButtons[0]);

      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    });

    it("saves theme to localStorage when changed", async () => {
      render(() => <ThemeSwitcher />);

      const forestThemeButtons = screen.getAllByText("Forest");
      await fireEvent.click(forestThemeButtons[0]);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith("theme", "forest");
    });

    it("loads saved theme from localStorage on mount", () => {
      mockLocalStorage.getItem.mockReturnValue("dracula");

      render(() => <ThemeSwitcher />);

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith("theme");
      expect(document.documentElement.getAttribute("data-theme")).toBe("dracula");
    });

    it("uses default theme when localStorage is empty", () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      render(() => <ThemeSwitcher />);

      expect(document.documentElement.getAttribute("data-theme")).toBe(DEFAULT_THEME);
    });

    it("uses default theme when localStorage has invalid theme", () => {
      mockLocalStorage.getItem.mockReturnValue("invalid-theme");

      render(() => <ThemeSwitcher />);

      expect(document.documentElement.getAttribute("data-theme")).toBe(DEFAULT_THEME);
    });
  });

  describe("Visual Feedback", () => {
    it("shows active class for currently selected theme", () => {
      render(() => <ThemeSwitcher />);

      // Find buttons in the dropdown menu that have 'active' class
      const activeButtons = document.querySelectorAll("button.active");
      expect(activeButtons.length).toBe(1);
    });

    it("updates active class when theme is changed", async () => {
      render(() => <ThemeSwitcher />);

      // Initially emerald should be active
      let activeButtons = document.querySelectorAll("button.active");
      expect(activeButtons.length).toBe(1);

      // Click on night theme
      const nightThemeButtons = screen.getAllByText("Night");
      await fireEvent.click(nightThemeButtons[0]);

      // Night should now be active
      activeButtons = document.querySelectorAll("button.active");
      expect(activeButtons.length).toBe(1);

      // The active button should be the Night theme button
      const nightButton = nightThemeButtons[0].closest("button");
      expect(nightButton).toHaveClass("active");
    });

    it("shows checkmark icon for selected theme", () => {
      render(() => <ThemeSwitcher />);

      // The checkmark SVG should be present
      const activeButton = document.querySelector("button.active");
      expect(activeButton).not.toBeNull();
      
      const checkmark = activeButton?.querySelector("svg.text-success");
      expect(checkmark).toBeInTheDocument();
    });
  });

  describe("Constants", () => {
    it("exports THEMES array with correct structure", () => {
      expect(THEMES).toBeInstanceOf(Array);
      expect(THEMES.length).toBeGreaterThan(0);

      THEMES.forEach((theme) => {
        expect(theme).toHaveProperty("id");
        expect(theme).toHaveProperty("name");
      });
    });

    it("exports DEFAULT_THEME as emerald", () => {
      expect(DEFAULT_THEME).toBe("emerald");
    });

    it("includes all expected themes", () => {
      const themeIds = THEMES.map((t) => t.id);
      expect(themeIds).toContain("emerald");
      expect(themeIds).toContain("light");
      expect(themeIds).toContain("dark");
      expect(themeIds).toContain("forest");
      expect(themeIds).toContain("pastel");
      expect(themeIds).toContain("black");
      expect(themeIds).toContain("dracula");
      expect(themeIds).toContain("business");
      expect(themeIds).toContain("night");
      expect(themeIds).toContain("dim");
      expect(themeIds).toContain("sunset");
    });

    it("has 11 themes available", () => {
      expect(THEMES.length).toBe(11);
    });
  });
});
