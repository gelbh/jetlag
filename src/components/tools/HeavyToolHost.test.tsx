import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { DistanceUnit } from "@/domain/map/distance";
import type { GameArea } from "@/domain/map/annotations";
import type { MapTool } from "@/state/sessionStore";
import {
  HeavyToolHost,
  type HeavyToolHostModel,
  type HeavyToolHostProps,
} from "./HeavyToolHost";

vi.mock("../../hooks/tools/useMatchingTool", () => ({
  useMatchingTool: () => ({
    draft: {},
    placementCrosshair: false,
    publishSignature: "matching:idle",
  }),
}));
vi.mock("../../hooks/tools/useMeasuringTool", () => ({
  useMeasuringTool: () => ({
    draft: {},
    placementCrosshair: false,
    publishSignature: "measuring:idle",
  }),
}));
vi.mock("../../hooks/tools/useTentacleTool", () => ({
  useTentacleTool: () => ({
    draft: {},
    placementCrosshair: false,
    publishSignature: "tentacle:idle",
  }),
}));

const baseModel: HeavyToolHostModel = {
  activeTool: "matching" as MapTool,
  sessionRules: { gameSize: "medium" },
  annotations: [],
  gameArea: {
    type: "Polygon",
    coordinates: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ],
  } as GameArea,
  createAnnotation: vi.fn(),
  distanceUnit: "imperial" as DistanceUnit,
  finishPlacement: vi.fn(),
  gpsLoading: false,
  mapError: null,
  setMapError: vi.fn(),
  refreshGps: vi.fn(),
  ensurePointInGameArea: () => true,
  awaitingPlacement: false,
  setAwaitingPlacement: vi.fn(),
  armPlacement: vi.fn(),
  onToolsChange: vi.fn(),
};

describe("HeavyToolHost public props (AC #1 / #7)", () => {
  it("accepts a single model options object", () => {
    const props: HeavyToolHostProps = {
      model: baseModel,
    };
    const keys = Object.keys(props) as Array<keyof HeavyToolHostProps>;
    expect(keys).toEqual(["model"]);
    expect(keys.length).toBeLessThanOrEqual(10);

    render(<HeavyToolHost {...props} />);
    // Host must read activeTool from model; flat-spread of { model } leaves activeTool unset.
    expect(baseModel.onToolsChange).toHaveBeenCalled();
  });
});
