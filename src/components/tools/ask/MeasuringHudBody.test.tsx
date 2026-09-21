import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
  it("shows catalog first with question text and cost in the body", () => {
    render(
      <AskHudHost
        cue="PICK A SOURCE"
        toolLabel="Measuring"
        costLabel="D3P1"
        canCommit={false}
        commitLabel="SEND"
        onCommit={() => {}}
        modeBody={<MeasuringHudBody {...baseProps} costLabel="D3P1" />}
        showCue={false}
        showCostChip={false}
        showCommitStrip={false}
      />,
    );

    expect(screen.getByTestId("measuring-hud-body")).toBeInTheDocument();
    expect(screen.getByTestId("ask-catalog-rail")).toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: /Measuring · D3P1/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Compared to me, are you closer to or further from/i),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("ask-mode-cue-ticker")).toBeNull();
    expect(screen.queryByTestId("ask-commit-strip")).toBeNull();
    expect(screen.queryByRole("list", { name: "Wizard phases" })).toBeNull();
  });

  it("shows anchor after category before target", () => {
    render(
      <MeasuringHudBody
        {...baseProps}
        optionChosen
        hasSeekerPoint={false}
      />,
    );

    expect(screen.queryByTestId("ask-catalog-rail")).toBeNull();
    expect(screen.getByTestId("measuring-hud-body")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Wizard phases" })).toBeNull();
  });

  it("keeps measuring cues catalog-first like Matching", () => {
    expect(
      activeModeCue({
        surface: "measuring",
        placementReady: false,
        configureReady: false,
        resolveReady: false,
      }),
    ).toBe("PICK A SOURCE");
    expect(
      activeModeCue({
        surface: "measuring",
        placementReady: false,
        configureReady: true,
        resolveReady: false,
      }),
    ).toBe("SET YOUR ANCHOR");
    expect(
      activeModeCue({
        surface: "measuring",
        placementReady: true,
        configureReady: true,
        resolveReady: false,
      }),
    ).toBe("SET YOUR TARGET");
  });

  it("arms when anchor + source + target ready", () => {
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
  });
});
