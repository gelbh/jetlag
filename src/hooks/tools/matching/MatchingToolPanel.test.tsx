import { describe, expect, it, vi } from "vitest";
import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import type { DistanceUnit } from "@/domain/map/distance";
import {
  MATCHING_CATEGORIES,
  type MatchingAnswer,
  type MatchingCategoryId,
} from "@/domain/questions";
import {
  MatchingToolPanel,
  type MatchingToolPanelModel,
  type MatchingToolPanelProps,
} from "./MatchingToolPanel";

vi.mock("@/components/tools/MatchingPanel", () => ({
  MatchingPanel: ({
    model,
  }: {
    model: { categoryChosen: boolean };
  }) => (
    <div data-testid="matching-panel-stub">
      {model.categoryChosen ? "category-chosen" : "Match category stub"}
    </div>
  ),
}));

vi.mock("@/components/tools/shared/controls/QuestionPreviewSheet", () => ({
  QuestionPreviewSheet: () => <div data-testid="preview-sheet-stub" />,
}));

const baseModel: MatchingToolPanelModel = {
  distanceUnit: "imperial" as DistanceUnit,
  categoryId: null as MatchingCategoryId | null,
  categoryChosen: false,
  usedCategoryIds: new Set<MatchingCategoryId>(),
  catalogCategories: [...MATCHING_CATEGORIES],
  matchingSeekerPoint: null,
  matchingUsesContainment: false,
  matchingNearestFeatureName: null,
  matchingDistanceMeters: null,
  matchingFeatureCount: null,
  matchingInPlayAreaFeatureCount: null,
  matchingNearestOutsidePlayArea: false,
  matchingNullAnswer: false,
  matchingLoading: false,
  gpsLoading: false,
  matchingAnswer: null as MatchingAnswer | null,
  error: null,
  awaitHiderAnswer: false,
  costLabel: "D3P1",
  isSubmitting: false,
  previewOpen: false,
  previewQuestion: null,
  wizardStepRef: createRef<string>(),
  onCategoryChange: vi.fn(),
  onUseGps: vi.fn(),
  onAnswerChange: vi.fn(),
  onCommit: vi.fn(),
  onPreviewConfirm: vi.fn(),
  onPreviewCancel: vi.fn(),
};

describe("MatchingToolPanel public props (AC #1)", () => {
  it("accepts a single model options object", () => {
    const props: MatchingToolPanelProps = {
      model: baseModel,
    };
    const keys = Object.keys(props) as Array<keyof MatchingToolPanelProps>;
    expect(keys).toEqual(["model"]);
    expect(keys.length).toBeLessThanOrEqual(10);

    render(<MatchingToolPanel {...props} />);

    expect(screen.getByTestId("matching-panel-stub")).toBeInTheDocument();
    expect(screen.getByTestId("preview-sheet-stub")).toBeInTheDocument();
  });
});
