import type { ReactElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import type { HidingZoneToolPanelState } from "@/components/hider/hidingZoneToolPanelState";
import { HidingZoneMapPlacementChrome } from "./HidingZoneMapPlacementChrome";

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

describe("HidingZoneMapPlacementChrome", () => {
  it("renders map-placement root and confirm without AskHudHost sheet markers", () => {
    renderHud(
      <HidingZoneMapPlacementChrome
        moveMode={false}
        radiusLabel="200 m"
        zoneTool={baseZoneTool({
          methodChosen: true,
          manualMode: true,
          manualCenter: [53.3, -6.2],
          hasPlacement: true,
        })}
        onSearchThisArea={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getByTestId("hiding-zone-map-placement")).toBeInTheDocument();
    expect(screen.queryByTestId("hiding-zone-hud-body")).toBeNull();
    expect(screen.queryByTestId("ask-hud-host")).toBeNull();
    expect(screen.queryByTestId("hiding-zone-map-placement-cta")).toBeNull();
  });

  it("keeps the map canvas clickable via pointer-events-none root", () => {
    renderHud(
      <HidingZoneMapPlacementChrome
        moveMode={false}
        radiusLabel="200 m"
        zoneTool={baseZoneTool({
          methodChosen: true,
          manualMode: true,
          hasPlacement: false,
        })}
        onSearchThisArea={vi.fn()}
      />,
    );
    const root = screen.getByTestId("hiding-zone-map-placement");
    expect(root.className).toMatch(/pointer-events-none/);
  });

  it("confirms via overlay commit when placement is ready", () => {
    const confirmZone = vi.fn();
    renderHud(
      <HidingZoneMapPlacementChrome
        moveMode={false}
        radiusLabel="200 m"
        zoneTool={baseZoneTool({
          methodChosen: true,
          manualMode: true,
          manualCenter: [53.35, -6.26],
          hasPlacement: true,
          confirmZone,
        })}
        onSearchThisArea={vi.fn()}
      />,
    );

    expect(screen.getByText(/Dropped on the map/i)).toBeInTheDocument();
    expect(screen.queryByText(/Map ·/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Confirm$/i }));
    expect(confirmZone).toHaveBeenCalledTimes(1);
  });

  it("omits mid prompt on manual place so the banner owns the verb", () => {
    renderHud(
      <HidingZoneMapPlacementChrome
        moveMode={false}
        radiusLabel="200 m"
        zoneTool={baseZoneTool({
          methodChosen: true,
          manualMode: true,
          hasPlacement: false,
        })}
        onSearchThisArea={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("hiding-zone-map-placement-mid")).toBeNull();
    expect(
      screen.getByText(/Tap the map inside the play area/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^Radius:/i)).toBeNull();
  });

  it("reports place/confirm step so map picks stay live", () => {
    const onStepChange = vi.fn();
    renderHud(
      <HidingZoneMapPlacementChrome
        moveMode={false}
        radiusLabel="200 m"
        zoneTool={baseZoneTool({
          methodChosen: true,
          manualMode: true,
          hasPlacement: false,
        })}
        onStepChange={onStepChange}
        onSearchThisArea={vi.fn()}
      />,
    );
    expect(onStepChange).toHaveBeenCalledWith("location");
  });

  it("disables Confirm when writesEnabled is false", () => {
    const confirmZone = vi.fn();
    renderHud(
      <HidingZoneMapPlacementChrome
        moveMode={false}
        radiusLabel="200 m"
        zoneTool={baseZoneTool({
          methodChosen: true,
          manualMode: true,
          manualCenter: [53.35, -6.26],
          hasPlacement: true,
          confirmZone,
        })}
        writesEnabled={false}
        onSearchThisArea={vi.fn()}
      />,
    );

    const confirm = screen.getByRole("button", { name: /^Confirm$/i });
    expect(confirm).toBeDisabled();
    fireEvent.click(confirm);
    expect(confirmZone).not.toHaveBeenCalled();
  });

  it("reports confirm step when placement already exists (move/handoff)", () => {
    const onStepChange = vi.fn();
    renderHud(
      <HidingZoneMapPlacementChrome
        moveMode
        radiusLabel="200 m"
        zoneTool={baseZoneTool({
          methodChosen: true,
          manualMode: true,
          hasPlacement: true,
          manualCenter: [53.3, -6.2],
        })}
        onStepChange={onStepChange}
        onSearchThisArea={vi.fn()}
      />,
    );
    expect(onStepChange).toHaveBeenCalledWith("confirm");
  });

  it("backs to method via change-configure when not moveMode", () => {
    const onBackToMethod = vi.fn();
    renderHud(
      <HidingZoneMapPlacementChrome
        moveMode={false}
        radiusLabel="200 m"
        zoneTool={baseZoneTool({
          methodChosen: true,
          manualMode: true,
          hasPlacement: false,
        })}
        onBackToMethod={onBackToMethod}
        onSearchThisArea={vi.fn()}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Change placement method/i }),
    );
    expect(onBackToMethod).toHaveBeenCalledTimes(1);
  });

  it("shows station picker in map-first chrome when station method chosen", () => {
    const onSearchThisArea = vi.fn();
    renderHud(
      <HidingZoneMapPlacementChrome
        moveMode={false}
        radiusLabel="200 m"
        zoneTool={baseZoneTool({
          methodChosen: true,
          manualMode: false,
          selectedStation: null,
          hasPlacement: false,
        })}
        onSearchThisArea={onSearchThisArea}
      />,
    );

    expect(screen.getByTestId("hiding-zone-map-placement")).toBeInTheDocument();
    expect(screen.queryByTestId("hiding-zone-hud-body")).toBeNull();
    expect(screen.queryByTestId("ask-hud-host")).toBeNull();
    // Live TransitStationPicker uses a plain text input (placeholder), not role=searchbox.
    expect(
      screen.getByPlaceholderText(/search stations/i),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /search stations in this area/i }),
    );
    expect(onSearchThisArea).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /^Confirm$/i })).toBeDisabled();
  });

  it("keeps move-mode copy, 50 m warning, and gated confirm without Cancel", () => {
    renderHud(
      <HidingZoneMapPlacementChrome
        moveMode
        radiusLabel="200 m"
        zoneTool={baseZoneTool({
          methodChosen: true,
          manualMode: false,
          selectedStation: null,
          hasPlacement: false,
        })}
        onSearchThisArea={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("status", { name: /Move zone placement/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Move zone/)).toBeInTheDocument();
    expect(screen.getByText(/timer paused/i)).toBeInTheDocument();
    expect(
      screen.getByText(/at least 50 m from your previous zone/i),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/search stations/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Confirm$/i })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /^Cancel$/i })).toBeNull();
  });
});
