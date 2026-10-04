import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameArea } from "@/domain/map/annotations";
import { useWriteLedgerStore } from "@/state/writeLedgerStore";
import { useTimeTrapTool } from "./useTimeTrapTool";

const writeTimeTrapMock = vi.hoisted(() => vi.fn());

vi.mock("../../services/firestore/firestoreSessionExtras", () => ({
  writeTimeTrap: writeTimeTrapMock,
}));

vi.mock("../../services/geo/matching", () => ({
  fetchTransitStationsForHidingZoneViewport: vi.fn(async () => []),
}));

const gameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
      [0, 0],
    ],
  ],
};

const station = { id: "s1", name: "Central", lat: 1, lng: 1 };

function renderTool(postSystemMessage = vi.fn(async () => undefined)) {
  const hook = renderHook(() =>
    useTimeTrapTool({
      sessionId: "session-1",
      hiderUid: "hider-1",
      gameArea,
      existingTrap: null,
      enabled: true,
      postSystemMessage,
    }),
  );
  act(() => hook.result.current.setSelectedStation(station));
  return { ...hook, postSystemMessage };
}

describe("useTimeTrapTool confirmTrap", () => {
  beforeEach(() => {
    writeTimeTrapMock.mockReset();
    useWriteLedgerStore.setState({ entries: {} });
  });

  it("places the trap without waiting for the server ack", () => {
    writeTimeTrapMock.mockImplementation(() => new Promise<void>(() => {}));
    const { result, postSystemMessage } = renderTool();

    let placed = false;
    act(() => {
      placed = result.current.confirmTrap();
    });

    expect(placed).toBe(true);
    expect(writeTimeTrapMock).toHaveBeenCalledWith(
      "session-1",
      expect.objectContaining({ stationId: "s1", hiderUid: "hider-1" }),
    );
    expect(Object.values(useWriteLedgerStore.getState().entries)).toEqual([
      expect.objectContaining({ label: "timetrap.place", status: "pending" }),
    ]);
    // Announcement waits for the ack so a rejected trap is never announced.
    expect(postSystemMessage).not.toHaveBeenCalled();
  });

  it("ignores a double tap while the first placement is in flight", () => {
    writeTimeTrapMock.mockImplementation(() => new Promise<void>(() => {}));
    const { result } = renderTool();

    let second = true;
    act(() => {
      result.current.confirmTrap();
      second = result.current.confirmTrap();
    });

    expect(second).toBe(false);
    expect(writeTimeTrapMock).toHaveBeenCalledTimes(1);
  });

  it("announces the trap once the write is acknowledged", async () => {
    writeTimeTrapMock.mockResolvedValue(undefined);
    const { result, postSystemMessage } = renderTool();

    await act(async () => {
      result.current.confirmTrap();
      await Promise.resolve();
    });

    expect(postSystemMessage).toHaveBeenCalledWith(expect.stringContaining("Central"));
  });

  it("does not announce a rejected trap", async () => {
    writeTimeTrapMock.mockRejectedValue(new Error("Missing or insufficient permissions."));
    const { result, postSystemMessage } = renderTool();

    await act(async () => {
      result.current.confirmTrap();
      await Promise.resolve();
    });

    expect(postSystemMessage).not.toHaveBeenCalled();
    expect(Object.values(useWriteLedgerStore.getState().entries)).toEqual([
      expect.objectContaining({ label: "timetrap.place", status: "failed" }),
    ]);
  });

  it("keeps the sheet open when the station is outside the play area", () => {
    const { result } = renderTool();
    act(() => result.current.setSelectedStation({ ...station, lat: 5, lng: 5 }));

    let placed = true;
    act(() => {
      placed = result.current.confirmTrap();
    });

    expect(placed).toBe(false);
    expect(result.current.error).toBe("That station is outside the play area.");
    expect(writeTimeTrapMock).not.toHaveBeenCalled();
  });
});
