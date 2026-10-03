import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSessionStore } from "@/state/sessionStore";
import { createTestRemoteSession } from "@/test/fixtures/sessions";
import { resetAllStores } from "@/test/helpers/storeReset";
import { ensureRemoteSessionMembership, ensureRemoteSessionWriteAccess } from "./membership";

const getRemoteSessionByIdFromServer = vi.hoisted(() => vi.fn());

vi.mock("@/services/core/firebase/firebase", () => ({
  getFirestoreDb: () => ({}),
}));

vi.mock("./join", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./join")>()),
  getRemoteSessionByIdFromServer,
}));

describe("ensureRemoteSessionWriteAccess offline shortcut", () => {
  let onLine = true;

  beforeEach(() => {
    resetAllStores();
    // resetAllStores keeps reachability; clear it so cases stay independent.
    useSessionStore.getState().setNetworkReachable(null);
    onLine = true;
    vi.spyOn(navigator, "onLine", "get").mockImplementation(() => onLine);
    getRemoteSessionByIdFromServer.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("trusts the caller's cached member session when unreachable", async () => {
    const session = createTestRemoteSession({ memberUids: ["user-host"] });
    useSessionStore.getState().setNetworkReachable(false);

    const result = await ensureRemoteSessionWriteAccess(session, "user-host", "seeker");

    expect(result).toBe(session);
    expect(getRemoteSessionByIdFromServer).not.toHaveBeenCalled();
  });

  it("trusts the cached member session when the browser is offline", async () => {
    const session = createTestRemoteSession({ memberUids: ["user-host"] });
    onLine = false;

    await ensureRemoteSessionWriteAccess(session, "user-host", "seeker");

    expect(getRemoteSessionByIdFromServer).not.toHaveBeenCalled();
  });

  it("still reads the server when online", async () => {
    const session = createTestRemoteSession({ memberUids: ["user-host"] });
    getRemoteSessionByIdFromServer.mockResolvedValue(session);

    await ensureRemoteSessionWriteAccess(session, "user-host", "seeker");

    expect(getRemoteSessionByIdFromServer).toHaveBeenCalledTimes(1);
  });

  it("does not trust the cache when offline and the uid is not a cached member", async () => {
    const session = createTestRemoteSession({ memberUids: ["someone-else"] });
    useSessionStore.getState().setNetworkReachable(false);
    getRemoteSessionByIdFromServer.mockRejectedValue(new Error("unavailable"));

    await expect(ensureRemoteSessionWriteAccess(session, "user-host", "seeker")).rejects.toThrow(
      "unavailable",
    );
    expect(getRemoteSessionByIdFromServer).toHaveBeenCalledTimes(1);
  });

  it("does not trust a cached session that has ended", async () => {
    const session = createTestRemoteSession({
      memberUids: ["user-host"],
      endedAt: new Date().toISOString(),
    });
    useSessionStore.getState().setNetworkReachable(false);
    getRemoteSessionByIdFromServer.mockRejectedValue(new Error("unavailable"));

    await expect(ensureRemoteSessionWriteAccess(session, "user-host", "seeker")).rejects.toThrow(
      "unavailable",
    );
  });

  it("never trusts the cache for a membership heal, even offline", async () => {
    const session = createTestRemoteSession({ memberUids: ["user-host"] });
    useSessionStore.getState().setNetworkReachable(false);
    getRemoteSessionByIdFromServer.mockResolvedValue(session);

    await ensureRemoteSessionMembership(session, "user-host", "seeker");

    expect(getRemoteSessionByIdFromServer).toHaveBeenCalledTimes(1);
  });
});
