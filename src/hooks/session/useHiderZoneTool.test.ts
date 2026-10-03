import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HidingZoneRecord } from "../../domain/session/hiding/hidingZone";
import { createTestGameArea } from "../../test/fixtures/sessions";
import { useHiderZoneTool } from "./useHiderZoneTool";

const writeHidingZone = vi.hoisted(() => vi.fn());
const enqueueMoveTimerIntent = vi.hoisted(() => vi.fn());
const isEffectivelyOfflineNow = vi.hoisted(() => vi.fn(() => false));
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
  fetchTransitStationsForHidingZoneViewport: vi.fn(async () => []),
}));

vi.mock("@/services/session/sessionIntents", () => ({
  enqueueMoveTimerIntent,
}));

vi.mock("@/services/firestore/commitWrite", () => ({
  commitWrite,
}));

vi.mock("../sync/isEffectivelyOfflineNow", () => ({
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
    expect(result.current.moveMode).toBe(true);
  });

  it("keeps the wizard open when a queued write is rejected later", async () => {
    writeHidingZone.mockRejectedValueOnce(new Error("write failed"));
    const { props, result } = renderZoneTool();

    await act(async () => {
      await result.current.startMove();
    });

    expect(props.resumeTimer).not.toHaveBeenCalled();
    expect(result.current.moveMode).toBe(true);
    expect(result.current.wizardOpen).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("tracks the Move card discard as an economy write", async () => {
    const consumeMoveCard = vi.fn(async () => undefined);
    const { result } = renderZoneTool({ consumeMoveCard, hasMoveCard: () => true });

    await act(async () => {
      await result.current.startMove();
    });

    expect(consumeMoveCard).toHaveBeenCalledTimes(1);
    expect(labels()).toContain("economy.update");
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
});
