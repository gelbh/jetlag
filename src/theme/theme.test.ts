import { describe, expect, it } from "vitest";
import {
  JETLAG_DOCK_Z_INDEX,
  JETLAG_MODAL_Z_INDEX,
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
      dockHeight: "4.25rem",
      chromeGapAboveDock: "0.5rem",
      safeAreaBottom: "env(safe-area-inset-bottom, 0px)",
      zDock: JETLAG_DOCK_Z_INDEX,
      zModal: JETLAG_MODAL_Z_INDEX,
    });
    expect(jetlagTheme.components?.Button).toBeDefined();
    expect(jetlagTheme.components?.Drawer).toBeDefined();
    expect(jetlagTheme.components?.Modal).toBeDefined();
    expect(jetlagTheme.components?.Notification).toBeDefined();
    expect(jetlagTheme.components?.Alert).toBeDefined();
    expect(jetlagTheme.colors?.halt).toBeDefined();
    expect(jetlagBrand.halt).toMatch(/^oklch/);
  });

  it("resolves Wave 5 bridge CSS variables", () => {
    const resolved = jetlagCssVariablesResolver(
      // Resolver ignores theme payload today; cast keeps the Mantine signature.
      jetlagTheme as never,
    );
    expect(resolved.variables?.["--jl-control-radius"]).toBe("14px");
    expect(resolved.variables?.["--jl-sheet-radius"]).toBe("24px");
    expect(resolved.variables?.["--jl-dock-height"]).toBe("4.25rem");
    expect(resolved.variables?.["--jl-ops-rail-width"]).toBe("22rem");
    expect(resolved.variables?.["--ops-rail-width"]).toBe("22rem");
    expect(resolved.variables?.["--ask-hud-strip-height"]).toBe("3rem");
    expect(resolved.variables?.["--jl-safe-area-bottom"]).toBe(
      jetlagBrand.safeAreaBottom,
    );
    expect(resolved.variables?.["--jl-z-dock"]).toBe("1000");
    expect(resolved.variables?.["--jl-z-modal"]).toBe("1100");
    expect(resolved.dark?.["--mantine-color-body"]).toBe(jetlagBrand.canvas);
  });
});
