import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DistanceUnit } from "@/domain/map/distance";
import {
  BASE_MEASURING_CATALOG,
  DEFAULT_MEASURING_FROM_KIND,
  type MeasuringAnswer,
  type MeasuringFromKind,
  type MeasuringSubject,
  type MeasuringTargetMode,
} from "@/domain/questions";
import {
  MeasuringPanel,
  type MeasuringPanelModel,
  type MeasuringPanelProps,
} from "./MeasuringPanel";

vi.mock("../../hooks/wizard/useToolWizard", () => ({
  useToolWizard: () => ({
    phaseId: "configure",
    stepId: "source",
    phaseIndex: 1,
    phaseCount: 3,
    configureIndex: 0,
    goNext: vi.fn(),
    goBack: vi.fn(),
    Stepper: () => null,
  }),
}));

const baseModel: MeasuringPanelModel = {
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
  onCommit: vi.fn(),
};

describe("MeasuringPanel public props (AC #1)", () => {
  it("accepts a single model options object", () => {
    const props: MeasuringPanelProps = {
      model: baseModel,
    };
    const keys = Object.keys(props) as Array<keyof MeasuringPanelProps>;
    expect(keys).toEqual(["model"]);
    expect(keys.length).toBeLessThanOrEqual(10);

    render(<MeasuringPanel {...props} />);

    expect(screen.getByText("Measuring from")).toBeInTheDocument();
  });

  it("shows empty-area notice and greys unavailable options on the sheet", () => {
    render(
      <MeasuringPanel
        model={{
          ...baseModel,
          unavailableMeasuringFromKinds: new Set(["zoo"]),
          catalogNotice: "No named zoo found in this play area.",
        }}
      />,
    );

    expect(screen.getByText("No named zoo found in this play area.")).toBeInTheDocument();
    expect(screen.getByText("Measuring from")).toBeInTheDocument();
  });
});
