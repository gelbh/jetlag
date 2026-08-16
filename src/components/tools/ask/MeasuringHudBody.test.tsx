import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { DistanceUnit } from "@/domain/map/distance";
import {
  BASE_MEASURING_CATALOG,
  DEFAULT_MEASURING_FROM_KIND,
  type MeasuringAnswer,
  type MeasuringFromKind,
  type MeasuringSubject,
  type MeasuringTargetMode,
} from "@/domain/questions";
import { AskHudHost } from "./AskHudHost";
import { MeasuringHudBody } from "./MeasuringHudBody";
import {
  activeModeCue,
  canCommit,
  primedCommitLabel,
  type AskHudReadiness,
} from "@/domain/ask/askHudModes";

const baseProps = {
  distanceUnit: "imperial" as DistanceUnit,
  optionChosen: false,
  measureFrom: DEFAULT_MEASURING_FROM_KIND as MeasuringFromKind,
  usesAllPlacesInArea: false,
  usedMeasuringFromKinds: new Set<MeasuringFromKind>(),
  catalogOptions: BASE_MEASURING_CATALOG,
  subject: "location" as MeasuringSubject,
  targetMode: "map" as MeasuringTargetMode,
  anchorAltitudeMeters: null as number | null,
  hasSeekerPoint: false,
  hasTargetPoint: false,
  seekerPlaceName: null as string | null,
  targetPlaceName: null as string | null,
  distanceMeters: null as number | null,
  loading: false,
  gpsLoading: false,
  searchQuery: "",
  searchResults: [],
  searchLoading: false,
  searchRole: "seeker" as const,
  answer: null as MeasuringAnswer | null,
  onMeasureFromChange: vi.fn(),
  onTargetModeChange: vi.fn(),
  onSearchQueryChange: vi.fn(),
  onSearchSubmit: vi.fn(),
  onSearchResultSelect: vi.fn(),
  onUseGps: vi.fn(),
  onFindCoastline: vi.fn(),
  onRetrySeaLevel: vi.fn(),
  onFindLinearFeature: vi.fn(),
  onFindNearest: vi.fn(),
  onAnswerChange: vi.fn(),
  awaitHiderAnswer: true,
};

describe("MeasuringHudBody", () => {
  it("shows anchor chrome without PhaseRail or CONTINUE", () => {
    render(<MeasuringHudBody {...baseProps} />);

    expect(screen.getByTestId("measuring-hud-body")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Wizard phases" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Continue" }),
    ).toBeNull();
  });

  it("shows catalog rail after anchor before target", () => {
    render(
      <MeasuringHudBody
        {...baseProps}
        hasSeekerPoint
        seekerPlaceName="Dublin"
      />,
    );

    expect(screen.getByTestId("ask-catalog-rail")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Wizard phases" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Continue" }),
    ).toBeNull();
  });

  it("wires cue ticker and muted strip until canCommit", () => {
    const readiness: AskHudReadiness = {
      surface: "measuring",
      placementReady: true,
      configureReady: true,
      resolveReady: false,
      answerReady: true,
      awaitHiderAnswer: true,
      isSubmitting: false,
    };
    const cue = activeModeCue({
      surface: "measuring",
      placementReady: true,
      configureReady: true,
      resolveReady: false,
    });
    expect(cue).toBe("SET YOUR TARGET");
    expect(canCommit(readiness)).toBe(false);

    render(
      <AskHudHost
        cue={cue}
        toolLabel="Measuring"
        costLabel="D3P1"
        canCommit={false}
        commitLabel={primedCommitLabel({
          kind: "send",
          costLabel: "D3P1",
          primed: false,
          cue,
        })}
        onCommit={() => {}}
        modeBody={
          <MeasuringHudBody
            {...baseProps}
            hasSeekerPoint
            optionChosen
            measureFrom={DEFAULT_MEASURING_FROM_KIND}
          />
        }
      />,
    );

    expect(screen.getByTestId("ask-mode-cue-ticker")).toHaveTextContent(
      "SET YOUR TARGET",
    );
    expect(screen.getByTestId("ask-cost-chip")).toHaveTextContent(/Measuring/);
    expect(
      screen.getByRole("button", { name: "SEND — SET TARGET FIRST" }),
    ).toBeDisabled();
  });

  it("arms strip when anchor + source + target ready", () => {
    const readiness: AskHudReadiness = {
      surface: "measuring",
      placementReady: true,
      configureReady: true,
      resolveReady: true,
      answerReady: true,
      awaitHiderAnswer: true,
      isSubmitting: false,
    };
    expect(canCommit(readiness)).toBe(true);
    const cue = activeModeCue({
      surface: "measuring",
      placementReady: true,
      configureReady: true,
      resolveReady: true,
    });
    const onCommit = vi.fn();

    render(
      <AskHudHost
        cue={cue}
        toolLabel="Measuring"
        costLabel="D3P1"
        canCommit
        commitLabel={primedCommitLabel({
          kind: "send",
          costLabel: "D3P1",
          primed: true,
          cue,
        })}
        onCommit={onCommit}
        modeBody={
          <MeasuringHudBody
            {...baseProps}
            hasSeekerPoint
            hasTargetPoint
            optionChosen
            measureFrom={DEFAULT_MEASURING_FROM_KIND}
            distanceMeters={1200}
            targetPlaceName="Airport"
          />
        }
      />,
    );

    expect(screen.getByTestId("ask-mode-cue-ticker")).toHaveTextContent(
      "READY TO SEND",
    );
    fireEvent.click(screen.getByRole("button", { name: "SEND · D3P1" }));
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("list", { name: "Wizard phases" })).toBeNull();
  });
});
