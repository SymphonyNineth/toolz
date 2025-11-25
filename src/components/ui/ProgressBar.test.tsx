import { describe, it, expect } from "vitest";
import { render, screen } from "@solidjs/testing-library";
import ProgressBar from "./ProgressBar";

describe("ProgressBar", () => {
  describe("rendering", () => {
    it("renders a progress element", () => {
      render(() => <ProgressBar progress={50} />);
      
      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toBeInTheDocument();
    });

    it("renders with default primary variant class", () => {
      render(() => <ProgressBar progress={50} />);
      
      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveClass("progress-primary");
    });

    it("applies custom variant class", () => {
      render(() => <ProgressBar progress={50} variant="success" />);
      
      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveClass("progress-success");
    });

    it("applies size class", () => {
      render(() => <ProgressBar progress={50} size="lg" />);
      
      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveClass("progress-lg");
    });

    it("applies custom class", () => {
      render(() => <ProgressBar progress={50} class="custom-class" />);
      
      const container = screen.getByRole("progressbar").parentElement;
      expect(container).toHaveClass("custom-class");
    });
  });

  describe("progress values", () => {
    it("sets progress value correctly", () => {
      render(() => <ProgressBar progress={75} total={100} />);
      
      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("value", "75");
      expect(progressBar).toHaveAttribute("max", "100");
    });

    it("uses current instead of progress when both provided", () => {
      render(() => <ProgressBar progress={50} current={75} total={100} />);
      
      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("value", "75");
    });

    it("calculates percentage correctly", () => {
      render(() => <ProgressBar current={25} total={100} showPercentage />);
      
      expect(screen.getByText("25%")).toBeInTheDocument();
    });

    it("displays count when showCount is true", () => {
      render(() => <ProgressBar current={150} total={300} showCount />);
      
      expect(screen.getByText("150 / 300")).toBeInTheDocument();
    });

    it("caps percentage at 100", () => {
      render(() => <ProgressBar current={150} total={100} showPercentage />);
      
      expect(screen.getByText("100%")).toBeInTheDocument();
    });
  });

  describe("label", () => {
    it("renders label when provided", () => {
      render(() => <ProgressBar progress={50} label="Loading..." />);
      
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("does not render label when not provided", () => {
      render(() => <ProgressBar progress={50} />);
      
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });
  });

  describe("indeterminate state", () => {
    it("renders with animate-pulse class when indeterminate", () => {
      render(() => <ProgressBar indeterminate />);
      
      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveClass("animate-pulse");
    });

    it("does not set value when indeterminate", () => {
      render(() => <ProgressBar indeterminate />);
      
      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).not.toHaveAttribute("value");
    });

    it("does not show percentage when indeterminate", () => {
      render(() => <ProgressBar indeterminate showPercentage label="Loading" />);
      
      // Should not have percentage text when indeterminate
      expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
    });

    it("does not show count when indeterminate", () => {
      render(() => <ProgressBar indeterminate showCount current={50} total={100} />);
      
      // Should not have count text when indeterminate
      expect(screen.queryByText(/\d+ \/ \d+/)).not.toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has role progressbar", () => {
      render(() => <ProgressBar progress={50} />);
      
      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    it("sets aria-valuenow when determinate", () => {
      render(() => <ProgressBar current={75} total={100} />);
      
      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuenow", "75");
    });

    it("does not set aria-valuenow when indeterminate", () => {
      render(() => <ProgressBar indeterminate />);
      
      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).not.toHaveAttribute("aria-valuenow");
    });

    it("sets aria-valuemin to 0", () => {
      render(() => <ProgressBar progress={50} />);
      
      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuemin", "0");
    });

    it("sets aria-valuemax to total", () => {
      render(() => <ProgressBar progress={50} total={200} />);
      
      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuemax", "200");
    });

    it("sets aria-label from label prop", () => {
      render(() => <ProgressBar progress={50} label="Uploading files" />);
      
      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-label", "Uploading files");
    });

    it("defaults aria-label to Progress when no label", () => {
      render(() => <ProgressBar progress={50} />);
      
      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-label", "Progress");
    });
  });

  describe("variants", () => {
    const variants = ["primary", "secondary", "accent", "info", "success", "warning", "error"] as const;

    variants.forEach((variant) => {
      it(`applies ${variant} variant class`, () => {
        render(() => <ProgressBar progress={50} variant={variant} />);
        
        const progressBar = screen.getByRole("progressbar");
        expect(progressBar).toHaveClass(`progress-${variant}`);
      });
    });
  });

  describe("sizes", () => {
    const sizes = ["xs", "sm", "md", "lg"] as const;

    sizes.forEach((size) => {
      it(`applies ${size} size class`, () => {
        render(() => <ProgressBar progress={50} size={size} />);
        
        const progressBar = screen.getByRole("progressbar");
        if (size === "md") {
          // md is default and doesn't add a class
          expect(progressBar).not.toHaveClass("progress-md");
        } else {
          expect(progressBar).toHaveClass(`progress-${size}`);
        }
      });
    });
  });

  describe("edge cases", () => {
    it("handles zero progress", () => {
      render(() => <ProgressBar progress={0} total={100} showPercentage />);
      
      expect(screen.getByText("0%")).toBeInTheDocument();
      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("value", "0");
    });

    it("handles 100% progress", () => {
      render(() => <ProgressBar progress={100} total={100} showPercentage />);
      
      expect(screen.getByText("100%")).toBeInTheDocument();
    });

    it("handles total of zero gracefully", () => {
      render(() => <ProgressBar progress={0} total={0} />);
      
      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("max", "0");
    });

    it("handles missing total (defaults to 100)", () => {
      render(() => <ProgressBar progress={50} showPercentage />);
      
      expect(screen.getByText("50%")).toBeInTheDocument();
      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("max", "100");
    });

    it("formats large numbers with locale separators", () => {
      render(() => <ProgressBar current={1500} total={3000} showCount />);
      
      // Numbers should be formatted with locale (e.g., "1,500 / 3,000")
      expect(screen.getByText("1,500 / 3,000")).toBeInTheDocument();
    });
  });

  describe("combination of props", () => {
    it("renders label, count, and percentage together", () => {
      render(() => (
        <ProgressBar
          label="Processing..."
          current={50}
          total={100}
          showCount
          showPercentage
        />
      ));
      
      expect(screen.getByText("Processing...")).toBeInTheDocument();
      expect(screen.getByText("50 / 100")).toBeInTheDocument();
      expect(screen.getByText("50%")).toBeInTheDocument();
    });

    it("applies multiple style props", () => {
      render(() => (
        <ProgressBar
          progress={50}
          variant="success"
          size="lg"
          class="my-custom-class"
        />
      ));
      
      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveClass("progress-success");
      expect(progressBar).toHaveClass("progress-lg");
      expect(progressBar.parentElement).toHaveClass("my-custom-class");
    });
  });
});

