import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnnotationRecord } from "../../map/annotations";

const sampleFeature = {
  type: "Feature" as const,
  properties: {},
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

const buildMaskFromUnionInput = vi.fn(async () => sampleFeature);
const buildEndGameMaskFromDisks = vi.fn(async () => sampleFeature);
const computeEliminationUnionInput = vi.fn(
  async (
    annotations: readonly AnnotationRecord[],
    _gameArea: unknown,
    draftFeatures: readonly unknown[] = [],
  ) => ({
    polygons: [
      ...draftFeatures,
      ...annotations.map((annotation) => annotation.geometry),
    ],
    disks: [],
  }),
);

vi.mock("comlink", () => ({
  wrap: vi.fn(() => ({
    buildMaskFromUnionInput,
    buildEndGameMaskFromDisks,
  })),
}));

vi.mock("../adapter/eliminationMask", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../adapter/eliminationMask")>();
  return {
    ...actual,
    computeEliminationUnionInput: (
      ...args: Parameters<typeof actual.computeEliminationUnionInput>
    ) => computeEliminationUnionInput(...args),
  };
});

import * as workerClient from "./eliminationMaskWorkerClient";

function matchingAnnotation(id: string, west: number): AnnotationRecord {
  return {
    id,
    sessionId: "session",
    status: "active",
    type: "matching",
    geometry: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [west, 0],
            [west + 0.1, 0],
            [west + 0.1, 0.1],
            [west, 0.1],
            [west, 0],
          ],
        ],
      },
    },
    metadata: {
      createdAt: "2026-01-01T00:00:00.000Z",
      color: "#ef4444",
      matchingCategory: "commercial_airport",
      matchingAnswer: "no",
      matchingAnchor: { lat: 0.05, lng: west + 0.05 },
    },
  };
}

describe("eliminationMaskWorkerClient", () => {
  let terminateSpy: ReturnType<typeof vi.fn>;
  let onErrorHandler: (() => void) | null = null;
  let onMessageErrorHandler: (() => void) | null = null;

  const gameArea = {
    type: "Polygon" as const,
    coordinates: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 0],
      ],
    ],
  };

  beforeEach(() => {
    terminateSpy = vi.fn();
    onErrorHandler = null;
    onMessageErrorHandler = null;
    buildMaskFromUnionInput.mockClear();
    buildEndGameMaskFromDisks.mockClear();
    computeEliminationUnionInput.mockClear();

    class MockWorker {
      terminate = terminateSpy;
      onerror: (() => void) | null = null;
      onmessageerror: (() => void) | null = null;

      constructor() {
        queueMicrotask(() => {
          onErrorHandler = this.onerror;
          onMessageErrorHandler = this.onmessageerror;
        });
      }
    }

    vi.stubGlobal("Worker", MockWorker);
    workerClient.resetEliminationMaskWorkerForTests();
    vi.clearAllMocks();
  });

  it("requests combined elimination mask from the worker", async () => {
    const result = await workerClient.requestCombinedEliminationMask([], gameArea, [], []);

    expect(result?.geometry.type).toBe("Polygon");
    expect(buildMaskFromUnionInput).toHaveBeenCalledWith(
      expect.objectContaining({
        polygons: expect.any(Array),
        disks: expect.any(Array),
      }),
      gameArea,
    );
    expect(buildEndGameMaskFromDisks).not.toHaveBeenCalled();
  });

  it("requests end-game mask from disks when hiding zones are present", async () => {
    const endGameHidingZones = [
      {
        hiderUid: "hider",
        sessionId: "session",
        stationId: "station",
        stationName: "Station",
        center: { lat: 51.5, lng: -0.1 },
        radiusMeters: 500,
        geometryJson: "{}",
        status: "confirmed" as const,
        confirmedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    const result = await workerClient.requestCombinedEliminationMask(
      [],
      gameArea,
      [],
      endGameHidingZones,
    );

    expect(result?.geometry.type).toBe("Polygon");
    expect(buildEndGameMaskFromDisks).toHaveBeenCalledWith(gameArea, [
      { center: [51.5, -0.1], radiusMeters: 500 },
    ]);
    expect(buildMaskFromUnionInput).not.toHaveBeenCalled();
  });

  it("disposes the worker after request failures", async () => {
    buildMaskFromUnionInput.mockRejectedValueOnce(new Error("worker boom"));

    await expect(workerClient.requestCombinedEliminationMask([], gameArea, [], [])).rejects.toThrow(
      "worker boom",
    );

    expect(terminateSpy).toHaveBeenCalledTimes(1);

    await workerClient.requestCombinedEliminationMask([], gameArea, [], []);

    expect(buildMaskFromUnionInput).toHaveBeenCalledTimes(2);
  });

  it("disposes the worker when onerror fires", async () => {
    await workerClient.requestCombinedEliminationMask([], gameArea, [], []);

    onErrorHandler?.();

    expect(terminateSpy).toHaveBeenCalledTimes(1);
  });

  it("disposes the worker when onmessageerror fires", async () => {
    await workerClient.requestCombinedEliminationMask([], gameArea, [], []);

    onMessageErrorHandler?.();

    expect(terminateSpy).toHaveBeenCalledTimes(1);
  });

  it("add-only path spies computeEliminationUnionInput for new ids only (not full N+1 rebuild)", async () => {
    const a = matchingAnnotation("a", 0);
    const b = matchingAnnotation("b", 0.2);

    await workerClient.requestCombinedEliminationMask([a], gameArea, [], []);
    expect(computeEliminationUnionInput).toHaveBeenCalledTimes(1);
    expect(computeEliminationUnionInput.mock.calls[0]?.[0]).toHaveLength(1);

    computeEliminationUnionInput.mockClear();
    buildMaskFromUnionInput.mockClear();

    await workerClient.requestCombinedEliminationMask([a, b], gameArea, [], []);

    expect(computeEliminationUnionInput).toHaveBeenCalledTimes(1);
    expect(computeEliminationUnionInput.mock.calls[0]?.[0]).toEqual([b]);
    expect(buildMaskFromUnionInput).toHaveBeenCalledTimes(1);
    const deltaInput = buildMaskFromUnionInput.mock.calls[0]?.[0] as {
      polygons: unknown[];
      disks: unknown[];
    };
    expect(deltaInput.polygons[0]).toBe(sampleFeature);
    expect(deltaInput.polygons).toHaveLength(2);
  });

  it("returns cached mask without recomputing when annotation content key is unchanged", async () => {
    const a = matchingAnnotation("a", 0);
    await workerClient.requestCombinedEliminationMask([a], gameArea, [], []);
    computeEliminationUnionInput.mockClear();
    buildMaskFromUnionInput.mockClear();

    const again = await workerClient.requestCombinedEliminationMask([a], gameArea, [], []);

    expect(again).toBe(sampleFeature);
    expect(computeEliminationUnionInput).not.toHaveBeenCalled();
    expect(buildMaskFromUnionInput).not.toHaveBeenCalled();
  });

  it("full-rebuilds when an annotation is removed (not add-only)", async () => {
    const a = matchingAnnotation("a", 0);
    const b = matchingAnnotation("b", 0.2);
    await workerClient.requestCombinedEliminationMask([a, b], gameArea, [], []);
    computeEliminationUnionInput.mockClear();
    buildMaskFromUnionInput.mockClear();

    await workerClient.requestCombinedEliminationMask([a], gameArea, [], []);

    expect(computeEliminationUnionInput).toHaveBeenCalledTimes(1);
    expect(computeEliminationUnionInput.mock.calls[0]?.[0]).toEqual([a]);
    expect(buildMaskFromUnionInput).toHaveBeenCalledTimes(1);
    const fullInput = buildMaskFromUnionInput.mock.calls[0]?.[0] as { polygons: unknown[] };
    expect(fullInput.polygons).toHaveLength(1);
    expect(fullInput.polygons[0]).not.toBe(sampleFeature);
  });

  it("full-rebuilds when gameArea changes even if annotations are add-only", async () => {
    const a = matchingAnnotation("a", 0);
    const b = matchingAnnotation("b", 0.2);
    await workerClient.requestCombinedEliminationMask([a], gameArea, [], []);
    computeEliminationUnionInput.mockClear();
    buildMaskFromUnionInput.mockClear();

    const expandedGameArea = {
      type: "Polygon" as const,
      coordinates: [
        [
          [0, 0],
          [2, 0],
          [2, 2],
          [0, 0],
        ],
      ],
    };

    await workerClient.requestCombinedEliminationMask([a, b], expandedGameArea, [], []);

    expect(computeEliminationUnionInput).toHaveBeenCalledTimes(1);
    expect(computeEliminationUnionInput.mock.calls[0]?.[0]).toEqual([a, b]);
    const fullInput = buildMaskFromUnionInput.mock.calls[0]?.[0] as { polygons: unknown[] };
    expect(fullInput.polygons[0]).not.toBe(sampleFeature);
  });

  it("falls through to full rebuild when incremental union returns null", async () => {
    const a = matchingAnnotation("a", 0);
    const b = matchingAnnotation("b", 0.2);
    const rebuiltFeature = {
      ...sampleFeature,
      properties: { rebuilt: true },
    };

    await workerClient.requestCombinedEliminationMask([a], gameArea, [], []);
    computeEliminationUnionInput.mockClear();
    buildMaskFromUnionInput.mockClear();

    buildMaskFromUnionInput
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(rebuiltFeature);

    const result = await workerClient.requestCombinedEliminationMask([a, b], gameArea, [], []);

    expect(result).toBe(rebuiltFeature);
    expect(computeEliminationUnionInput).toHaveBeenCalledTimes(2);
    expect(computeEliminationUnionInput.mock.calls[0]?.[0]).toEqual([b]);
    expect(computeEliminationUnionInput.mock.calls[1]?.[0]).toEqual([a, b]);
    expect(buildMaskFromUnionInput).toHaveBeenCalledTimes(2);
    const fullInput = buildMaskFromUnionInput.mock.calls[1]?.[0] as { polygons: unknown[] };
    expect(fullInput.polygons[0]).not.toBe(sampleFeature);

    computeEliminationUnionInput.mockClear();
    buildMaskFromUnionInput.mockClear();
    const cached = await workerClient.requestCombinedEliminationMask([a, b], gameArea, [], []);
    expect(cached).toBe(rebuiltFeature);
    expect(computeEliminationUnionInput).not.toHaveBeenCalled();
    expect(buildMaskFromUnionInput).not.toHaveBeenCalled();
  });
});
