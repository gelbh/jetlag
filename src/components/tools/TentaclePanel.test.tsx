import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { DistanceUnit } from "@/domain/map/distance";
import type { TentacleExtendedCategoryId } from "@/domain/questions";
import {
  TentaclePanel,
  type TentaclePanelModel,
  type TentaclePanelProps,
} from "./TentaclePanel";

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
  it("accepts a single model options object", () => {
    const props: TentaclePanelProps = {
      model: baseModel,
    };
    const keys = Object.keys(props) as Array<keyof TentaclePanelProps>;
    expect(keys).toEqual(["model"]);
    expect(keys.length).toBeLessThanOrEqual(10);

    render(<TentaclePanel {...props} />);

    expect(screen.getByText("Location type")).toBeInTheDocument();
  });
});
