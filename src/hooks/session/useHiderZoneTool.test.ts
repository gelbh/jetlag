import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HidingZoneRecord, TransitStation } from "../../domain/session/hiding/hidingZone";
import { createTestGameArea } from "../../test/fixtures/sessions";
import { useHiderZoneTool } from "./useHiderZoneTool";

const writeHidingZone = vi.hoisted(() => vi.fn());
const enqueueMoveTimerIntent = vi.hoisted(() => vi.fn());
const isEffectivelyOfflineNow = vi.hoisted(() => vi.fn(() => false));
const fetchTransitStationsForHidingZoneViewport = vi.hoisted(() =>
  vi.fn(async (): Promise<TransitStation[]> => []),
);
const commitWrite = vi.hoisted(() =>
  vi.fn((_label: string, run: () => Promise<void>) => {
    const acknowledged = run();
    acknowledged.catch(() => {});
    return { acknowledged };
  }),
);

vi.mock("../../services/firestore/firestoreSessionExtras", () => ({
  writeHidingZone,
}));

vi.mock("../../services/geo/matching", () => ({
  fetchTransitStationsForHidingZoneViewport,
}));

vi.mock("@/services/session/sessionIntents", () => ({
  enqueueMoveTimerIntent,
}));

vi.mock("@/services/firestore/commitWrite", () => ({
  commitWrite,
}));

vi.mock("@/hooks/sync/isEffectivelyOfflineNow", () => ({
  isEffectivelyOfflineNow,
}));

const existingZone: HidingZoneRecord = {
  hiderUid: "hider-1",
  sessionId: "session-1",
  stationId: "station-1",
  stationName: "Central",
  center: { lat: 53.35, lng: -6.26 },
  radiusMeters: 200,
  geometryJson: "{}",
  status: "confirmed",
  confirmedAt: "2026-07-26T10:00:00.000Z",
};

type Overrides = Partial<Parameters<typeof useHiderZoneTool>[0]>;

function renderZoneTool(overrides: Overrides = {}) {
  const props = {
    sessionId: "session-1",
    hiderUid: "hider-1",
    gameArea: createTestGameArea(),
    radiusMeters: 200,
    existingZone,
    postSystemMessage: vi.fn(async () => undefined),
    pauseTimer: vi.fn(),
    resumeTimer: vi.fn(),
    canControlTimer: true,
    ...overrides,
  };
  return { props, ...renderHook(() => useHiderZoneTool(props)) };
}

function labels() {
  return commitWrite.mock.calls.map(([label]) => label);
}

describe("useHiderZoneTool", () => {
  beforeEach(() => {
    writeHidingZone.mockReset();
    writeHidingZone.mockResolvedValue(undefined);
    enqueueMoveTimerIntent.mockReset();
    enqueueMoveTimerIntent.mockReturnValue({ intentId: "i1", acknowledged: Promise.resolve() });
    commitWrite.mockClear();
    isEffectivelyOfflineNow.mockReset();
    isEffectivelyOfflineNow.mockReturnValue(false);
    fetchTransitStationsForHidingZoneViewport.mockReset();
    fetchTransitStationsForHidingZoneViewport.mockResolvedValue([]);
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("host Play Move pauses locally and fires the move writes without awaiting acks", async () => {
    writeHidingZone.mockReturnValue(new Promise(() => {}));
    const { props, result } = renderZoneTool({
      postSystemMessage: vi.fn(() => new Promise<void>(() => {})),
    });

    await act(async () => {
      await result.current.startMove();
    });

    expect(props.pauseTimer).toHaveBeenCalledTimes(1);
    expect(enqueueMoveTimerIntent).not.toHaveBeenCalled();
    expect(labels()).toEqual(["system.message", "zone.write"]);
    expect(props.postSystemMessage).toHaveBeenCalledWith(expect.stringMatching(/Move card played/));
    expect(writeHidingZone).toHaveBeenCalledWith(
      "session-1",
      expect.objectContaining({ moveInProgress: true }),
    );
    expect(result.current.moveMode).toBe(true);
    expect(result.current.wizardOpen).toBe(true);
  });

  it("non-host Play Move queues a pause intent instead of the local timer write", async () => {
    const { props, result } = renderZoneTool({ canControlTimer: false });

    await act(async () => {
      await result.current.startMove();
    });

    expect(props.pauseTimer).not.toHaveBeenCalled();
    expect(enqueueMoveTimerIntent).toHaveBeenCalledWith("session-1", "hider-1", "pause");
    expect(labels()).toEqual(["system.message", "zone.write"]);
    expect(result.current.moveMode).toBe(true);
  });

  it("rolls back the pause when the queued Move zone write is rejected", async () => {
    writeHidingZone.mockRejectedValueOnce(new Error("write failed"));
    const consumeMoveCard = vi.fn(async () => undefined);
    const { props, result } = renderZoneTool({ consumeMoveCard, hasMoveCard: () => true });

    await act(async () => {
      await result.current.startMove();
    });

    expect(props.pauseTimer).toHaveBeenCalledTimes(1);
    expect(props.resumeTimer).toHaveBeenCalledTimes(1);
    expect(consumeMoveCard).not.toHaveBeenCalled();
    expect(result.current.moveMode).toBe(false);
    expect(result.current.wizardOpen).toBe(false);
    expect(result.current.error).toMatch(/write failed/i);
  });

  it("non-host rejection queues a compensating resume intent", async () => {
    writeHidingZone.mockRejectedValueOnce(new Error("write failed"));
    const { result } = renderZoneTool({ canControlTimer: false });

    await act(async () => {
      await result.current.startMove();
    });

    expect(enqueueMoveTimerIntent.mock.calls.map(([, , action]) => action)).toEqual([
      "pause",
      "resume",
    ]);
  });

  it("discards the Move card only after the zone write is acknowledged", async () => {
    let ackZone: () => void = () => {};
    writeHidingZone.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        ackZone = resolve;
      }),
    );
    const consumeMoveCard = vi.fn(async () => undefined);
    const { result } = renderZoneTool({ consumeMoveCard, hasMoveCard: () => true });

    await act(async () => {
      await result.current.startMove();
    });
    expect(consumeMoveCard).not.toHaveBeenCalled();

    await act(async () => {
      ackZone();
    });

    expect(consumeMoveCard).toHaveBeenCalledTimes(1);
    expect(labels()).toContain("economy.update");
  });

  it("ignores a late Move rejection after the new zone was confirmed", async () => {
    let rejectMove: (error: Error) => void = () => {};
    writeHidingZone.mockReturnValueOnce(
      new Promise<void>((_resolve, reject) => {
        rejectMove = reject;
      }),
    );
    const { props, result } = renderZoneTool();

    await act(async () => {
      await result.current.startMove();
    });
    act(() => {
      result.current.setSelectedStation({ id: "station-2", name: "Other", lat: 53.4, lng: -6.3 });
    });
    await act(async () => {
      await result.current.confirmZone();
    });
    await act(async () => {
      rejectMove(new Error("late"));
    });

    expect(props.resumeTimer).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  it("skips the server membership check while offline", async () => {
    isEffectivelyOfflineNow.mockReturnValue(true);
    const ensureWriteAccess = vi.fn(async () => undefined);
    const { result } = renderZoneTool({ ensureWriteAccess, canControlTimer: false });

    await act(async () => {
      await result.current.startMove();
    });

    expect(ensureWriteAccess).not.toHaveBeenCalled();
    expect(enqueueMoveTimerIntent).toHaveBeenCalledWith("session-1", "hider-1", "pause");
  });

  it("aborts Play Move before pausing when the online access check fails", async () => {
    const ensureWriteAccess = vi.fn(async () => {
      throw new Error("No access to that session.");
    });
    const { props, result } = renderZoneTool({ ensureWriteAccess });

    await act(async () => {
      await result.current.startMove();
    });

    expect(ensureWriteAccess).toHaveBeenCalledTimes(1);
    expect(props.pauseTimer).not.toHaveBeenCalled();
    expect(commitWrite).not.toHaveBeenCalled();
    expect(result.current.moveMode).toBe(false);
    expect(result.current.wizardOpen).toBe(false);
    expect(result.current.error).toMatch(/No access/);
  });

  it("non-host confirming a move queues a resume intent and closes without awaiting the zone ack", async () => {
    const { props, result } = renderZoneTool({ canControlTimer: false });

    await act(async () => {
      await result.current.startMove();
    });

    writeHidingZone.mockReturnValue(new Promise(() => {}));
    act(() => {
      result.current.setSelectedStation({
        id: "station-2",
        name: "Other",
        lat: 53.4,
        lng: -6.3,
      });
    });

    await act(async () => {
      await result.current.confirmZone();
    });

    expect(enqueueMoveTimerIntent).toHaveBeenLastCalledWith("session-1", "hider-1", "resume");
    expect(props.resumeTimer).not.toHaveBeenCalled();
    expect(writeHidingZone).toHaveBeenLastCalledWith(
      "session-1",
      expect.objectContaining({ stationId: "station-2", moveInProgress: false }),
    );
    expect(result.current.saving).toBe(false);
    expect(result.current.wizardOpen).toBe(false);
    expect(result.current.moveMode).toBe(false);
  });

  it("initial zone confirm offline skips the access check and queues no timer intent", async () => {
    isEffectivelyOfflineNow.mockReturnValue(true);
    const ensureWriteAccess = vi.fn(async () => undefined);
    const { result } = renderZoneTool({
      existingZone: null,
      ensureWriteAccess,
      canControlTimer: false,
    });

    act(() => {
      result.current.openWizard();
      result.current.setSelectedStation({ id: "station-2", name: "Other", lat: 53.4, lng: -6.3 });
    });
    await act(async () => {
      await result.current.confirmZone();
    });

    expect(ensureWriteAccess).not.toHaveBeenCalled();
    expect(labels()).toEqual(["zone.write"]);
    expect(enqueueMoveTimerIntent).not.toHaveBeenCalled();
    expect(result.current.wizardOpen).toBe(false);
  });

  it("zone confirm stops before writing when the online access check fails", async () => {
    const ensureWriteAccess = vi.fn(async () => {
      throw new Error("No access to that session.");
    });
    const { result } = renderZoneTool({ existingZone: null, ensureWriteAccess });

    act(() => {
      result.current.openWizard();
      result.current.setSelectedStation({ id: "station-2", name: "Other", lat: 53.4, lng: -6.3 });
    });
    await act(async () => {
      await result.current.confirmZone();
    });

    expect(commitWrite).not.toHaveBeenCalled();
    expect(enqueueMoveTimerIntent).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(/No access/);
    expect(result.current.saving).toBe(false);
  });

  it("tap-map placement snaps to the nearest station within 200 m", async () => {
    fetchTransitStationsForHidingZoneViewport.mockResolvedValue([
      { id: "far", name: "Far", lat: 53.36, lng: -6.26 },
      { id: "near", name: "Near", lat: 53.3503, lng: -6.2603 },
    ]);
    const { result } = renderZoneTool({ existingZone: null, mapPickEnabled: true });

    act(() => {
      result.current.openWizard();
      result.current.choosePlacementMethod(true);
    });
    await act(async () => {
      result.current.handleMapClick([53.35, -6.26]);
    });

    expect(result.current.snapping).toBe(false);
    expect(result.current.manualCenter).toEqual([53.3503, -6.2603]);
    await act(async () => {
      await result.current.confirmZone();
    });

    expect(writeHidingZone).toHaveBeenCalledWith(
      "session-1",
      expect.objectContaining({
        stationId: "near",
        stationName: "Near",
        center: { lat: 53.3503, lng: -6.2603 },
      }),
    );
  });

  it("tap-map placement keeps the tapped point when no station is nearby", async () => {
    const { result } = renderZoneTool({ existingZone: null, mapPickEnabled: true });

    act(() => {
      result.current.openWizard();
      result.current.choosePlacementMethod(true);
    });
    await act(async () => {
      result.current.handleMapClick([53.35, -6.26]);
    });
    await act(async () => {
      await result.current.confirmZone();
    });

    expect(writeHidingZone).toHaveBeenCalledWith(
      "session-1",
      expect.objectContaining({ stationId: "manual", center: { lat: 53.35, lng: -6.26 } }),
    );
  });

  describe("tap-map snap lookup", () => {
    const tap: [number, number] = [53.35, -6.26];
    const nearTap = { id: "near", name: "Near", lat: 53.3503, lng: -6.2603 };

    function deferred<T>() {
      let resolve!: (value: T) => void;
      let reject!: (reason: unknown) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    }

    function renderTapMap() {
      const rendered = renderZoneTool({ existingZone: null, mapPickEnabled: true });
      act(() => {
        rendered.result.current.openWizard();
        rendered.result.current.choosePlacementMethod(true);
      });
      return rendered;
    }

    it("reports snapping while the lookup runs and ignores Confirm until it settles", async () => {
      const lookup = deferred<TransitStation[]>();
      fetchTransitStationsForHidingZoneViewport.mockReturnValue(lookup.promise);
      const { result } = renderTapMap();

      act(() => {
        result.current.handleMapClick(tap);
      });
      expect(result.current.snapping).toBe(true);
      await act(async () => {
        await result.current.confirmZone();
      });
      expect(writeHidingZone).not.toHaveBeenCalled();

      await act(async () => {
        lookup.resolve([nearTap]);
      });
      expect(result.current.snapping).toBe(false);
      expect(result.current.selectedStation).toEqual(nearTap);
    });

    it("searches a box around the tap that covers the snap radius", async () => {
      const { result } = renderTapMap();

      await act(async () => {
        result.current.handleMapClick(tap);
      });

      const [bounds] = fetchTransitStationsForHidingZoneViewport.mock.calls[0] as unknown as [
        { south: number; north: number; west: number; east: number },
      ];
      expect(bounds.south).toBeLessThan(tap[0]);
      expect(bounds.north).toBeGreaterThan(tap[0]);
      // 200 m of latitude is about 0.0018 degrees.
      expect(bounds.north - tap[0]).toBeGreaterThan(0.0018);
    });

    it("lets a newer tap win over a slower, older lookup", async () => {
      const first = deferred<TransitStation[]>();
      const second = deferred<TransitStation[]>();
      fetchTransitStationsForHidingZoneViewport
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise);
      const { result } = renderTapMap();
      const secondTap: [number, number] = [53.34, -6.27];
      const nearSecond = { id: "second", name: "Second", lat: 53.3402, lng: -6.2702 };

      act(() => {
        result.current.handleMapClick(tap);
      });
      act(() => {
        result.current.handleMapClick(secondTap);
      });
      await act(async () => {
        second.resolve([nearSecond]);
      });
      await act(async () => {
        first.resolve([nearTap]);
      });

      expect(result.current.selectedStation).toEqual(nearSecond);
      expect(result.current.manualCenter).toEqual([53.3402, -6.2702]);
    });

    it("keeps the tapped point when the lookup fails", async () => {
      fetchTransitStationsForHidingZoneViewport.mockRejectedValue(new Error("Overpass down"));
      const { result } = renderTapMap();

      await act(async () => {
        result.current.handleMapClick(tap);
      });

      expect(result.current.snapping).toBe(false);
      expect(result.current.selectedStation).toBeNull();
      expect(result.current.manualCenter).toEqual(tap);
    });

    it("gives up after the timeout so Confirm saves the tapped point", async () => {
      vi.useFakeTimers();
      try {
        fetchTransitStationsForHidingZoneViewport.mockReturnValue(new Promise(() => {}));
        const { result } = renderTapMap();

        act(() => {
          result.current.handleMapClick(tap);
        });
        expect(result.current.snapping).toBe(true);
        await act(async () => {
          await vi.advanceTimersByTimeAsync(4000);
        });

        expect(result.current.snapping).toBe(false);
        expect(result.current.manualCenter).toEqual(tap);
      } finally {
        vi.useRealTimers();
      }
    });

    it("skips the lookup while offline", async () => {
      isEffectivelyOfflineNow.mockReturnValue(true);
      const { result } = renderTapMap();

      await act(async () => {
        result.current.handleMapClick(tap);
      });

      expect(fetchTransitStationsForHidingZoneViewport).not.toHaveBeenCalled();
      expect(result.current.snapping).toBe(false);
      expect(result.current.manualCenter).toEqual(tap);
    });

    it("reuses stations from an earlier lookup for a nearby tap", async () => {
      fetchTransitStationsForHidingZoneViewport.mockResolvedValue([nearTap]);
      const { result } = renderTapMap();

      await act(async () => {
        result.current.handleMapClick(tap);
      });
      await act(async () => {
        result.current.handleMapClick([53.3501, -6.2601]);
      });

      expect(fetchTransitStationsForHidingZoneViewport).toHaveBeenCalledTimes(1);
      expect(result.current.selectedStation).toEqual(nearTap);
    });

    it("drops an in-flight snap when the placement method changes", async () => {
      const lookup = deferred<TransitStation[]>();
      fetchTransitStationsForHidingZoneViewport.mockReturnValue(lookup.promise);
      const { result } = renderTapMap();

      act(() => {
        result.current.handleMapClick(tap);
      });
      act(() => {
        result.current.choosePlacementMethod(true);
      });
      await act(async () => {
        lookup.resolve([nearTap]);
      });

      expect(result.current.snapping).toBe(false);
      expect(result.current.selectedStation).toBeNull();
      expect(result.current.manualCenter).toBeNull();
    });
  });
});
