import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { LOCAL_SESSION_ID } from "../domain/annotations";
import { useSessionStore } from "../state/sessionStore";
import { useSyncStatus } from "./useSyncStatus";

describe("useSyncStatus integration", () => {
  beforeEach(() => {
    useSessionStore.setState({
      session: null,
      pendingWrites: 0,
      syncInFlight: 0,
      lastSyncError: null,
      remoteUpdateNotice: null,
    });
  });

  it("reports offline when queued writes exist", () => {
    useSessionStore.setState({
      session: {
        id: "remote-session",
        code: "ABCD",
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
        memberUids: ["user-1"],
      },
      pendingWrites: 2,
    });

    const { result } = renderHook(() => useSyncStatus());

    expect(result.current.status).toBe("offline");
    expect(result.current.queuedWrites).toBe(2);
  });

  it("reports synced for local-only sessions without reachability probing", () => {
    useSessionStore.setState({
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
        memberUids: [],
      },
    });

    const { result } = renderHook(() => useSyncStatus());

    expect(result.current.status).toBe("synced");
  });
});
