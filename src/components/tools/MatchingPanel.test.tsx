import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { DistanceUnit } from "@/domain/map/distance";
import {
  MATCHING_CATEGORIES,
  type MatchingAnswer,
  type MatchingCategoryId,
} from "@/domain/questions";
import {
  MatchingPanel,
  type MatchingPanelModel,
  type MatchingPanelProps,
} from "./MatchingPanel";

vi.mock("../../hooks/wizard/useToolWizard", () => ({
  useToolWizard: () => ({
    phaseId: "configure",
    stepId: "category",
    phaseIndex: 1,
    phaseCount: 3,
    configureIndex: 0,
    setPhaseIndex: vi.fn(),
    goNext: vi.fn(),
    goBack: vi.fn(),
    Stepper: () => null,
  }),
}));

const baseModel: MatchingPanelModel = {
  distanceUnit: "imperial" as DistanceUnit,
  categoryId: null as MatchingCategoryId | null,
  categoryChosen: false,
  usedCategoryIds: new Set<MatchingCategoryId>(),
  catalogCategories: MATCHING_CATEGORIES,
  usesContainmentMatching: false,
  hasSeekerPoint: false,
  nearestFeatureName: null as string | null,
  distanceMeters: null as number | null,
  featureCount: null as number | null,
  inPlayAreaFeatureCount: null as number | null,
  nearestOutsidePlayArea: false,
  nullAnswer: false,
  loading: false,
  gpsLoading: false,
  answer: null as MatchingAnswer | null,
  onCategoryChange: vi.fn(),
  onUseGps: vi.fn(),
  onAnswerChange: vi.fn(),
  onCommit: vi.fn(),
};

describe("MatchingPanel public props (AC #1)", () => {
  it("accepts a single model options object", () => {
    const props: MatchingPanelProps = {
      model: baseModel,
    };
    const keys = Object.keys(props) as Array<keyof MatchingPanelProps>;
    expect(keys).toEqual(["model"]);
    expect(keys.length).toBeLessThanOrEqual(10);

    render(<MatchingPanel {...props} />);

    expect(screen.getByText("Match category")).toBeInTheDocument();
  });
});
