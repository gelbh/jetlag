import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { AskHudHost } from "./AskHudHost";

const hostProps = {
  open: true,
  cue: "Pick a direction",
  toolLabel: "Radar",
  costLabel: "1 token",
  canCommit: true,
  commitLabel: "Send",
  onCommit: vi.fn(),
  onDismiss: vi.fn(),
};

function renderHost(ui: ReactElement) {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      {ui}
    </MantineProvider>,
  );
}

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
  it("presents SheetHost dialog when mounted", async () => {
    renderHost(<AskHudHost {...hostProps} modeBody={<div>Mode body</div>} />);

    await waitFor(() => {
      expect(screen.getByTestId("ask-hud-host")).toBeInTheDocument();
      expect(screen.getByRole("dialog")).toBeVisible();
    });
  });

  it("mounts iOS SheetHost drawer", async () => {
    renderHost(<AskHudHost {...hostProps} modeBody={<div>Mode body</div>} />);

    const host = screen.getByTestId("ask-hud-host");
    expect(host.getAttribute("data-ask-composition")).toBe("ask-first");
    expect(host.getAttribute("data-survey")).toBeNull();
    await waitFor(() => {
      expect(screen.getByTestId("mantine-drawer-sheet")).toBeInTheDocument();
    });
    expect(screen.getByText("Mode body")).toBeInTheDocument();
    expect(screen.getByTestId("ask-commit-strip")).toBeInTheDocument();
  });

  it("dismisses via blurred map overlay click", async () => {
    renderHost(<AskHudHost {...hostProps} modeBody={<div>Mode body</div>} />);

    await waitFor(() => {
      expect(document.querySelector(".mantine-Drawer-overlay")).toBeTruthy();
    });
    const overlay = document.querySelector(".mantine-Drawer-overlay");
    expect((overlay as HTMLElement).style.pointerEvents).not.toBe("none");
    fireEvent.mouseDown(overlay!);
    fireEvent.click(overlay!);
    expect(hostProps.onDismiss).toHaveBeenCalled();
  });

  it("hides muted commit strip on sheet until ready", async () => {
    renderHost(
      <AskHudHost
        {...hostProps}
        canCommit={false}
        commitLabel="ASK - PICK CATEGORY"
        modeBody={<div>Mode body</div>}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("mantine-drawer-sheet")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("ask-commit-strip")).toBeNull();
    expect(screen.queryByText(/ASK —/i)).toBeNull();
  });

  it("can hide cue and cost chip for Matching sheet composition", async () => {
    renderHost(
      <AskHudHost
        {...hostProps}
        cue="PICK CATEGORY"
        showCue={false}
        showCostChip={false}
        modeBody={<div>Mode body</div>}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("mantine-drawer-sheet")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("ask-mode-cue-ticker")).toBeNull();
    expect(screen.queryByTestId("ask-cost-chip")).toBeNull();
    expect(screen.queryByText("PICK CATEGORY")).toBeNull();
  });

  it("keeps host mounted when open is false and gates body", () => {
    renderHost(<AskHudHost {...hostProps} open={false} modeBody={<div>Mode body</div>} />);

    expect(screen.getByTestId("ask-hud-host")).toBeInTheDocument();
    expect(screen.queryByText("Mode body")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
