import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OVERLAY_SAFE_PAD_X, OverlayHost } from "./OverlayHost";

describe("OverlayHost", () => {
  it("exposes shell-composed horizontal safe-area padding with env fallback", () => {
    expect(OVERLAY_SAFE_PAD_X).toMatch(/--jl-shell-safe-left/);
    expect(OVERLAY_SAFE_PAD_X).toMatch(/--jl-shell-safe-right/);
    expect(OVERLAY_SAFE_PAD_X).toMatch(/safe-area-inset-left/);
    expect(OVERLAY_SAFE_PAD_X).toMatch(/safe-area-inset-right/);
    expect(OVERLAY_SAFE_PAD_X).toMatch(/0\.75rem/);
  });

  it("wraps phone chrome as a fixed overlay host with horizontal safe-area classes", () => {
    const { container } = render(
      <OverlayHost>
        <div data-testid="child">x</div>
      </OverlayHost>,
    );
    const host = container.querySelector("[data-overlay-host]");
    expect(host).not.toBeNull();
    expect(host?.getAttribute("data-layout")).toBe("phone");
    expect(host?.className).toMatch(/fixed/);
    expect(host?.className).toMatch(/--jl-shell-safe-left/);
    expect(host?.className).toMatch(/--jl-shell-safe-right/);
    expect(host?.className).toMatch(/safe-area-inset-left/);
    expect(host?.className).toMatch(/safe-area-inset-right/);
    // Bottom inset lives in map-bottom-chrome.css (real CSS), not Tailwind.
    expect(host?.className).not.toMatch(/safe-area-inset-bottom/);
    expect(host?.classList.contains("jl-map-bottom-chrome-host")).toBe(true);
  });
});
