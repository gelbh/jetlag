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
const controlsCss = readFileSync(
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../../styles/map-chrome-controls.css",
  ),
  "utf8",
);

describe("MapBottomChrome", () => {
  it("renders provided islands and omits empty ones", () => {
    render(
      <MapBottomChrome
        layout="phone"
        hunt={<button type="button">Radar</button>}
        session={<button type="button">Chat</button>}
        mapControls={<button type="button">Recenter map on play area</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Radar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chat" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Recenter map on play area" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Hunt tools" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Session tools" })).toBeInTheDocument();
  });

  it("omits history bookend islands (undo/redo live inside hunt)", () => {
    const { container } = render(
      <MapBottomChrome layout="phone" hunt={<button type="button">Radar</button>} />,
    );
    expect(container.querySelector('[data-island="history-start"]')).toBeNull();
    expect(container.querySelector('[data-island="history-end"]')).toBeNull();
    expect(container.querySelector('[data-island="hunt"]')).not.toBeNull();
  });

  it("wraps phone chrome in OverlayHost with safe-area pad", () => {
    const { container } = render(
      <MapBottomChrome layout="phone" hunt={<button type="button">Radar</button>} />,
    );
    const host = container.querySelector("[data-overlay-host]");
    expect(host).not.toBeNull();
    expect(host?.classList.contains("jl-map-bottom-chrome-host")).toBe(true);
    expect(host?.className).toMatch(/safe-area-inset-left/);
    expect(
      container.querySelector(".jl-map-bottom-chrome-host--rail"),
    ).toBeNull();
    expect(container.querySelector(".jl-tool-dock")).not.toBeNull();
    expect(container.querySelector("[data-tool-deck]")).not.toBeNull();
  });

  it("keeps jl-tool-dock--rail on desktop rail chrome", () => {
    const { container } = render(
      <MapBottomChrome layout="rail" hunt={<button type="button">Radar</button>} />,
    );
    expect(
      container.querySelector(".jl-tool-dock.jl-tool-dock--rail"),
    ).not.toBeNull();
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

  it("puts hunt in the bottom band and session/map-controls in the side stack", () => {
    const { container } = render(
      <MapBottomChrome
        layout="phone"
        hunt={<button type="button">Radar</button>}
        session={<button type="button">Chat</button>}
        mapControls={<button type="button">Recenter map on play area</button>}
      />,
    );
    const bottom = container.querySelector(".jl-map-chrome-bottom-band");
    const side = container.querySelector(".jl-map-chrome-side-stack");
    expect(bottom).not.toBeNull();
    expect(side).not.toBeNull();
    expect(bottom?.querySelector('[data-island="hunt"]')).not.toBeNull();
    expect(bottom?.querySelector('[data-island="session"]')).toBeNull();
    expect(bottom?.querySelector('[data-island="map-controls"]')).toBeNull();
    expect(side?.querySelector('[data-island="session"]')).not.toBeNull();
    expect(side?.querySelector('[data-island="map-controls"]')).not.toBeNull();

    const bandIslands = [
      ...(bottom?.querySelectorAll("[data-island]") ?? []),
    ].map((el) => el.getAttribute("data-island"));
    expect(bandIslands).toEqual(["hunt"]);
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
        hunt={<button type="button">Radar</button>}
        session={<button type="button">Chat</button>}
      />,
    );
    expect(container.querySelector(".jl-map-bottom-chrome-host--rail")).not.toBeNull();
    const bottom = container.querySelector(".jl-map-chrome-bottom-band");
    const side = container.querySelector(".jl-map-chrome-side-stack");
    expect(bottom).not.toBeNull();
    expect(side).not.toBeNull();
    expect(bottom?.querySelector('[data-island="hunt"]')).not.toBeNull();
    expect(bottom?.querySelector('[data-island="session"]')).toBeNull();
    expect(side?.querySelector('[data-island="session"]')).not.toBeNull();
  });

  it("keeps Session above the dock with shared left-stack tokens (no right portal)", () => {
    expect(chromeCss).not.toMatch(/--map-chrome-zoom-stack-height/);
    expect(chromeCss).toMatch(/--map-left-tier-compass-bottom-dock/);
    expect(chromeCss).toMatch(/\.map-zoom-control\s*\{[^}]*left:\s*var\(--map-left-chrome-inset\)/s);
    expect(chromeCss).toMatch(
      /\.map-zoom-control--dock\s*\{[^}]*--map-left-tier-zoom-bottom-dock/s,
    );
  });

  it("defaults hunt density to tools and omits sparse modifiers", () => {
    const { container } = render(
      <MapBottomChrome layout="phone" hunt={<button type="button">Radar</button>} />,
    );
    const chrome = container.querySelector(".jl-map-bottom-chrome");
    expect(chrome?.getAttribute("data-hunt-density")).toBe("tools");
    expect(
      container.querySelector(".jl-map-bottom-chrome--hunt-sparse"),
    ).toBeNull();
    expect(container.querySelector(".jl-map-island--hunt-sparse")).toBeNull();
  });

  it("applies sparse hunt density modifiers", () => {
    const { container } = render(
      <MapBottomChrome
        layout="phone"
        huntDensity="sparse"
        hunt={<button type="button">Set zone</button>}
      />,
    );
    const chrome = container.querySelector(".jl-map-bottom-chrome");
    expect(chrome?.getAttribute("data-hunt-density")).toBe("sparse");
    expect(
      container.querySelector(".jl-map-bottom-chrome--hunt-sparse"),
    ).not.toBeNull();
    const hunt = container.querySelector('[data-island="hunt"]');
    expect(hunt?.getAttribute("data-hunt-density")).toBe("sparse");
    expect(hunt?.classList.contains("jl-map-island--hunt-sparse")).toBe(true);
  });

  it("uses full-bleed hunt band without permanently reserving side-stack flex (choice a)", () => {
    const { container } = render(
      <MapBottomChrome
        layout="phone"
        hunt={<button type="button">Radar</button>}
        session={<button type="button">Chat</button>}
      />,
    );
    const band = container.querySelector(".jl-map-chrome-bottom-band");
    expect(band?.className).toMatch(/w-full/);
    expect(band?.className).not.toMatch(/pr-\[/);
    expect(chromeCss).not.toMatch(
      /\.jl-map-chrome-bottom-band\s*\{[^}]*padding-right:\s*calc\(\s*var\(--map-chrome-side-width/s,
    );
    const side = container.querySelector(".jl-map-chrome-side-stack");
    expect(side?.className).toMatch(/absolute/);
    expect(side?.className).toMatch(/jl-map-chrome-side-stack--phone/);
    expect(side?.className).toMatch(/right-0/);
    expect(chromeCss).toMatch(
      /\.jl-map-chrome-side-stack--phone\s*\{[^}]*bottom:\s*calc\(\s*var\(--dock-island-height\)/s,
    );
    expect(chromeCss).not.toMatch(
      /\.jl-map-chrome-side-stack--phone\s*\{[^}]*safe-area-inset-bottom/s,
    );
    const hunt = container.querySelector("[data-tool-deck]");
    expect(hunt?.className).toMatch(/w-full/);
    expect(hunt?.className).toMatch(/min-h-11/);
  });

  it("sizes hunt chips as equal flex without edge history islands", () => {
    expect(chromeCss).not.toMatch(/\.jl-map-island--history-start/);
    expect(chromeCss).not.toMatch(/\.jl-map-island--history-end/);
    expect(chromeCss).toMatch(
      /\.jl-map-island\s+\.jl-tool-dock-group-main\s+\.jl-tool-slot\s*\{[^}]*flex:\s*1\s+1\s+0/s,
    );
  });

  it("anchors container-inset map controls to --dock-height token", () => {
    expect(controlsCss).toMatch(
      /\.map-zoom-control--container,\s*\.map-style-control--container\s*\{[^}]*bottom:\s*var\(--dock-height\)/s,
    );
    expect(controlsCss).not.toMatch(/map-recenter-control/);
    expect(controlsCss).not.toMatch(
      /\.map-zoom-control--container[^}]*bottom:\s*4\.25rem/s,
    );
  });
});
