import { beforeEach, describe, expect, it, vi } from "vitest";

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
const getClientEnv = vi.fn(() => ({
  VITE_GEOMETRY_MASK_KERNEL: undefined as string | undefined,
}));

vi.mock("comlink", () => ({
  wrap: vi.fn(() => ({
    buildMaskFromUnionInput,
    buildEndGameMaskFromDisks,
  })),
}));

vi.mock("../../config/env", () => ({
  getClientEnv: () => getClientEnv(),
}));

import * as workerClient from "./eliminationMaskWorkerClient";

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
    getClientEnv.mockReset();
    getClientEnv.mockReturnValue({
      VITE_GEOMETRY_MASK_KERNEL: undefined,
    });
    localStorage.removeItem("jl.geometry.maskKernel");

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
    getClientEnv.mockReturnValue({
      VITE_GEOMETRY_MASK_KERNEL: undefined,
    });
  });

  it("requests combined elimination mask from the worker", async () => {
    const result = await workerClient.requestCombinedEliminationMask(
      [],
      gameArea,
      [],
      [],
    );

    expect(result?.geometry.type).toBe("Polygon");
    expect(buildMaskFromUnionInput).toHaveBeenCalledWith(
      expect.objectContaining({
        polygons: expect.any(Array),
        disks: expect.any(Array),
      }),
      gameArea,
      "ts",
    );
    expect(buildEndGameMaskFromDisks).not.toHaveBeenCalled();
  });

  it("passes env mask kernel mode to the worker", async () => {
    getClientEnv.mockReturnValue({
      VITE_GEOMETRY_MASK_KERNEL: "wasm",
    });

    await workerClient.requestCombinedEliminationMask([], gameArea, [], []);

    expect(buildMaskFromUnionInput).toHaveBeenCalledWith(
      expect.any(Object),
      gameArea,
      "wasm",
    );
  });

  it("passes localStorage mask kernel mode over env to the worker", async () => {
    getClientEnv.mockReturnValue({
      VITE_GEOMETRY_MASK_KERNEL: "ts",
    });
    localStorage.setItem("jl.geometry.maskKernel", "dual");

    await workerClient.requestCombinedEliminationMask([], gameArea, [], []);

    expect(buildMaskFromUnionInput).toHaveBeenCalledWith(
      expect.any(Object),
      gameArea,
      "dual",
    );
  });

  it("passes resolved mode to end-game worker calls", async () => {
    getClientEnv.mockReturnValue({
      VITE_GEOMETRY_MASK_KERNEL: "wasm",
    });
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

    await workerClient.requestCombinedEliminationMask(
      [],
      gameArea,
      [],
      endGameHidingZones,
    );

    expect(buildEndGameMaskFromDisks).toHaveBeenCalledWith(
      gameArea,
      [{ center: [51.5, -0.1], radiusMeters: 500 }],
      "wasm",
    );
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
    expect(buildEndGameMaskFromDisks).toHaveBeenCalledWith(
      gameArea,
      [{ center: [51.5, -0.1], radiusMeters: 500 }],
      "ts",
    );
    expect(buildMaskFromUnionInput).not.toHaveBeenCalled();
  });

  it("disposes the worker after request failures", async () => {
    buildMaskFromUnionInput.mockRejectedValueOnce(new Error("worker boom"));

    await expect(
      workerClient.requestCombinedEliminationMask([], gameArea, [], []),
    ).rejects.toThrow("worker boom");

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
});
