import { fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { AskHudHost } from "./AskHudHost";

vi.mock("@/hooks/layout/useDesktopLayout", () => ({
  useDesktopLayout: () => false,
}));

const hostProps = {
  cue: "Pick a direction",
  toolLabel: "Radar",
  costLabel: "1 token",
  canCommit: true,
  commitLabel: "Send",
  onCommit: vi.fn(),
  onDismiss: vi.fn(),
};

beforeEach(() => {
  hostProps.onDismiss = vi.fn();
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  }));
});

describe("AskHudHost", () => {
  it("mounts iOS SheetHost drawer", () => {
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <AskHudHost {...hostProps} modeBody={<div>Mode body</div>} />
      </MantineProvider>,
    );

    const host = screen.getByTestId("ask-hud-host");
    expect(host.getAttribute("data-ask-composition")).toBe("ask-first");
    expect(host.getAttribute("data-survey")).toBeNull();
    expect(screen.getByTestId("mantine-drawer-sheet")).toBeInTheDocument();
    expect(screen.getByText("Mode body")).toBeInTheDocument();
    expect(screen.getByTestId("ask-commit-strip")).toBeInTheDocument();
  });

  it("dismisses via blurred map overlay click", () => {
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <AskHudHost {...hostProps} modeBody={<div>Mode body</div>} />
      </MantineProvider>,
    );

    const overlay = document.querySelector(".mantine-Drawer-overlay");
    expect(overlay).toBeTruthy();
    expect((overlay as HTMLElement).style.pointerEvents).not.toBe("none");
    fireEvent.mouseDown(overlay!);
    fireEvent.click(overlay!);
    expect(hostProps.onDismiss).toHaveBeenCalled();
  });

  it("hides muted commit strip on sheet until ready", () => {
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <AskHudHost
          {...hostProps}
          canCommit={false}
          commitLabel="ASK - PICK CATEGORY"
          modeBody={<div>Mode body</div>}
        />
      </MantineProvider>,
    );

    expect(screen.queryByTestId("ask-commit-strip")).toBeNull();
    expect(screen.queryByText(/ASK —/i)).toBeNull();
  });

  it("can hide cue and cost chip for Matching sheet composition", () => {
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <AskHudHost
          {...hostProps}
          cue="PICK CATEGORY"
          showCue={false}
          showCostChip={false}
          modeBody={<div>Mode body</div>}
        />
      </MantineProvider>,
    );

    expect(screen.queryByTestId("ask-mode-cue-ticker")).toBeNull();
    expect(screen.queryByTestId("ask-cost-chip")).toBeNull();
    expect(screen.queryByText("PICK CATEGORY")).toBeNull();
  });
});
