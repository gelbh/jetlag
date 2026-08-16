import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect, type ReactNode } from "react";
import { SheetHost } from "./SheetHost";
import {
  ContextualRailPanelProvider,
} from "../../map/chrome/ContextualRailContext";
import { useContextualRailPanel } from "../../map/helpers/useContextualRailPanel";
import { setPlayerUxWorldFlagForTests } from "@/services/core/analytics/playerUxWorldFlag";

const useDesktopLayout = vi.fn();
vi.mock("../../../hooks/layout/useDesktopLayout", () => ({
  DESKTOP_LAYOUT_MIN_WIDTH_PX: 1024,
  useDesktopLayout: () => useDesktopLayout(),
}));

vi.mock("posthog-js", () => ({
  default: {
    isFeatureEnabled: () => undefined,
    onFeatureFlags: () => () => {},
  },
}));

vi.mock("../../motion/MotionSheet", () => ({
  MotionSheet: ({
    open,
    children,
    ariaLabel,
    onClose,
  }: {
    open: boolean;
    children: ReactNode;
    ariaLabel?: string;
    onClose: () => void;
  }) =>
    open ? (
      <div role="dialog" aria-label={ariaLabel} data-testid="motion-sheet">
        <button type="button" onClick={onClose}>
          close-legacy
        </button>
        {children}
      </div>
    ) : null,
}));

vi.mock("./RacMotionSheet", () => ({
  RacMotionSheet: ({
    open,
    children,
    ariaLabel,
    onClose,
  }: {
    open: boolean;
    children: ReactNode;
    ariaLabel?: string;
    onClose: () => void;
  }) =>
    open ? (
      <div role="dialog" aria-label={ariaLabel} data-testid="rac-motion-sheet">
        <button type="button" onClick={onClose}>
          close-rac
        </button>
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
    setPlayerUxWorldFlagForTests(null);
  });

  it("uses legacy MotionSheet under 1024 when flag is off", () => {
    useDesktopLayout.mockReturnValue(false);
    setPlayerUxWorldFlagForTests(false);
    render(
      <SheetHost open onClose={() => {}} ariaLabel="Settings" railTab="settings">
        <p>body</p>
      </SheetHost>,
    );
    expect(screen.getByTestId("motion-sheet")).toBeInTheDocument();
    expect(screen.queryByTestId("rac-motion-sheet")).not.toBeInTheDocument();
    expect(screen.getByText("body")).toBeInTheDocument();
  });

  it("uses RacMotionSheet under 1024 when flag is on", () => {
    useDesktopLayout.mockReturnValue(false);
    setPlayerUxWorldFlagForTests(true);
    render(
      <SheetHost open onClose={() => {}} ariaLabel="Settings" railTab="settings">
        <p>flag body</p>
      </SheetHost>,
    );
    expect(screen.getByTestId("rac-motion-sheet")).toBeInTheDocument();
    expect(screen.queryByTestId("motion-sheet")).not.toBeInTheDocument();
  });

  it("portals into contextual rail on desktop regardless of flag", async () => {
    useDesktopLayout.mockReturnValue(true);
    setPlayerUxWorldFlagForTests(true);
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
    expect(screen.queryByTestId("rac-motion-sheet")).not.toBeInTheDocument();
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

  it("closes via control when flag-on sheet requests close", () => {
    useDesktopLayout.mockReturnValue(false);
    setPlayerUxWorldFlagForTests(true);
    const onClose = vi.fn();
    render(
      <SheetHost open onClose={onClose} ariaLabel="Settings" railTab="settings">
        <p>body</p>
      </SheetHost>,
    );
    fireEvent.click(screen.getByRole("button", { name: "close-rac" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("uses overlay path on desktop when railTab is omitted", () => {
    useDesktopLayout.mockReturnValue(true);
    setPlayerUxWorldFlagForTests(true);
    render(
      <SheetHost open onClose={() => {}} ariaLabel="Map tools guide">
        <p>first-run</p>
      </SheetHost>,
    );
    expect(screen.getByTestId("rac-motion-sheet")).toBeInTheDocument();
    expect(screen.getByText("first-run")).toBeInTheDocument();
  });

  it("waits for rail panel on desktop when railTab is set", () => {
    useDesktopLayout.mockReturnValue(true);
    setPlayerUxWorldFlagForTests(true);
    render(
      <ContextualRailPanelProvider>
        <SheetHost open onClose={() => {}} ariaLabel="Settings" railTab="settings">
          <p>pending rail</p>
        </SheetHost>
      </ContextualRailPanelProvider>,
    );
    expect(screen.queryByText("pending rail")).not.toBeInTheDocument();
    expect(screen.queryByTestId("rac-motion-sheet")).not.toBeInTheDocument();
  });

  it("uses legacy overlay on desktop without rail when flag is off", () => {
    useDesktopLayout.mockReturnValue(true);
    setPlayerUxWorldFlagForTests(false);
    render(
      <SheetHost open onClose={() => {}} ariaLabel="Map tools guide">
        <p>legacy first-run</p>
      </SheetHost>,
    );
    expect(screen.getByTestId("motion-sheet")).toBeInTheDocument();
    expect(screen.queryByTestId("rac-motion-sheet")).not.toBeInTheDocument();
  });
});
