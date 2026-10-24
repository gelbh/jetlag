import { describe, expect, it } from "vitest";
import { formatBytes } from "./formatBytes";

describe("formatBytes", () => {
  it("uses decimal units", () => {
    expect(formatBytes(412_000)).toBe("412 kB");
    expect(formatBytes(999)).toBe("999 B");
    expect(formatBytes(1_500_000)).toBe("1.5 MB");
    expect(formatBytes(2_000_000)).toBe("2 MB");
  });

  it("shows a dash for missing or invalid sizes", () => {
    expect(formatBytes(undefined)).toBe("–");
    expect(formatBytes(null)).toBe("–");
    expect(formatBytes(Number.NaN)).toBe("–");
  });
});
