import { describe, expect, it } from "vitest";
import {
  isBelowClientMinVersion,
  meetsClientMinVersion,
  parseClientMinVersionDoc,
} from "./clientMinVersion";

describe("clientMinVersion", () => {
  it("treats 0.10.8 as below the 0.11.0 floor", () => {
    expect(meetsClientMinVersion("0.10.8", "0.11.0")).toBe(false);
    expect(isBelowClientMinVersion("0.10.8", "0.11.0")).toBe(true);
  });

  it("allows 0.11.0 and newer against the 0.11.0 floor", () => {
    expect(meetsClientMinVersion("0.11.0", "0.11.0")).toBe(true);
    expect(meetsClientMinVersion("0.11.1", "0.11.0")).toBe(true);
    expect(isBelowClientMinVersion("0.11.0", "0.11.0")).toBe(false);
  });

  it("does not block when min is missing or empty (gate disabled)", () => {
    expect(isBelowClientMinVersion("0.10.8", null)).toBe(false);
    expect(isBelowClientMinVersion("0.10.8", undefined)).toBe(false);
    expect(isBelowClientMinVersion("0.10.8", "")).toBe(false);
    expect(isBelowClientMinVersion("0.10.8", "   ")).toBe(false);
  });

  it("parses ops/clientMinVersion doc shape", () => {
    expect(parseClientMinVersionDoc({ minVersion: "0.11.0" })).toBe("0.11.0");
    expect(parseClientMinVersionDoc({ minVersion: " 0.11.0 " })).toBe("0.11.0");
    expect(parseClientMinVersionDoc({})).toBe(null);
    expect(parseClientMinVersionDoc(null)).toBe(null);
    expect(parseClientMinVersionDoc({ minVersion: 11 })).toBe(null);
  });
});
