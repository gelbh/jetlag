import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MapBottomChrome } from "./MapBottomChrome";

const chromeCss = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../../styles/map-bottom-chrome.css"),
  "utf8",
);

describe("MapBottomChrome", () => {
  it("renders provided islands and omits empty ones", () => {
    render(
      <MapBottomChrome
        layout="phone"
        history={<button type="button">Undo</button>}
        hunt={<button type="button">Radar</button>}
        session={<button type="button">Chat</button>}
        mapControls={<button type="button">Recenter map on play area</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Radar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chat" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Recenter map on play area" }),
    ).toBeInTheDocument();
  });

it("omits history region when history is undefined", () => {
  const { container } = render(
    <MapBottomChrome layout="phone" hunt={<button type="button">Radar</button>} />,
  );
  expect(container.querySelector('[data-island="history"]')).toBeNull();
  expect(container.querySelector('[data-island="hunt"]')).not.toBeNull();
});

it("wraps phone chrome in a fixed host", () => {
  const { container } = render(
    <MapBottomChrome layout="phone" hunt={<button type="button">Radar</button>} />,
  );
  expect(container.querySelector(".jl-map-bottom-chrome-host")).not.toBeNull();
  expect(
    container.querySelector(".jl-map-bottom-chrome-host--rail"),
  ).toBeNull();
});

it("marks chrome inactive without leaving islands clickable via CSS class", () => {
  const { container } = render(
    <MapBottomChrome
      layout="phone"
      inactive
      hunt={<button type="button">Radar</button>}
    />,
  );
  expect(
    container.querySelector(".jl-map-bottom-chrome--inactive"),
  ).not.toBeNull();
});

  it("puts history and hunt in the bottom band and session/map-controls in the side stack", () => {
    const { container } = render(
      <MapBottomChrome
        layout="phone"
        history={<button type="button">Undo</button>}
        hunt={<button type="button">Radar</button>}
        session={<button type="button">Chat</button>}
        mapControls={<button type="button">Recenter map on play area</button>}
      />,
    );
    const bottom = container.querySelector(".jl-map-chrome-bottom-band");
    const side = container.querySelector(".jl-map-chrome-side-stack");
    expect(bottom).not.toBeNull();
    expect(side).not.toBeNull();
    expect(bottom?.querySelector('[data-island="history"]')).not.toBeNull();
    expect(bottom?.querySelector('[data-island="hunt"]')).not.toBeNull();
    expect(bottom?.querySelector('[data-island="session"]')).toBeNull();
    expect(bottom?.querySelector('[data-island="map-controls"]')).toBeNull();
    expect(side?.querySelector('[data-island="session"]')).not.toBeNull();
    expect(side?.querySelector('[data-island="map-controls"]')).not.toBeNull();
  });

  it("keeps an empty side stack when session and map-controls are absent", () => {
    const { container } = render(
      <MapBottomChrome layout="phone" hunt={<button type="button">Radar</button>} />,
    );
    const side = container.querySelector(".jl-map-chrome-side-stack");
    expect(side).not.toBeNull();
    expect(side?.childElementCount).toBe(0);
    expect(container.querySelector(".jl-map-chrome-bottom-band")).not.toBeNull();
  });

  it("uses the same band/side wrappers on rail so CSS can flatten them", () => {
    const { container } = render(
      <MapBottomChrome
        layout="rail"
        history={<button type="button">Undo</button>}
        session={<button type="button">Chat</button>}
      />,
    );
    expect(container.querySelector(".jl-map-bottom-chrome-host--rail")).not.toBeNull();
    const bottom = container.querySelector(".jl-map-chrome-bottom-band");
    const side = container.querySelector(".jl-map-chrome-side-stack");
    expect(bottom).not.toBeNull();
    expect(side).not.toBeNull();
    expect(bottom?.querySelector('[data-island="history"]')).not.toBeNull();
    expect(bottom?.querySelector('[data-island="session"]')).toBeNull();
    expect(side?.querySelector('[data-island="session"]')).not.toBeNull();
    expect(side?.querySelector('[data-island="history"]')).toBeNull();
  });

  it("clears the MapView zoom stack with width/height-scoped offset tokens", () => {
    expect(chromeCss).toMatch(
      /:root\s*\{[^}]*--map-chrome-zoom-stack-height:\s*7rem/s,
    );
    expect(chromeCss).toMatch(
      /@media\s*\(max-width:\s*28rem\)\s*\{[^}]*--map-chrome-zoom-stack-height:\s*9rem/s,
    );
    expect(chromeCss).toMatch(
      /@media\s*\(max-height:\s*430px\)\s*and\s*\(orientation:\s*landscape\)\s*\{[^}]*--map-chrome-zoom-stack-height:\s*6\.25rem/s,
    );
    expect(chromeCss).toMatch(
      /\.jl-map-chrome-side-stack\s*\{[^}]*bottom:\s*calc\(\s*var\(--dock-island-height\)\s*\+\s*env\(safe-area-inset-bottom\)\s*\+\s*0\.75rem\s*\+\s*var\(--map-chrome-zoom-stack-height\)\s*\)/s,
    );
    // Seeker still portals Zoom via MapView; do not reintroduce a silent calc fallback.
    expect(chromeCss).not.toMatch(/map-chrome-zoom-stack-height,\s*6\.25rem/);

    // Short-landscape must win when both media queries match (cascade order).
    const narrowWidthOffset = chromeCss.indexOf("@media (max-width: 28rem)");
    const shortLandscapeOffset = chromeCss.indexOf(
      "@media (max-height: 430px) and (orientation: landscape)",
    );
    expect(narrowWidthOffset).toBeGreaterThan(-1);
    expect(shortLandscapeOffset).toBeGreaterThan(narrowWidthOffset);
  });
});
