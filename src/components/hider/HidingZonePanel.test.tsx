import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HidingZonePanel } from "./HidingZonePanel";

function baseZoneTool(
  overrides: Partial<Parameters<typeof HidingZonePanel>[0]["zoneTool"]> = {},
) {
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
    methodChosen: true,
    choosePlacementMethod: vi.fn(),
    manualCenter: null,
    hasPlacement: false,
    confirmZone: vi.fn(),
    saving: false,
    error: null,
    ...overrides,
  };
}

describe("HidingZonePanel", () => {
  it("does not auto-search stations when entering the place phase", () => {
    const onSearchThisArea = vi.fn();
    const choosePlacementMethod = vi.fn();

    render(
      <HidingZonePanel
        wizardOpen
        moveMode={false}
        radiusLabel="200 m"
        zoneTool={baseZoneTool({
          methodChosen: false,
          choosePlacementMethod,
        })}
        onStepChange={vi.fn()}
        onSearchThisArea={onSearchThisArea}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^Station$/i }));

    expect(choosePlacementMethod).toHaveBeenCalledWith(false);
    expect(onSearchThisArea).not.toHaveBeenCalled();
  });

  it("searches only when the frame-search button is clicked", () => {
    const onSearchThisArea = vi.fn();

    render(
      <HidingZonePanel
        wizardOpen
        moveMode={false}
        radiusLabel="200 m"
        zoneTool={baseZoneTool({ methodChosen: false })}
        onStepChange={vi.fn()}
        onSearchThisArea={onSearchThisArea}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^Station$/i }));
    expect(onSearchThisArea).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: /search stations in this area/i }),
    );

    expect(onSearchThisArea).toHaveBeenCalledTimes(1);
  });
});
