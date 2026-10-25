import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DistanceUnit } from "@/domain/map/distance";
import type { TentacleExtendedCategoryId } from "@/domain/questions";
import { TentaclePanel, type TentaclePanelModel } from "./TentaclePanel";

vi.mock("../../hooks/wizard/useToolWizard", () => ({
  useToolWizard: () => ({
    phaseId: "configure",
    stepId: "category",
    phaseIndex: 1,
    phaseCount: 3,
    configureIndex: 0,
    goNext: vi.fn(),
    goBack: vi.fn(),
    Stepper: () => null,
  }),
}));

const baseModel: TentaclePanelModel = {
  gameSize: "medium",
  categoryId: null as TentacleExtendedCategoryId | null,
  categoryChosen: false,
  searchRadiusMeters: 1609.344,
  usedCategoryIds: new Set<TentacleExtendedCategoryId>(),
  distanceUnit: "imperial" as DistanceUnit,
  poiOptions: [],
  selectedPoiId: null,
  outOfReach: false,
  loading: false,
  awaitingPlacement: false,
  hasCenter: false,
  onCategoryChange: vi.fn(),
  onUseGps: vi.fn(),
  onPlaceAtMapTap: vi.fn(),
  onSelectPoi: vi.fn(),
  onOutOfReachChange: vi.fn(),
  onCommit: vi.fn(),
};

describe("TentaclePanel public props (AC #1)", () => {
  it("greys unavailable categories and shows catalog notice", () => {
    render(
      <TentaclePanel
        model={{
          ...baseModel,
          unavailableCategoryIds: new Set(["museum"]),
          catalogNotice: "No named museum found in this play area.",
        }}
      />,
    );

    expect(screen.getByRole("option", { name: "Museum" })).toBeDisabled();
    expect(screen.getByText("No named museum found in this play area.")).toBeInTheDocument();
  });
});
