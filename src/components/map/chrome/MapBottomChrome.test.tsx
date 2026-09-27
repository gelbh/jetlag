import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MapBottomChrome } from "./MapBottomChrome";
import { ToolDeckGroup } from "@/components/tools/ToolDeck";
import { jetlagTheme } from "@/theme/theme";

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

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false, media: query, onchange: null,
    addListener() {}, removeListener() {},
    addEventListener() {}, removeEventListener() {},
    dispatchEvent: () => false,
  }));
});

function renderChrome(ui: React.ReactElement) {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      {ui}
    </MantineProvider>,
  );
}

describe("MapBottomChrome", () => {
  it("renders provided islands and omits empty ones", () => {
    renderChrome(
      <MapBottomChrome
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
    const { container } = renderChrome(
      <MapBottomChrome hunt={<button type="button">Radar</button>} />,
    );
    expect(container.querySelector('[data-island="history-start"]')).toBeNull();
    expect(container.querySelector('[data-island="history-end"]')).toBeNull();
    expect(container.querySelector('[data-island="hunt"]')).not.toBeNull();
  });

  it("wraps phone chrome in OverlayHost with safe-area pad", () => {
    const { container } = renderChrome(
      <MapBottomChrome hunt={<button type="button">Radar</button>} />,
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

  it("marks chrome inactive without leaving islands clickable via CSS class", () => {
    const { container } = renderChrome(
      <MapBottomChrome
        inactive
        hunt={<button type="button">Radar</button>}
      />,
    );
    expect(
      container.querySelector(".jl-map-bottom-chrome--inactive"),
    ).not.toBeNull();
  });

  it("puts hunt in the bottom band and session/map-controls in the side stack", () => {
    const { container } = renderChrome(
      <MapBottomChrome
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
    const { container } = renderChrome(
      <MapBottomChrome hunt={<button type="button">Radar</button>} />,
    );
    const side = container.querySelector(".jl-map-chrome-side-stack");
    expect(side).not.toBeNull();
    expect(side?.childElementCount).toBe(0);
    expect(container.querySelector(".jl-map-chrome-bottom-band")).not.toBeNull();
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
    const { container } = renderChrome(
      <MapBottomChrome hunt={<button type="button">Radar</button>} />,
    );
    const chrome = container.querySelector(".jl-map-bottom-chrome");
    expect(chrome?.getAttribute("data-hunt-density")).toBe("tools");
    expect(
      container.querySelector(".jl-map-bottom-chrome--hunt-sparse"),
    ).toBeNull();
    expect(container.querySelector(".jl-map-island--hunt-sparse")).toBeNull();
  });

  it("applies sparse hunt density modifiers", () => {
    const { container } = renderChrome(
      <MapBottomChrome
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
    const { container } = renderChrome(
      <MapBottomChrome
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
    const side = container.querySelector('[data-testid="map-side-dock-stack"]');
    expect(side).not.toBeNull();
    expect(side?.className).toMatch(/jl-map-chrome-side-stack--phone/);
    expect(side?.className).toMatch(/jl-map-chrome-side-stack--fixed/);
    expect(side?.getAttribute("data-side")).toBe("right");
    const hunt = container.querySelector("[data-tool-deck]");
    expect(hunt?.className).toMatch(/w-full/);
    expect(hunt?.className).toMatch(/min-h-11/);
  });

  it("uses a draggable L/R side stack under Mantine and flips map chrome CSS", () => {
    const { container } = renderChrome(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <MapBottomChrome
          hunt={<button type="button">Radar</button>}
          session={<button type="button">Chat</button>}
        />
      </MantineProvider>,
    );
    const side = container.querySelector('[data-testid="map-side-dock-stack"]');
    expect(side).not.toBeNull();
    expect(side?.getAttribute("data-side")).toBe("right");
    expect(side?.getAttribute("data-anchor")).toBe("bottom-right");
    expect(side?.getAttribute("data-chrome-side-stack")).toBe("phone");
    expect(chromeCss).toMatch(
      /html\[data-map-side-dock="bottom-left"\]\s*\.map-zoom-control/,
    );
    expect(chromeCss).toMatch(/--map-right-chrome-inset/);
    expect(chromeCss).toMatch(/\[data-side="left"\]/);
  });

  it("sizes hunt chips as equal flex without edge history islands", () => {
    expect(chromeCss).not.toMatch(/jl-tool-dock(?!-)/);
    expect(chromeCss).not.toMatch(/\.jl-map-island--history-start/);
    expect(chromeCss).not.toMatch(/\.jl-map-island--history-end/);
    expect(chromeCss).toMatch(/jl-map-chrome-side-stack--fixed/);
    const { container } = renderChrome(
      <MapBottomChrome
        hunt={
          <ToolDeckGroup>
            <button type="button" className="jl-tool-slot">
              A
            </button>
            <button type="button" className="jl-tool-slot">
              B
            </button>
          </ToolDeckGroup>
        }
      />,
    );
    const group = container.querySelector(".jl-tool-dock-group-main");
    expect(group?.className).toMatch(/flex-1/);
    expect(group?.className).toMatch(/justify-evenly/);
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

describe("MapBottomChrome Mantine", () => {
  it("mounts Mantine chrome and keeps OverlayHost pointer-events-none", () => {
    const { container } = renderChrome(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <MapBottomChrome
          hunt={<button type="button">Radar</button>}
          session={<button type="button">Chat</button>}
        />
      </MantineProvider>,
    );
    expect(container.querySelector('[data-testid="map-bottom-chrome-mantine"]')).not.toBeNull();
    const host = container.querySelector("[data-overlay-host]");
    expect(host?.className).toMatch(/pointer-events-none/);
  });

  it("keeps Mantine side islands clickable under pointer-events-none chrome", () => {
    const { container } = renderChrome(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <MapBottomChrome
          hunt={<button type="button">Radar</button>}
          session={<button type="button">Chat</button>}
        />
      </MantineProvider>,
    );
    const sessionIsland = container.querySelector('[data-island="session"]');
    expect(sessionIsland?.className).toMatch(/pointer-events-auto/);
    expect(screen.getByRole("button", { name: "Chat" })).toBeInTheDocument();
  });

  it("hides hunt and side docks when ask-first is active", () => {
    const { container } = renderChrome(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <MapBottomChrome
          askFirst
          hunt={<button type="button">Radar</button>}
          session={<button type="button">Chat</button>}
          mapControls={<button type="button">Zoom</button>}
        />
      </MantineProvider>,
    );
    expect(container.querySelector('[data-island="hunt"]')).toBeNull();
    expect(container.querySelector('[data-island="session"]')).toBeNull();
    expect(container.querySelector('[data-island="map-controls"]')).toBeNull();
    expect(container.querySelector(".jl-map-chrome-side-stack")).toBeNull();
    expect(
      container.querySelector('[data-overlay-chrome][data-ask-first="true"]'),
    ).not.toBeNull();
  });

  it("keeps Mantine hunt ToolDeck clickable under pointer-events-none chrome", () => {
    const { container } = renderChrome(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <MapBottomChrome
          hunt={<button type="button">Radar</button>}
        />
      </MantineProvider>,
    );
    const hunt = container.querySelector('[data-tool-deck][data-island="hunt"]');
    expect(hunt?.className).toMatch(/pointer-events-auto/);
    expect(screen.getByRole("button", { name: "Radar" })).toBeInTheDocument();
  });
});
