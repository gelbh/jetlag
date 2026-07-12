import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnnotationRecord } from "../../domain/map/annotations";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import { useMapSessionChrome } from "./useMapSessionChrome";

const navigate = vi.fn();

vi.mock("../../hooks/useAppNavigate", () => ({
  useAppNavigate: () => navigate,
}));

vi.mock("../../state/sessionStore", () => ({
  useSessionStore: vi.fn((selector: (state: { setSession: ReturnType<typeof vi.fn> }) => unknown) =>
    selector({ setSession: vi.fn() }),
  ),
}));

const activePin: AnnotationRecord = {
  id: "ann-1",
  sessionId: LOCAL_SESSION_ID,
  type: "pin",
  status: "active",
  geometry: {
    type: "Feature",
    properties: {},
    geometry: { type: "Point", coordinates: [-6.26, 53.35] },
  },
  metadata: {},
};

describe("useMapSessionChrome", () => {
  beforeEach(() => {
    navigate.mockReset();
  });

  it("does not clear the map while end game is active", () => {
    const clearAllAnnotations = vi.fn();
    vi.spyOn(window, "confirm");

    const { result } = renderHook(() =>
      useMapSessionChrome({
        session: {
          id: LOCAL_SESSION_ID,
          code: "WXYZ",
          gameArea: activePin.geometry.geometry as never,
          createdAt: "2026-01-01T00:00:00.000Z",
          memberUids: ["host-1"],
        },
        isHost: true,
        annotations: [activePin],
        mapShellRef: { current: null },
        exportLegendRef: { current: null },
        clearAllAnnotations,
        setSelectedAnnotationId: vi.fn(),
        closeSettingsPanel: vi.fn(),
        endGameBlocked: true,
      }),
    );

    act(() => {
      result.current.handleClearMap();
    });

    expect(window.confirm).not.toHaveBeenCalled();
    expect(clearAllAnnotations).not.toHaveBeenCalled();
  });

  it("clears annotations after confirmation", () => {
    const clearAllAnnotations = vi.fn(async () => undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const { result } = renderHook(() =>
      useMapSessionChrome({
        session: {
          id: LOCAL_SESSION_ID,
          code: "WXYZ",
          gameArea: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 0],
              ],
            ],
          },
          createdAt: "2026-01-01T00:00:00.000Z",
          memberUids: ["host-1"],
        },
        isHost: true,
        annotations: [activePin],
        mapShellRef: { current: null },
        exportLegendRef: { current: null },
        clearAllAnnotations,
        setSelectedAnnotationId: vi.fn(),
        closeSettingsPanel: vi.fn(),
      }),
    );

    act(() => {
      result.current.handleClearMap();
    });

    expect(clearAllAnnotations).toHaveBeenCalled();
  });
});
