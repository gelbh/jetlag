import { beforeEach, describe, expect, it, vi } from "vitest";
import { waitForFirebaseAuth } from "./firebaseAuthReady";

const {
  ensureAnonymousUser,
  getFirebaseAuth,
  isFirebaseConfigured,
  waitForAuthStateReady,
} = vi.hoisted(() => ({
  ensureAnonymousUser: vi.fn(),
  waitForAuthStateReady: vi.fn(async () => undefined),
  isFirebaseConfigured: vi.fn(() => true),
  getFirebaseAuth: vi.fn((): { currentUser: { uid: string } | null } => ({
    currentUser: null,
  })),
}));

vi.mock("./firebase", () => ({
  ensureAnonymousUser,
  getFirebaseAuth,
  isFirebaseConfigured,
  waitForAuthStateReady,
}));

describe("waitForFirebaseAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isFirebaseConfigured.mockReturnValue(true);
    waitForAuthStateReady.mockResolvedValue(undefined);
  });

  it("waits for auth state before creating an anonymous user", async () => {
    getFirebaseAuth
      .mockReturnValueOnce({ currentUser: null })
      .mockReturnValue({ currentUser: { uid: "anon-1" } });
    ensureAnonymousUser.mockResolvedValue({ uid: "anon-1" });

    await expect(waitForFirebaseAuth()).resolves.toBe(true);

    expect(waitForAuthStateReady).toHaveBeenCalled();
    expect(ensureAnonymousUser).toHaveBeenCalled();
  });

  it("returns true when a persisted user is already restored", async () => {
    getFirebaseAuth.mockReturnValue({ currentUser: { uid: "google-1" } });

    await expect(waitForFirebaseAuth()).resolves.toBe(true);

    expect(ensureAnonymousUser).not.toHaveBeenCalled();
  });
});
