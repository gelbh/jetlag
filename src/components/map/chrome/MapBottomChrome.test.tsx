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

  it("stacks map controls on the left and sits the side stack above the hunt island", () => {
    expect(chromeCss).not.toMatch(/--map-chrome-zoom-stack-height/);
    expect(chromeCss).toMatch(
      /\.jl-map-chrome-side-stack\s*\{[^}]*bottom:\s*calc\(\s*var\(--dock-island-height\)\s*\+\s*env\(safe-area-inset-bottom\)\s*\+\s*0\.75rem\s*\)/s,
    );
    expect(chromeCss).toMatch(
      /\.map-zoom-control,\s*\.map-style-control,\s*\.map-recenter-control\s*\{[^}]*left:\s*var\(--map-left-chrome-inset\)/s,
    );
    expect(chromeCss).toMatch(
      /\.map-zoom-control--dock\s*\{[^}]*--map-style-control-size/s,
    );
    expect(chromeCss).toMatch(
      /\.map-recenter-control--dock\s*\{[^}]*--map-zoom-btn-size/s,
    );
    expect(chromeCss).toMatch(/@media\s*\(max-width:\s*28rem\)/);
    expect(chromeCss).toMatch(
      /@media\s*\(max-height:\s*430px\)\s*and\s*\(orientation:\s*landscape\)/,
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

  it("sizes hunt chips as equal flex without edge history islands", () => {
    expect(chromeCss).not.toMatch(/\.jl-map-island--history-start/);
    expect(chromeCss).not.toMatch(/\.jl-map-island--history-end/);
    expect(chromeCss).toMatch(
      /\.jl-map-island\s+\.jl-tool-dock-group-main\s+\.jl-tool-slot\s*\{[^}]*flex:\s*1\s+1\s+0/s,
    );
    expect(chromeCss).toMatch(
      /\.jl-map-chrome-bottom-band\s*\{[^}]*justify-content:\s*center/s,
    );
  });

  it("anchors container-inset zoom/style to --dock-height; recenter stacks separately", () => {
    expect(controlsCss).toMatch(
      /\.map-zoom-control--container,\s*\.map-style-control--container\s*\{[^}]*bottom:\s*var\(--dock-height\)/s,
    );
    expect(controlsCss).not.toMatch(
      /\.map-zoom-control--container,\s*\.map-style-control--container,\s*\.map-recenter-control--container/,
    );
    expect(controlsCss).not.toMatch(
      /\.map-zoom-control--container[^}]*bottom:\s*4\.25rem/s,
    );
    expect(chromeCss).toMatch(
      /\.map-recenter-control--container\s*\{[^}]*var\(--dock-height\)/s,
    );
  });
});
