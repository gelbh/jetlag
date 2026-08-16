import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { DistanceUnit } from "@/domain/map/distance";
import type { GameSize } from "@/domain/session/size/gameSize";
import type { RadarDistanceOptionKey } from "@/domain/questions";
import { AskHudHost } from "./AskHudHost";
import { RadarHudBody } from "./RadarHudBody";
import {
  activeModeCue,
  canCommit,
  primedCommitLabel,
  type AskHudReadiness,
} from "@/domain/ask/askHudModes";

const baseBodyProps = {
  radiusMeters: null as number | null,
  chooseCustom: false,
  customRadius: "",
  awaitingPlacement: true,
  hasCenter: false,
  distanceUnit: "imperial" as DistanceUnit,
  gameSize: "medium" as GameSize,
  usedDistanceOptions: new Set<RadarDistanceOptionKey>(),
  answer: null as "yes" | "no" | null,
  onPresetSelect: vi.fn(),
  onChooseSelect: vi.fn(),
  onCustomRadiusChange: vi.fn(),
  onAnswerChange: vi.fn(),
  onUseGps: vi.fn(),
  onPlaceAtMapTap: vi.fn(),
  gpsLoading: false,
  awaitHiderAnswer: true,
};

describe("RadarHudBody", () => {
  it("renders chip island chrome without PhaseRail or CONTINUE wizard nav", () => {
    render(<RadarHudBody {...baseBodyProps} />);

    expect(screen.getByTestId("radar-hud-body")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Wizard phases" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Continue" }),
    ).toBeNull();
  });

  it("wires GlanceVerb cue + primed strip via AskHudHost readiness", () => {
    const readiness: AskHudReadiness = {
      surface: "radar",
      placementReady: true,
      configureReady: false,
      resolveReady: true,
      answerReady: true,
      awaitHiderAnswer: true,
      isSubmitting: false,
    };
    const cue = activeModeCue({
      surface: "radar",
      placementReady: readiness.placementReady,
      configureReady: readiness.configureReady,
      resolveReady: readiness.resolveReady,
    });
    expect(cue).toBe("PICK A DISTANCE");
    expect(canCommit(readiness)).toBe(false);

    const onCommit = vi.fn();
    render(
      <AskHudHost
        cue={cue}
        toolLabel="Radar"
        costLabel="D2P1"
        canCommit={canCommit(readiness)}
        commitLabel={primedCommitLabel({
          kind: "send",
          costLabel: "D2P1",
          primed: false,
          cue,
        })}
        onCommit={onCommit}
        modeBody={
          <RadarHudBody
            {...baseBodyProps}
            hasCenter
            awaitingPlacement={false}
            radiusMeters={1609}
          />
        }
      />,
    );

    expect(screen.getByTestId("ask-mode-cue-ticker")).toHaveTextContent(
      "PICK A DISTANCE",
    );
    expect(screen.getByTestId("ask-cost-chip")).toHaveTextContent(/Radar/);
    expect(screen.getByTestId("radar-hud-body")).toBeInTheDocument();
    expect(screen.getByText("Distance")).toBeInTheDocument();
    const strip = screen.getByTestId("ask-commit-strip").querySelector("button");
    expect(strip).toBeDisabled();
    expect(strip).toHaveAttribute("data-armed", "false");
    fireEvent.click(strip!);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("arms commit strip when center + distance ready (multiplayer)", () => {
    const readiness: AskHudReadiness = {
      surface: "radar",
      placementReady: true,
      configureReady: true,
      resolveReady: true,
      answerReady: true,
      awaitHiderAnswer: true,
      isSubmitting: false,
    };
    const cue = activeModeCue({
      surface: "radar",
      placementReady: true,
      configureReady: true,
      resolveReady: true,
    });
    expect(canCommit(readiness)).toBe(true);

    const onCommit = vi.fn();
    render(
      <AskHudHost
        cue={cue}
        toolLabel="Radar"
        costLabel="D2P1"
        canCommit
        commitLabel={primedCommitLabel({
          kind: "send",
          costLabel: "D2P1",
          primed: true,
          cue,
        })}
        onCommit={onCommit}
        modeBody={
          <RadarHudBody
            {...baseBodyProps}
            hasCenter
            awaitingPlacement={false}
            radiusMeters={1609}
          />
        }
      />,
    );

    expect(screen.getByTestId("ask-mode-cue-ticker")).toHaveTextContent(
      "READY TO SEND",
    );
    const strip = screen.getByRole("button", { name: "SEND · D2P1" });
    expect(strip).toHaveAttribute("data-armed", "true");
    fireEvent.click(strip);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("list", { name: "Wizard phases" })).toBeNull();
  });
});
