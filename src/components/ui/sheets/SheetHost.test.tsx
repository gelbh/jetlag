import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect, useState, type ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { SheetHost } from "./SheetHost";
import {
  ContextualRailPanelProvider,
} from "../../map/chrome/ContextualRailContext";
import { useContextualRailPanel } from "../../map/helpers/useContextualRailPanel";
import { jetlagTheme } from "@/theme/theme";

const useDesktopLayout = vi.fn();
vi.mock("../../../hooks/layout/useDesktopLayout", () => ({
  DESKTOP_LAYOUT_MIN_WIDTH_PX: 1024,
  useDesktopLayout: () => useDesktopLayout(),
}));

function RailPanelMount({ children }: { children: ReactNode }) {
  const rail = useContextualRailPanel();
  const setPanelEl = rail?.setPanelEl;
  useEffect(() => {
    if (!setPanelEl) {
      return;
    }
    const el = document.createElement("div");
    el.setAttribute("data-testid", "rail-panel");
    document.body.appendChild(el);
    setPanelEl(el);
    return () => {
      setPanelEl(null);
      el.remove();
    };
  }, [setPanelEl]);
  return <>{children}</>;
}

function withAppUi(ui: ReactNode) {
  return (
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      {ui}
    </MantineProvider>
  );
}

describe("SheetHost", () => {
  beforeEach(() => {
    useDesktopLayout.mockReset();
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }));
  });

  it("uses Mantine Drawer under 1024", () => {
    useDesktopLayout.mockReturnValue(false);
    render(
      withAppUi(
        <SheetHost open onClose={() => {}} ariaLabel="Settings" railTab="settings">
          <p>mantine body</p>
        </SheetHost>,
      ),
    );
    expect(screen.queryByTestId("radix-motion-sheet")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByText("mantine body")).toBeInTheDocument();
    expect(screen.getByTestId("mantine-drawer-sheet")).toBeInTheDocument();
  });

  it("portals into contextual rail on desktop even when flag on", async () => {
    useDesktopLayout.mockReturnValue(true);
    render(
      withAppUi(
        <ContextualRailPanelProvider>
          <RailPanelMount>
            <SheetHost
              open
              onClose={() => {}}
              ariaLabel="Settings"
              railTab="settings"
            >
              <p>rail body</p>
            </SheetHost>
          </RailPanelMount>
        </ContextualRailPanelProvider>,
      ),
    );
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
    });
    expect(screen.queryByTestId("radix-motion-sheet")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mantine-drawer-sheet")).not.toBeInTheDocument();
    expect(screen.getByText("rail body")).toBeInTheDocument();
    expect(
      screen.getByTestId("rail-panel").contains(screen.getByText("rail body")),
    ).toBe(true);
  });

  it("portals into contextual rail on desktop", async () => {
    useDesktopLayout.mockReturnValue(true);
    render(
      <ContextualRailPanelProvider>
        <RailPanelMount>
          <SheetHost
            open
            onClose={() => {}}
            ariaLabel="Settings"
            railTab="settings"
          >
            <p>rail body</p>
          </SheetHost>
        </RailPanelMount>
      </ContextualRailPanelProvider>,
    );
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
    });
    expect(screen.queryByTestId("radix-motion-sheet")).not.toBeInTheDocument();
    expect(screen.getByText("rail body")).toBeInTheDocument();
    expect(
      screen.getByTestId("rail-panel").contains(screen.getByText("rail body")),
    ).toBe(true);
  });

  it("renders nothing on desktop when closed", async () => {
    useDesktopLayout.mockReturnValue(true);
    render(
      <ContextualRailPanelProvider>
        <RailPanelMount>
          <SheetHost
            open={false}
            onClose={() => {}}
            ariaLabel="Settings"
            railTab="settings"
          >
            <p>hidden</p>
          </SheetHost>
        </RailPanelMount>
      </ContextualRailPanelProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("rail-panel")).toBeInTheDocument();
    });
    expect(screen.queryByText("hidden")).not.toBeInTheDocument();
  });

  it("closes via overlay when sheet requests close", () => {
    useDesktopLayout.mockReturnValue(false);
    const onClose = vi.fn();
    render(
      withAppUi(
        <SheetHost open onClose={onClose} ariaLabel="Settings" railTab="settings">
          <p>body</p>
        </SheetHost>,
      ),
    );
    const overlay = document.querySelector(".mantine-Drawer-overlay");
    expect(overlay).toBeTruthy();
    fireEvent.mouseDown(overlay!);
    fireEvent.click(overlay!);
    expect(onClose).toHaveBeenCalled();
  });

  it("uses overlay path on desktop when railTab is omitted", () => {
    useDesktopLayout.mockReturnValue(true);
    render(
      withAppUi(
        <SheetHost open onClose={() => {}} ariaLabel="Map tools guide">
          <p>first-run</p>
        </SheetHost>,
      ),
    );
    expect(screen.queryByTestId("radix-motion-sheet")).not.toBeInTheDocument();
    expect(screen.getByTestId("mantine-drawer-sheet")).toBeInTheDocument();
    expect(screen.getByText("first-run")).toBeInTheDocument();
  });

  it("uses Mantine Drawer on desktop overlay when railTab omitted", () => {
    useDesktopLayout.mockReturnValue(true);
    render(
      withAppUi(
        <SheetHost open onClose={() => {}} ariaLabel="Map tools guide">
          <p>first-run</p>
        </SheetHost>,
      ),
    );
    expect(screen.queryByTestId("radix-motion-sheet")).not.toBeInTheDocument();
    expect(screen.getByTestId("mantine-drawer-sheet")).toBeInTheDocument();
    expect(screen.getByText("first-run")).toBeInTheDocument();
  });

  it("waits for rail panel on desktop when railTab is set", () => {
    useDesktopLayout.mockReturnValue(true);
    render(
      <ContextualRailPanelProvider>
        <SheetHost open onClose={() => {}} ariaLabel="Settings" railTab="settings">
          <p>pending rail</p>
        </SheetHost>
      </ContextualRailPanelProvider>,
    );
    expect(screen.queryByText("pending rail")).not.toBeInTheDocument();
    expect(screen.queryByTestId("radix-motion-sheet")).not.toBeInTheDocument();
  });

  /**
   * Program Verify #4: after closing MapSettings/MapFirstRun-style sheet under
   * flag on, map pointer events must still reach a map target (no leftover overlay).
   */
  it("restores map pointer events after Mantine Drawer closes (Verify #4)", async () => {
    useDesktopLayout.mockReturnValue(false);
    const mapHit = vi.fn();

    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button
            type="button"
            data-testid="map-target"
            style={{ pointerEvents: "auto" }}
            onClick={mapHit}
          >
            map
          </button>
          <SheetHost
            open={open}
            onClose={() => setOpen(false)}
            ariaLabel="Settings"
          >
            <p>settings body</p>
            <button type="button" onClick={() => setOpen(false)}>
              close-sheet
            </button>
          </SheetHost>
        </>
      );
    }

    render(withAppUi(<Harness />));

    expect(screen.getByTestId("mantine-drawer-sheet")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "close-sheet" }));

    await waitFor(() => {
      expect(screen.queryByTestId("mantine-drawer-sheet")).not.toBeInTheDocument();
    });
    expect(screen.queryByRole("dialog", { name: "Settings" })).not.toBeInTheDocument();

    const leftoverOverlay = document.querySelector(
      ".mantine-Drawer-overlay, .mantine-Modal-overlay, [data-mantine-overlay]",
    );
    expect(leftoverOverlay).toBeNull();

    fireEvent.click(screen.getByTestId("map-target"));
    expect(mapHit).toHaveBeenCalledTimes(1);
  });

  it("applies consumer maxHeightClassName on Mantine Drawer content", () => {
    useDesktopLayout.mockReturnValue(false);
    render(
      withAppUi(
        <SheetHost
          open
          onClose={() => {}}
          ariaLabel="Tall settings"
          maxHeightClassName="max-h-[min(85dvh,760px)]"
        >
          <p>tall body</p>
        </SheetHost>,
      ),
    );
    const content = document.querySelector(".mantine-drawer-sheet");
    expect(content?.className).toMatch(/max-h-\[min\(85dvh,760px\)\]/);
  });
});
