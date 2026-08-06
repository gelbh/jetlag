import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { DistanceUnit } from "@/domain/map/distance";
import type { SessionRulesInput } from "@/domain/session/rules";
import { AskHudHost } from "./AskHudHost";
import { ThermometerHudBody } from "./ThermometerHudBody";
import {
  canCommit,
  primedCommitLabel,
  type AskHudReadiness,
} from "@/domain/ask/askHudModes";

const sessionRules = {
  gameSize: "medium",
  thermometer: { minDistanceMeters: 400, maxDistanceMeters: 5000 },
} as SessionRulesInput;

const baseProps = {
  distanceUnit: "imperial" as DistanceUnit,
  sessionRules,
  distanceMeters: 1609,
  travelMeters: null as number | null,
  answer: null as "hotter" | "colder" | null,
  step: "a" as const,
  placementMode: "gps" as const,
  walkingActive: false,
  presetUseCount: 0,
  costLabel: "D2P1",
  gpsLoading: false,
  canSubmitQuestion: true,
  isSubmitting: false,
  onPlacementModeChange: vi.fn(),
  onDistanceChange: vi.fn(),
  onAnswerChange: vi.fn(),
  onReset: vi.fn(),
  onStartWalk: vi.fn(),
  awaitHiderAnswer: true,
};

describe("ThermometerHudBody", () => {
  it("shows walk banner without PhaseRail, CONTINUE, or END WALK in the body", () => {
    render(
      <ThermometerHudBody
        {...baseProps}
        walkingActive
        travelMeters={420}
        step="b"
      />,
    );

    expect(screen.getByTestId("ask-walk-banner")).toBeInTheDocument();
    expect(screen.getByTestId("ask-walk-banner")).toHaveTextContent(/Walking/i);
    expect(screen.queryByRole("list", { name: "Wizard phases" })).toBeNull();
    expect(screen.queryByRole("button", { name: /continue/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /end walk/i })).toBeNull();
  });

  it("keeps END WALK only on PrimedCommitStrip via AskHudHost", () => {
    const readiness: AskHudReadiness = {
      surface: "thermometer",
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
        cue=""
        toolLabel="Thermometer"
        costLabel="D2P1"
        canCommit
        commitLabel={primedCommitLabel({
          kind: "endWalk",
          costLabel: "D2P1",
          primed: true,
          cue: "",
        })}
        onCommit={onCommit}
        modeBody={
          <ThermometerHudBody
            {...baseProps}
            walkingActive
            travelMeters={420}
            step="b"
          />
        }
      />,
    );

    expect(screen.getByTestId("ask-walk-banner")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /end walk/i }),
    ).toHaveLength(1);
    expect(screen.getByTestId("ask-commit-strip").querySelector("button")).toHaveAttribute(
      "data-armed",
      "true",
    );
  });
});
