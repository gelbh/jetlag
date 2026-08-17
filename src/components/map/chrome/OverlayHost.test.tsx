import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OVERLAY_SAFE_PAD_X, OverlayHost } from "./OverlayHost";

describe("OverlayHost", () => {
  it("exposes safe-area horizontal padding tokens for phone content width", () => {
    expect(OVERLAY_SAFE_PAD_X).toMatch(/safe-area-inset-left/);
    expect(OVERLAY_SAFE_PAD_X).toMatch(/safe-area-inset-right/);
    expect(OVERLAY_SAFE_PAD_X).toMatch(/0\.5rem/);
  });

  it("wraps phone chrome as a fixed overlay host with safe-area pad classes", () => {
    const { container } = render(
      <OverlayHost layout="phone">
        <div data-testid="child">x</div>
      </OverlayHost>,
    );
    const host = container.querySelector("[data-overlay-host]");
    expect(host).not.toBeNull();
    expect(host?.getAttribute("data-layout")).toBe("phone");
    expect(host?.className).toMatch(/fixed/);
    expect(host?.className).toMatch(/safe-area-inset-left/);
    expect(host?.className).toMatch(/safe-area-inset-right/);
    expect(host?.classList.contains("jl-map-bottom-chrome-host")).toBe(true);
  });

  it("uses relative fill for rail layout without fixed phone pad", () => {
    const { container } = render(
      <OverlayHost layout="rail">
        <div>rail</div>
      </OverlayHost>,
    );
    const host = container.querySelector("[data-overlay-host]");
    expect(host?.getAttribute("data-layout")).toBe("rail");
    expect(host?.classList.contains("jl-map-bottom-chrome-host--rail")).toBe(
      true,
    );
    expect(host?.className).toMatch(/relative/);
    expect(host?.className).not.toMatch(/fixed/);
  });
});
