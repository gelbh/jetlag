import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useTentacleTool } from "./useTentacleTool";
import { createToolHookMocks } from "../../test/helpers/toolHookMocks";
import { DUBLIN_CITY_GAME_AREA } from "../../test/fixtures/dublinGameArea";

vi.mock("@/hooks/feature/usePlayerUiMantine", () => ({
  usePlayerUiMantine: () => true,
}));

vi.mock("../forms/useDebouncedValue", () => ({
  useDebouncedValue: <T,>(value: T) => value,
}));

vi.mock("../../services/core/location/geolocation", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("../../services/core/location/geolocation")
    >();
  return {
    ...actual,
    queryGeolocationPermission: vi.fn(async () => "prompt" as const),
  };
});

vi.mock("../../services/geo/overpass/tentacleOverpass", () => ({
  fetchTentaclePois: vi.fn(async () => []),
}));

describe("useTentacleTool map-first", () => {
  it("suppresses the Ask sheet after a category is chosen", async () => {
    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
      useTentacleTool({
        active: true,
        annotations: mocks.annotations,
        gameArea: DUBLIN_CITY_GAME_AREA,
        sessionRules: { gameSize: "medium" },
        createAnnotation: mocks.createAnnotation,
        distanceUnit: mocks.distanceUnit,
        finishPlacement: mocks.finishPlacement,
        setMapError: mocks.setMapError,
        mapError: mocks.mapError,
        gpsLoading: mocks.gpsLoading,
        awaitingPlacement: false,
        setAwaitingPlacement: mocks.setAwaitingPlacement,
        refreshGps: mocks.refreshGps,
        ensurePointInGameArea: mocks.ensurePointInGameArea,
        armPlacement: vi.fn(),
        awaitHiderAnswer: true,
      }),
    );

    expect(result.current.hud.suppressSheet).toBeFalsy();

    act(() => {
      (
        result.current.panel as {
          props: { onCategoryChange: (id: string) => void };
        }
      ).props.onCategoryChange("train_station");
    });

    await waitFor(() => {
      expect(result.current.hud.suppressSheet).toBe(true);
    });

    expect(result.current.hud.mapOverlay).not.toBeNull();
    expect(result.current.hud.modeBody).toBeNull();
  });
});
