import { describe, expect, it } from "vitest";
import {
  jetlagBrand,
  jetlagCssVariablesResolver,
  jetlagTheme,
} from "./theme";

describe("jetlagTheme", () => {
  it("locks iOS Mantine Operate brand tokens for Wave 5 chrome", () => {
    expect(jetlagTheme.primaryColor).toBe("flag");
    expect(jetlagTheme.defaultRadius).toBe(jetlagBrand.controlRadius);
    expect(jetlagTheme.fontFamily).toContain("SF Pro Text");
    expect(jetlagTheme.other).toMatchObject({
      canvas: jetlagBrand.canvas,
      flag: jetlagBrand.flag,
      controlRadius: 14,
      sheetRadius: 24,
      frostBlur: jetlagBrand.frostBlur,
    });
    expect(jetlagTheme.components?.Button).toBeDefined();
    expect(jetlagTheme.components?.Drawer).toBeDefined();
    expect(jetlagTheme.components?.Modal).toBeDefined();
  });

  it("resolves Wave 5 bridge CSS variables", () => {
    const resolved = jetlagCssVariablesResolver(
      // Resolver ignores theme payload today; cast keeps the Mantine signature.
      jetlagTheme as never,
    );
    expect(resolved.variables?.["--jl-control-radius"]).toBe("14px");
    expect(resolved.variables?.["--jl-sheet-radius"]).toBe("24px");
    expect(resolved.dark?.["--mantine-color-body"]).toBe(jetlagBrand.canvas);
  });
});
