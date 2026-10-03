import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type AskHudReadiness, canCommit, primedCommitLabel } from "@/domain/ask/askHudModes";
import type { DistanceUnit } from "@/domain/map/distance";
import type { ThermometerDistanceOptionMiles } from "@/domain/questions";
import type { SessionRulesInput } from "@/domain/session/rules";
import { jetlagTheme } from "@/theme/theme";
import { AskHudHost } from "../AskHudHost";
import { ThermometerHudBody } from "./ThermometerHudBody";

function renderHud(ui: ReactElement) {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      {ui}
    </MantineProvider>,
  );
}

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
  usedDistanceOptions: new Set<ThermometerDistanceOptionMiles>(),
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
  it("keeps used walk distances visible but disabled", () => {
    const onDistanceChange = vi.fn();
    renderHud(
      <ThermometerHudBody
        {...baseProps}
        usedDistanceOptions={new Set([3])}
        onDistanceChange={onDistanceChange}
      />,
    );

    const used = screen.getByRole("button", { name: /^3 mi$/i });
    expect(used).toBeInTheDocument();
    expect(used).toBeDisabled();
    fireEvent.click(used);
    expect(onDistanceChange).not.toHaveBeenCalled();
  });

  it("disables the currently selected distance when it is already used", () => {
    renderHud(
      <ThermometerHudBody
        {...baseProps}
        distanceMeters={4828.032}
        usedDistanceOptions={new Set([3])}
      />,
    );

    expect(screen.getByRole("button", { name: /^3 mi$/i })).toBeDisabled();
  });

  it("shows walk banner without PhaseRail, CONTINUE, or END WALK in the body", () => {
    renderHud(<ThermometerHudBody {...baseProps} walkingActive travelMeters={420} step="b" />);

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

    // Null travel while walking must not arm (configureReady false).
    expect(
      canCommit({
        ...readiness,
        configureReady: false,
      }),
    ).toBe(false);

    const onCommit = vi.fn();
    renderHud(
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
        modeBody={<ThermometerHudBody {...baseProps} walkingActive travelMeters={420} step="b" />}
      />,
    );

    expect(screen.getByTestId("ask-walk-banner")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /end walk/i })).toHaveLength(1);
    expect(screen.getByTestId("ask-commit-strip").querySelector("button")).toHaveAttribute(
      "data-armed",
      "true",
    );
  });
});
