import { describe, expect, it } from "vitest";
import {
  DEFAULT_NUMBERING_OPTIONS,
  NumberingOptions,
  applyNumbering,
  formatNumber,
  getNumberingInfo,
} from "./renamingUtils";

const withDefaults = (overrides: Partial<NumberingOptions> = {}): NumberingOptions => ({
  ...DEFAULT_NUMBERING_OPTIONS,
  ...overrides,
});

describe("formatNumber", () => {
  it("pads to requested length", () => {
    expect(formatNumber(1, 3)).toBe("001");
    expect(formatNumber(42, 2)).toBe("42");
  });

  it("handles zero and large values", () => {
    expect(formatNumber(0, 2)).toBe("00");
    expect(formatNumber(1234, 2)).toBe("1234");
  });
});

describe("getNumberingInfo", () => {
  it("returns disabled info when numbering is off", () => {
    const info = getNumberingInfo("file.txt", 0, withDefaults({ enabled: false }));
    expect(info.enabled).toBe(false);
    expect(info.insertIndex).toBe(0);
    expect(info.formattedNumber).toBe("");
  });

  it("computes insert index per position", () => {
    const startInfo = getNumberingInfo("file.txt", 0, withDefaults({ enabled: true, position: "start" }));
    expect(startInfo.insertIndex).toBe(0);

    const endInfo = getNumberingInfo("file.txt", 0, withDefaults({ enabled: true, position: "end" }));
    expect(endInfo.insertIndex).toBe(4);

    const idxInfo = getNumberingInfo("file.txt", 0, withDefaults({ enabled: true, position: "index", insertIndex: 2 }));
    expect(idxInfo.insertIndex).toBe(2);
  });
});

describe("applyNumbering", () => {
  it("returns original name when disabled", () => {
    expect(applyNumbering("file.txt", 0, withDefaults({ enabled: false }))).toBe("file.txt");
  });

  it("inserts at start", () => {
    const name = applyNumbering("file.txt", 0, withDefaults({ enabled: true, position: "start", separator: "-" }));
    expect(name).toBe("1-file.txt");
  });

  it("inserts at end before extension", () => {
    const name = applyNumbering("file.txt", 1, withDefaults({ enabled: true, position: "end", separator: "_" }));
    expect(name).toBe("file_2.txt");
  });

  it("respects insert index", () => {
    const name = applyNumbering("document.pdf", 0, withDefaults({ enabled: true, position: "index", insertIndex: 3, separator: "-" }));
    expect(name).toBe("doc-1-ument.pdf");
  });

  it("supports padding and increment", () => {
    const options = withDefaults({
      enabled: true,
      padding: 3,
      startNumber: 10,
      increment: 5,
      position: "start",
      separator: "_",
    });
    expect(applyNumbering("photo.jpg", 2, options)).toBe("020_photo.jpg");
  });
});


