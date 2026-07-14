import { beforeEach, describe, expect, it, vi } from "vitest";

const buildCombinedEliminationMask = vi.fn(async () => ({
  type: "Feature",
  properties: {},
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
}));

vi.mock("comlink", () => ({
  wrap: vi.fn(() => ({
    buildCombinedEliminationMask,
  })),
}));

import * as workerClient from "./eliminationMaskWorkerClient";

describe("eliminationMaskWorkerClient", () => {
  let terminateSpy: ReturnType<typeof vi.fn>;
  let onErrorHandler: (() => void) | null = null;

  beforeEach(() => {
    terminateSpy = vi.fn();
    onErrorHandler = null;
    buildCombinedEliminationMask.mockClear();

    class MockWorker {
      terminate = terminateSpy;
      onerror: (() => void) | null = null;
      onmessageerror: (() => void) | null = null;

      constructor() {
        queueMicrotask(() => {
          onErrorHandler = this.onerror;
        });
      }
    }

    vi.stubGlobal("Worker", MockWorker);
    workerClient.resetEliminationMaskWorkerForTests();
    vi.clearAllMocks();
  });

  it("requests combined elimination mask from the worker", async () => {
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

    const result = await workerClient.requestCombinedEliminationMask(
      [],
      gameArea,
      [],
      [],
    );

    expect(result?.geometry.type).toBe("Polygon");
  });

  it("disposes the worker after request failures", async () => {
    buildCombinedEliminationMask.mockRejectedValueOnce(new Error("worker boom"));

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

    await expect(
      workerClient.requestCombinedEliminationMask([], gameArea, [], []),
    ).rejects.toThrow("worker boom");

    expect(terminateSpy).toHaveBeenCalledTimes(1);

    await workerClient.requestCombinedEliminationMask([], gameArea, [], []);

    expect(buildCombinedEliminationMask).toHaveBeenCalledTimes(2);
  });

  it("disposes the worker when onerror fires", async () => {
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

    await workerClient.requestCombinedEliminationMask([], gameArea, [], []);

    onErrorHandler?.();

    expect(terminateSpy).toHaveBeenCalledTimes(1);
  });
});
