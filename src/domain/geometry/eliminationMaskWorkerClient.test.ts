import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("comlink", () => ({
  wrap: vi.fn(() => ({
    buildCombinedEliminationMask: vi.fn(async () => ({
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
    })),
  })),
}));

import * as workerClient from "./eliminationMaskWorkerClient";

describe("eliminationMaskWorkerClient", () => {
  beforeEach(() => {
    class MockWorker {
      terminate = vi.fn();
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
});
