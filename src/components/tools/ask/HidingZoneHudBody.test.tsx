import type { ReactElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { AskHudHost } from "./AskHudHost";
import { HidingZoneHudBody } from "./HidingZoneHudBody";
import type { HidingZoneToolPanelState } from "@/components/hider/hidingZoneToolPanelState";

beforeEach(() => {
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

function renderHud(ui: ReactElement) {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      {ui}
    </MantineProvider>,
  );
}

function baseZoneTool(
  overrides: Partial<HidingZoneToolPanelState> = {},
): HidingZoneToolPanelState {
  return {
    query: "",
    setQuery: vi.fn(),
    stations: [],
    stationsLoading: false,
    stationsError: null,
    selectedStation: null,
    setSelectedStation: vi.fn(),
    clearStationSelection: vi.fn(),
    manualMode: false,
    methodChosen: false,
    choosePlacementMethod: vi.fn(),
    manualCenter: null,
    hasPlacement: false,
    confirmZone: vi.fn(),
    saving: false,
    error: null,
    ...overrides,
  };
}

describe("HidingZoneHudBody", () => {
  it("shows method chips without PhaseRail or CONTINUE", () => {
    const choosePlacementMethod = vi.fn();
    const onSearchThisArea = vi.fn();

    renderHud(
      <HidingZoneHudBody
        moveMode={false}
        radiusLabel="200 m"
        zoneTool={baseZoneTool({ choosePlacementMethod })}
        onStepChange={vi.fn()}
        onSearchThisArea={onSearchThisArea}
      />,
    );

    expect(screen.getByTestId("hiding-zone-hud-body")).toBeInTheDocument();
    expect(screen.getByTestId("ask-chip-island")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Wizard phases" })).toBeNull();
    expect(screen.queryByRole("button", { name: /continue/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /^Station$/i }));
    expect(choosePlacementMethod).toHaveBeenCalledWith(false);
    expect(onSearchThisArea).not.toHaveBeenCalled();
  });

  it("stays method-only in the sheet (no place/confirm panels)", () => {
    renderHud(
      <AskHudHost
        cue="CHOOSE METHOD"
        toolLabel="Hiding zone"
        showCostChip={false}
        canCommit={false}
        commitLabel="CONFIRM"
        onCommit={vi.fn()}
        modeBody={
          <HidingZoneHudBody
            moveMode={false}
            radiusLabel="200 m"
            zoneTool={baseZoneTool()}
            onStepChange={vi.fn()}
            onSearchThisArea={vi.fn()}
          />
        }
      />,
    );

    expect(screen.getByTestId("ask-hud-host")).toBeInTheDocument();
    expect(screen.getByTestId("hiding-zone-hud-body")).toBeInTheDocument();
    expect(screen.queryByText(/Tap the map inside the play area/i)).toBeNull();
    expect(
      screen.queryByRole("button", { name: /search stations in this area/i }),
    ).toBeNull();
  });

  it("reports method step while chips are shown", () => {
    const onStepChange = vi.fn();
    renderHud(
      <HidingZoneHudBody
        moveMode={false}
        radiusLabel="200 m"
        zoneTool={baseZoneTool()}
        onStepChange={onStepChange}
        onSearchThisArea={vi.fn()}
      />,
    );
    expect(onStepChange).toHaveBeenCalledWith("method");
  });
});
