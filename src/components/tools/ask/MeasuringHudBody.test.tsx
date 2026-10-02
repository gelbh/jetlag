import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type AskHudReadiness, activeModeCue, canCommit } from "@/domain/ask/askHudModes";
import type { DistanceUnit } from "@/domain/map/distance";
import {
  BASE_MEASURING_CATALOG,
  DEFAULT_MEASURING_FROM_KIND,
  type MeasuringAnswer,
  type MeasuringFromKind,
  type MeasuringSubject,
  type MeasuringTargetMode,
} from "@/domain/questions";
import { jetlagTheme } from "@/theme/theme";
import { AskHudHost } from "./AskHudHost";
import {
  MeasuringHudBody,
  type MeasuringHudBodyModel,
  type MeasuringHudBodyProps,
} from "./MeasuringHudBody";

function renderHud(ui: ReactElement) {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      {ui}
    </MantineProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: typeof query === "string" && query.includes("min-width: 380"),
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  }));
});

const baseModel: MeasuringHudBodyModel = {
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

describe("MeasuringHudBody public props (AC #1)", () => {
  it("accepts a single model options object", () => {
    const props: MeasuringHudBodyProps = {
      model: baseModel,
    };
    const keys = Object.keys(props) as Array<keyof MeasuringHudBodyProps>;
    expect(keys).toEqual(["model"]);
    expect(keys.length).toBeLessThanOrEqual(10);

    renderHud(<MeasuringHudBody {...props} />);

    expect(screen.getByTestId("measuring-hud-body")).toBeInTheDocument();
  });
});

describe("MeasuringHudBody", () => {
  it("shows catalog first with question text and cost in the body", () => {
    renderHud(
      <AskHudHost
        cue="PICK A SOURCE"
        toolLabel="Measuring"
        costLabel="D3P1"
        canCommit={false}
        commitLabel="SEND"
        onCommit={() => {}}
        modeBody={<MeasuringHudBody model={{ ...baseModel, costLabel: "D3P1" }} />}
        showCue={false}
        showCostChip={false}
        showCommitStrip={false}
      />,
    );

    expect(screen.getByTestId("measuring-hud-body")).toBeInTheDocument();
    expect(screen.getByTestId("ask-catalog-rail")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: /Measuring · D3P1/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Compared to me, are you closer to or further from/i),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("ask-mode-cue-ticker")).toBeNull();
    expect(screen.queryByTestId("ask-commit-strip")).toBeNull();
    expect(screen.queryByRole("list", { name: "Wizard phases" })).toBeNull();
  });

  it("shows anchor after category before target", () => {
    renderHud(
      <MeasuringHudBody
        model={{
          ...baseModel,
          optionChosen: true,
          hasSeekerPoint: false,
        }}
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

  it("keeps used categories visible but disabled", () => {
    renderHud(
      <MeasuringHudBody
        model={{
          ...baseModel,
          usedMeasuringFromKinds: new Set(["zoo"]),
        }}
      />,
    );
    expect(screen.getByText("Zoo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Zoo/i })).toBeDisabled();
  });

  it("shows empty-area reason and disables that category on the sheet", () => {
    renderHud(
      <MeasuringHudBody
        model={{
          ...baseModel,
          unavailableMeasuringFromKinds: new Set(["zoo"]),
          catalogNotice: "No named zoo found in this play area.",
        }}
      />,
    );
    expect(screen.getByText("No named zoo found in this play area.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Zoo/i })).toBeDisabled();
  });
});
