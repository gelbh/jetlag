import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnnotationRecord, GameArea } from "../../domain/map/annotations";
import { useCombinedEliminationMask } from "./useCombinedEliminationMask";

const requestCombinedEliminationMask = vi.hoisted(() => vi.fn());
const buildCombinedEliminationMask = vi.hoisted(() => vi.fn());

vi.mock("../../domain/geometry/masks/eliminationMaskWorkerClient", () => ({
  requestCombinedEliminationMask,
}));

vi.mock("../../domain/geometry/masks/combinedEliminationMask", () => ({
  buildCombinedEliminationMask,
}));

const gameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 0],
    ],
  ],
};

const workerFeature = {
  type: "Feature" as const,
  properties: { source: "worker" },
  geometry: {
    type: "Polygon" as const,
    coordinates: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 0],
      ],
    ],
  },
};

function annotation(id: string): AnnotationRecord {
  return {
    id,
    sessionId: "session-1",
    status: "active",
    type: "matching",
    geometry: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0.1, 0.1],
            [0.2, 0.1],
            [0.2, 0.2],
            [0.1, 0.1],
          ],
        ],
      },
    },
    metadata: {
      createdAt: "2026-01-01T00:00:00.000Z",
      matchingAnswer: "no",
    },
  };
}

describe("useCombinedEliminationMask", () => {
  beforeEach(() => {
    requestCombinedEliminationMask.mockReset();
    buildCombinedEliminationMask.mockReset();
    buildCombinedEliminationMask.mockReturnValue({
      type: "Feature",
      properties: { source: "bootstrap" },
      geometry: workerFeature.geometry,
    });
  });

  it("returns null before the worker resolves (no sync TS bootstrap)", async () => {
    let resolveWorker: ((value: typeof workerFeature) => void) | undefined;
    requestCombinedEliminationMask.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveWorker = resolve;
        }),
    );

    const { result } = renderHook(() =>
      useCombinedEliminationMask({
        annotations: [annotation("ann-1")],
        gameArea,
      }),
    );

    expect(result.current).toBeNull();
    expect(buildCombinedEliminationMask).not.toHaveBeenCalled();

    await act(async () => {
      resolveWorker?.(workerFeature);
    });

    await waitFor(() => {
      expect(result.current?.properties?.source).toBe("worker");
    });
    expect(buildCombinedEliminationMask).not.toHaveBeenCalled();
  });

  it("clears the mask on worker reject (no sync TS fallback)", async () => {
    requestCombinedEliminationMask.mockImplementation(
      (annotations: AnnotationRecord[]) => {
        const id = annotations[0]?.id;
        if (id === "ann-1") {
          return Promise.resolve(workerFeature);
        }
        return Promise.reject(new Error("worker boom"));
      },
    );

    const { result, rerender } = renderHook(
      ({ annotations }: { annotations: AnnotationRecord[] }) =>
        useCombinedEliminationMask({
          annotations,
          gameArea,
        }),
      { initialProps: { annotations: [annotation("ann-1")] } },
    );

    await waitFor(() => {
      expect(result.current?.properties?.source).toBe("worker");
    });

    await act(async () => {
      rerender({ annotations: [annotation("ann-2")] });
    });

    await waitFor(() => {
      expect(result.current).toBeNull();
    });
    expect(buildCombinedEliminationMask).not.toHaveBeenCalled();
  });

  it("discards stale worker results when a newer generation finishes first", async () => {
    const latestByKey = new Map<
      string,
      {
        resolve: (value: {
          type: string;
          properties: { source: string };
          geometry: { type: string; coordinates: number[][][] };
        }) => void;
      }
    >();

    requestCombinedEliminationMask.mockImplementation(
      (annotations: AnnotationRecord[]) => {
        const key = annotations.map((entry) => entry.id).join(",");
        return new Promise((resolve) => {
          latestByKey.set(key, { resolve });
        });
      },
    );

    const { result, rerender } = renderHook(
      ({ annotations }: { annotations: AnnotationRecord[] }) =>
        useCombinedEliminationMask({
          annotations,
          gameArea,
        }),
      { initialProps: { annotations: [annotation("ann-1")] } },
    );

    await act(async () => {
      rerender({ annotations: [annotation("ann-2")] });
    });

    await act(async () => {
      latestByKey.get("ann-2")?.resolve({
        type: "Feature",
        properties: { source: "second" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [2, 0],
              [2, 2],
              [0, 0],
            ],
          ],
        },
      });
    });

    await waitFor(() => {
      expect(result.current?.properties?.source).toBe("second");
    });

    await act(async () => {
      latestByKey.get("ann-1")?.resolve({
        type: "Feature",
        properties: { source: "first" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [3, 0],
              [3, 3],
              [0, 0],
            ],
          ],
        },
      });
    });

    expect(result.current?.properties?.source).toBe("second");
  });
});
