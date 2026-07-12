import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import type { SessionRecord } from "../../domain/map/annotations";
import { useFirebaseAuthReady } from "./useFirebaseAuthReady";

const { ensureAnonymousUser, isFirebaseConfigured } = vi.hoisted(() => ({
  ensureAnonymousUser: vi.fn(async () => undefined),
  isFirebaseConfigured: vi.fn(() => true),
}));

vi.mock("../../services/core/firebase", () => ({
  ensureAnonymousUser,
  isFirebaseConfigured,
}));

const remoteSession: SessionRecord = {
  id: "remote-1",
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
};

describe("useFirebaseAuthReady", () => {
  it("is immediately ready for local sessions", () => {
    const localSession = { ...remoteSession, id: LOCAL_SESSION_ID };
    const { result } = renderHook(() => useFirebaseAuthReady(localSession));

    expect(result.current).toBe(true);
    expect(ensureAnonymousUser).not.toHaveBeenCalled();
  });

  it("waits for anonymous auth on remote sessions", async () => {
    const { result } = renderHook(() => useFirebaseAuthReady(remoteSession));

    expect(result.current).toBe(false);
    await waitFor(() => {
      expect(result.current).toBe(true);
    });
    expect(ensureAnonymousUser).toHaveBeenCalled();
  });
});
