import { vi } from "vitest";
import type { AnnotationRecord } from "../../domain/map/annotations";
import { DUBLIN_CITY_GAME_AREA } from "../fixtures/dublinGameArea";

export function createToolHookMocks() {
  return {
    createAnnotation: vi.fn(
      async (
        draft: Omit<AnnotationRecord, "id" | "sessionId" | "status">,
      ): Promise<AnnotationRecord> => ({
        id: "ann-test",
        sessionId: "local",
        status: "active",
        ...draft,
      }),
    ),
    finishPlacement: vi.fn(),
    setMapError: vi.fn(),
    armPlacement: vi.fn(),
    setAwaitingPlacement: vi.fn(),
    refreshGps: vi.fn(async () => ({ lat: 53.35, lng: -6.26 })),
    ensurePointInGameArea: vi.fn(() => true),
    gameArea: DUBLIN_CITY_GAME_AREA,
    annotations: [] as AnnotationRecord[],
    distanceUnit: "imperial" as const,
    gpsLoading: false,
    mapError: null as string | null,
    awaitingPlacement: false,
  };
}
