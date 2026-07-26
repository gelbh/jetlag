import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnnotationRecord, GameArea } from "../../domain/map/annotations";
import { useCombinedEliminationMask } from "./useCombinedEliminationMask";

const requestCombinedEliminationMask = vi.hoisted(() => vi.fn());

vi.mock("../../domain/geometry/eliminationMaskWorkerClient", () => ({
  requestCombinedEliminationMask,
}));

vi.mock("../../domain/geometry/combinedEliminationMask", () => ({
  buildCombinedEliminationMask: vi.fn(() => ({
    type: "Feature",
    properties: { source: "bootstrap" },
    geometry: {
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
  })),
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
