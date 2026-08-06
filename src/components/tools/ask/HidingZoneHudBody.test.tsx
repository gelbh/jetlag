import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AskHudHost } from "./AskHudHost";
import { HidingZoneHudBody } from "./HidingZoneHudBody";
import {
  canCommit,
  primedCommitLabel,
  type AskHudReadiness,
} from "@/domain/ask/askHudModes";
import type { HidingZoneToolPanelState } from "@/components/hider/HidingZonePanel";

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

    render(
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

  it("arms Confirm on PrimedCommitStrip only when placement ready", () => {
    const readiness: AskHudReadiness = {
      surface: "hiding-zone-create",
      placementReady: true,
      configureReady: true,
      resolveReady: true,
      answerReady: true,
      awaitHiderAnswer: true,
      isSubmitting: false,
    };
    expect(canCommit(readiness)).toBe(true);

    const onCommit = vi.fn();
    render(
      <AskHudHost
        cue="READY TO CONFIRM"
        toolLabel="Hiding zone"
        showCostChip={false}
        canCommit
        commitLabel={primedCommitLabel({
          kind: "confirm",
          costLabel: null,
          primed: true,
          cue: "READY TO CONFIRM",
        })}
        onCommit={onCommit}
        modeBody={
          <HidingZoneHudBody
            moveMode={false}
            radiusLabel="200 m"
            zoneTool={baseZoneTool({
              methodChosen: true,
              manualMode: true,
              hasPlacement: true,
              manualCenter: [53.35, -6.26],
            })}
            onStepChange={vi.fn()}
            onSearchThisArea={vi.fn()}
          />
        }
      />,
    );

    const strip = screen.getByTestId("ask-commit-strip").querySelector("button");
    expect(strip).toHaveAttribute("data-armed", "true");
    fireEvent.click(screen.getByRole("button", { name: /^CONFIRM$/i }));
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it("searches stations only via frame-search control after Station method", () => {
    const onSearchThisArea = vi.fn();
    render(
      <HidingZoneHudBody
        moveMode={false}
        radiusLabel="200 m"
        zoneTool={baseZoneTool({
          methodChosen: true,
          manualMode: false,
        })}
        onStepChange={vi.fn()}
        onSearchThisArea={onSearchThisArea}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /search stations in this area/i }),
    );
    expect(onSearchThisArea).toHaveBeenCalledTimes(1);
  });
});
