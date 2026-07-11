import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePermanentAuthUser } from "./usePermanentAuthUser";

const { getFirebaseAuth, isFirebaseConfigured, waitForAuthStateReady } =
  vi.hoisted(() => {
    const onAuthStateChanged = vi.fn(
      (callback: (user: { uid: string; isAnonymous: boolean } | null) => void) => {
        callback({ uid: "google-1", isAnonymous: false });
        return () => {};
      },
    );

    return {
      waitForAuthStateReady: vi.fn(async () => undefined),
      isFirebaseConfigured: vi.fn(() => true),
      getFirebaseAuth: vi.fn(() => ({
        currentUser: { uid: "google-1", isAnonymous: false },
        onAuthStateChanged,
      })),
    };
  });

vi.mock("../../services/core/accountAuth", () => ({
  isPermanentUser: (user: { isAnonymous?: boolean } | null) =>
    user != null && user.isAnonymous !== true,
}));

vi.mock("../../services/core/firebase", () => ({
  getFirebaseAuth,
  isFirebaseConfigured,
  waitForAuthStateReady,
}));

describe("usePermanentAuthUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("waits for auth state before treating the user as signed out", async () => {
    const { result } = renderHook(() => usePermanentAuthUser());

    expect(result.current.authReady).toBe(false);

    await waitFor(() => {
      expect(result.current.authReady).toBe(true);
    });

    expect(waitForAuthStateReady).toHaveBeenCalled();
    expect(result.current.isPermanent).toBe(true);
    expect(result.current.user).toMatchObject({ uid: "google-1" });
  });
});
