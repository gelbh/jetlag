import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect, type ReactNode } from "react";
import { SheetHost } from "./SheetHost";
import {
  ContextualRailPanelProvider,
} from "../map/ContextualRailContext";
import { useContextualRailPanel } from "../map/useContextualRailPanel";

const useDesktopLayout = vi.fn();
vi.mock("../../hooks/useDesktopLayout", () => ({
  useDesktopLayout: () => useDesktopLayout(),
}));

vi.mock("../motion/MotionSheet", () => ({
  MotionSheet: ({
    open,
    children,
    ariaLabel,
  }: {
    open: boolean;
    children: ReactNode;
    ariaLabel?: string;
  }) =>
    open ? (
      <div role="dialog" aria-label={ariaLabel} data-testid="motion-sheet">
        {children}
      </div>
    ) : null,
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

describe("SheetHost", () => {
  beforeEach(() => {
    useDesktopLayout.mockReset();
  });

  it("uses MotionSheet under 1024", () => {
    useDesktopLayout.mockReturnValue(false);
    render(
      <SheetHost open onClose={() => {}} ariaLabel="Settings" railTab="settings">
        <p>body</p>
      </SheetHost>,
    );
    expect(screen.getByTestId("motion-sheet")).toBeInTheDocument();
    expect(screen.getByText("body")).toBeInTheDocument();
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
    expect(screen.queryByTestId("motion-sheet")).not.toBeInTheDocument();
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
});
